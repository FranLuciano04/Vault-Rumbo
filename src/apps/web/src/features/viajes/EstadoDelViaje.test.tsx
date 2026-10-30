import { crearCliente } from "@rumbo/shared";
import {
  crearServidor,
  idViajeMock,
  manejadoresAlertas,
  manejadoresClientes,
  manejadoresEconomia,
  manejadoresHoteles,
  manejadoresM1,
  manejadoresViajes,
  usuariosPorRol,
  type RolMock,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { FichaViaje } from "./FichaViaje";

/**
 * T-105: las acciones de estado viven en la región «Acciones» de la ficha (pantalla 16, EST-Viaje T4,
 * T5 y T7). Supuestos de UI: botones disparadores «Pasar a en curso», «Pasar a finalizado» y
 * «Corregir estado» dentro de la región; cada uno abre un diálogo (role dialog) con el botón de
 * confirmar (mismo nombre que el disparador, o «Corregir estado») y «Todavía no» para cancelar.
 */
const servidor = crearServidor(
  ...manejadoresViajes,
  ...manejadoresEconomia,
  ...manejadoresHoteles,
  ...manejadoresClientes,
  ...manejadoresAlertas,
  ...manejadoresM1,
);
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  servidor.resetHandlers();
});
afterAll(() => {
  servidor.close();
});

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });

function renderFicha(estado: keyof typeof idViajeMock, rol: RolMock = "empleado") {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/viajes/${idViajeMock[estado]}`]}>
        <FichaViaje cliente={cliente} usuario={usuariosPorRol[rol]} viajeId={idViajeMock[estado]} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** La región «Acciones», una vez cargada la ficha. */
async function acciones() {
  await screen.findByRole("heading", { level: 1 });
  return screen.findByRole("region", { name: /acciones/i });
}

/** Cuenta los POST a `/api/viajes/:id/<accion>` y deja seguir al handler del mock. */
function contar(accion: string, llamadas: string[]) {
  return http.post(`*/api/viajes/:id/${accion}`, ({ params }) => {
    llamadas.push(String(params["id"]));
    return undefined;
  });
}

const problema = (status: number, detail: string) =>
  HttpResponse.json(
    { title: "Error", status, detail },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );

const AVANZAR = /pasar a en curso|pasar a finalizado/i;
const CORREGIR = /corregir estado/i;

describe("RF-039 avanzar estado", () => {
  it("RF-039 un viaje confirmado ofrece «Pasar a en curso» y no ofrece finalizar ni corregir", async () => {
    renderFicha("confirmado");
    const region = await acciones();

    expect(await within(region).findByRole("button", { name: /pasar a en curso/i })).toBeEnabled();
    expect(within(region).queryByRole("button", { name: /pasar a finalizado/i })).toBeNull();
    expect(within(region).queryByRole("button", { name: CORREGIR })).toBeNull();
  });

  it("RF-039 un viaje en curso ofrece «Pasar a finalizado» y no ofrece iniciar", async () => {
    renderFicha("en_curso");
    const region = await acciones();

    expect(
      await within(region).findByRole("button", { name: /pasar a finalizado/i }),
    ).toBeEnabled();
    expect(within(region).queryByRole("button", { name: /pasar a en curso/i })).toBeNull();
  });

  it.each(["reservado", "vendido"] as const)(
    "RF-039 un viaje %s no se avanza a mano: el cobro lo cambia (EST-Viaje T2, T3)",
    async (estado) => {
      renderFicha(estado);
      const region = await acciones();

      expect(within(region).queryByRole("button", { name: AVANZAR })).toBeNull();
      expect(within(region).queryByRole("button", { name: CORREGIR })).toBeNull();
    },
  );

  it.each(["finalizado", "cancelado"] as const)(
    "RF-039 un viaje %s no ofrece avanzar",
    async (estado) => {
      renderFicha(estado);
      const region = await acciones();

      expect(within(region).queryByRole("button", { name: AVANZAR })).toBeNull();
    },
  );

  it("RF-039 el freelance no ve acciones de estado", async () => {
    renderFicha("confirmado", "freelance");
    const region = await acciones();

    expect(within(region).queryByRole("button", { name: AVANZAR })).toBeNull();
    expect(within(region).queryByRole("button", { name: CORREGIR })).toBeNull();
  });

  it.each(["admin", "dueno"] as const)("RF-039 el %s también puede avanzar el viaje", async (rol) => {
    renderFicha("confirmado", rol);
    const region = await acciones();

    expect(await within(region).findByRole("button", { name: /pasar a en curso/i })).toBeEnabled();
  });

  it("RF-039 pide confirmación antes de pasar a en curso y no llama a la API todavía", async () => {
    const llamadas: string[] = [];
    servidor.use(contar("iniciar", llamadas));
    renderFicha("confirmado");
    const region = await acciones();

    await userEvent.click(await within(region).findByRole("button", { name: /pasar a en curso/i }));

    const dialogo = await screen.findByRole("dialog", { name: /pasar el viaje a/i });
    expect(dialogo).toHaveTextContent(/en curso/i);
    expect(within(dialogo).getByRole("button", { name: /todavía no/i })).toBeInTheDocument();
    expect(llamadas).toHaveLength(0);
  });

  it("RF-039 al confirmar, manda POST /iniciar del viaje y cierra el diálogo", async () => {
    const llamadas: string[] = [];
    servidor.use(contar("iniciar", llamadas));
    renderFicha("confirmado");
    const region = await acciones();

    await userEvent.click(await within(region).findByRole("button", { name: /pasar a en curso/i }));
    const dialogo = await screen.findByRole("dialog", { name: /pasar el viaje a/i });
    await userEvent.click(within(dialogo).getByRole("button", { name: /pasar a en curso/i }));

    await waitFor(() => {
      expect(llamadas).toEqual([idViajeMock.confirmado]);
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("RF-039 al confirmar desde en curso, manda POST /finalizar del viaje", async () => {
    const llamadas: string[] = [];
    servidor.use(contar("finalizar", llamadas));
    renderFicha("en_curso");
    const region = await acciones();

    await userEvent.click(
      await within(region).findByRole("button", { name: /pasar a finalizado/i }),
    );
    const dialogo = await screen.findByRole("dialog", { name: /pasar el viaje a/i });
    await userEvent.click(within(dialogo).getByRole("button", { name: /pasar a finalizado/i }));

    await waitFor(() => {
      expect(llamadas).toEqual([idViajeMock.en_curso]);
    });
  });

  it("RF-039 «Todavía no» cierra el diálogo y no cambia el estado (A1)", async () => {
    const llamadas: string[] = [];
    servidor.use(contar("iniciar", llamadas));
    renderFicha("confirmado");
    const region = await acciones();

    await userEvent.click(await within(region).findByRole("button", { name: /pasar a en curso/i }));
    const dialogo = await screen.findByRole("dialog", { name: /pasar el viaje a/i });
    await userEvent.click(within(dialogo).getByRole("button", { name: /todavía no/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(llamadas).toHaveLength(0);
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
  });

  it("RF-039 si el servidor responde 409 muestra el motivo y no cierra como si hubiera salido bien", async () => {
    servidor.use(
      http.post("*/api/viajes/:id/iniciar", () =>
        problema(409, "El viaje debe estar totalmente pagado para iniciar."),
      ),
    );
    renderFicha("confirmado");
    const region = await acciones();

    await userEvent.click(await within(region).findByRole("button", { name: /pasar a en curso/i }));
    const dialogo = await screen.findByRole("dialog", { name: /pasar el viaje a/i });
    await userEvent.click(within(dialogo).getByRole("button", { name: /pasar a en curso/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /debe estar totalmente pagado para iniciar/i,
    );
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
  });

  it("RF-039 si el servidor responde 422 al finalizar muestra el motivo", async () => {
    servidor.use(
      http.post("*/api/viajes/:id/finalizar", () =>
        problema(422, "Todavía no llegó la fecha de regreso."),
      ),
    );
    renderFicha("en_curso");
    const region = await acciones();

    await userEvent.click(
      await within(region).findByRole("button", { name: /pasar a finalizado/i }),
    );
    const dialogo = await screen.findByRole("dialog", { name: /pasar el viaje a/i });
    await userEvent.click(within(dialogo).getByRole("button", { name: /pasar a finalizado/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/fecha de regreso/i);
  });
});

describe("RF-042 corregir", () => {
  it("RF-042 un viaje en curso ofrece «Corregir estado» para volver a confirmado", async () => {
    renderFicha("en_curso");
    const region = await acciones();

    expect(await within(region).findByRole("button", { name: CORREGIR })).toBeEnabled();
  });

  it("RF-042 un viaje finalizado ofrece «Corregir estado» para volver a en curso", async () => {
    renderFicha("finalizado");
    const region = await acciones();

    expect(await within(region).findByRole("button", { name: CORREGIR })).toBeEnabled();
  });

  it.each(["reservado", "vendido", "confirmado", "cancelado"] as const)(
    "RF-042 un viaje %s no se corrige a mano (T7 solo sale de en curso y finalizado)",
    async (estado) => {
      renderFicha(estado);
      const region = await acciones();

      expect(within(region).queryByRole("button", { name: CORREGIR })).toBeNull();
    },
  );

  it("RF-042 el freelance no puede corregir el estado", async () => {
    renderFicha("finalizado", "freelance");
    const region = await acciones();

    expect(within(region).queryByRole("button", { name: CORREGIR })).toBeNull();
  });

  it("RF-042 la confirmación nombra el estado al que vuelve el viaje (en curso → confirmado)", async () => {
    renderFicha("en_curso");
    const region = await acciones();

    await userEvent.click(await within(region).findByRole("button", { name: CORREGIR }));

    const dialogo = await screen.findByRole("dialog", { name: /corregir/i });
    expect(dialogo).toHaveTextContent(/confirmado/i);
  });

  it("RF-042 la confirmación nombra el estado al que vuelve el viaje (finalizado → en curso)", async () => {
    renderFicha("finalizado");
    const region = await acciones();

    await userEvent.click(await within(region).findByRole("button", { name: CORREGIR }));

    const dialogo = await screen.findByRole("dialog", { name: /corregir/i });
    expect(dialogo).toHaveTextContent(/en curso/i);
  });

  it("RF-042 al confirmar, manda POST /corregir-estado sin motivo (el contrato no lo pide)", async () => {
    const cuerpos: string[] = [];
    servidor.use(
      http.post("*/api/viajes/:id/corregir-estado", async ({ request }) => {
        cuerpos.push(await request.clone().text());
        return undefined;
      }),
    );
    renderFicha("finalizado");
    const region = await acciones();

    await userEvent.click(await within(region).findByRole("button", { name: CORREGIR }));
    const dialogo = await screen.findByRole("dialog", { name: /corregir/i });
    expect(within(dialogo).queryByRole("textbox")).toBeNull();
    await userEvent.click(within(dialogo).getByRole("button", { name: CORREGIR }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toBe("");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("RF-042 cancelar la corrección no llama a la API", async () => {
    const llamadas: string[] = [];
    servidor.use(contar("corregir-estado", llamadas));
    renderFicha("en_curso");
    const region = await acciones();

    await userEvent.click(await within(region).findByRole("button", { name: CORREGIR }));
    const dialogo = await screen.findByRole("dialog", { name: /corregir/i });
    await userEvent.click(within(dialogo).getByRole("button", { name: /todavía no|cancelar/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(llamadas).toHaveLength(0);
    expect(screen.getByText("En curso")).toBeInTheDocument();
  });

  it("RF-042 si el servidor responde 409 muestra el motivo", async () => {
    servidor.use(
      http.post("*/api/viajes/:id/corregir-estado", () =>
        problema(409, "No se corrige el estado de este viaje."),
      ),
    );
    renderFicha("en_curso");
    const region = await acciones();

    await userEvent.click(await within(region).findByRole("button", { name: CORREGIR }));
    const dialogo = await screen.findByRole("dialog", { name: /corregir/i });
    await userEvent.click(within(dialogo).getByRole("button", { name: CORREGIR }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se corrige el estado/i);
  });
});
