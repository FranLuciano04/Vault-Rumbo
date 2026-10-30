import { crearCliente, type UsuarioActual } from "@rumbo/shared";
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
 * T-107: cancelar y revertir la cancelación desde la región «Acciones» de la ficha (pantalla 19,
 * CU-27). Supuestos de UI: botón «Cancelar viaje» en la región, que abre un diálogo (role dialog,
 * nombre /cancelar viaje/) con el campo «Motivo de la cancelación», la «Fecha de cancelación»
 * (con valor por defecto), el aviso de cobros registrados, «Volver» y el botón de confirmar
 * «Cancelar viaje». En un viaje cancelado, la región ofrece «Revertir cancelación» con su diálogo
 * (nombre /revertir/) y confirmación «Revertir cancelación». Permiso: admin, dueño o responsable.
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

function renderFicha(
  estado: keyof typeof idViajeMock,
  rol: RolMock = "empleado",
  usuario: UsuarioActual = usuariosPorRol[rol],
) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/viajes/${idViajeMock[estado]}`]}>
        <FichaViaje cliente={cliente} usuario={usuario} viajeId={idViajeMock[estado]} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function acciones() {
  await screen.findByRole("heading", { level: 1 });
  return screen.findByRole("region", { name: /acciones/i });
}

const problema = (status: number, detail: string) =>
  HttpResponse.json(
    { title: "Error", status, detail },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );

const CANCELAR = /^cancelar viaje$/i;
const REVERTIR = /revertir cancelación/i;

async function abrirCancelar(estado: keyof typeof idViajeMock) {
  renderFicha(estado);
  const region = await acciones();
  await userEvent.click(await within(region).findByRole("button", { name: CANCELAR }));
  return screen.findByRole("dialog", { name: /cancelar viaje/i });
}

describe("RF-048 cancelar", () => {
  it.each(["reservado", "vendido", "confirmado", "en_curso"] as const)(
    "RF-048 un viaje %s ofrece «Cancelar viaje»",
    async (estado) => {
      renderFicha(estado);
      const region = await acciones();

      expect(await within(region).findByRole("button", { name: CANCELAR })).toBeEnabled();
    },
  );

  it("RF-048 un viaje finalizado no ofrece cancelar (A1)", async () => {
    renderFicha("finalizado");
    const region = await acciones();

    expect(within(region).queryByRole("button", { name: CANCELAR })).toBeNull();
  });

  it("RF-048 un viaje ya cancelado no ofrece cancelar", async () => {
    renderFicha("cancelado");
    const region = await acciones();

    expect(within(region).queryByRole("button", { name: CANCELAR })).toBeNull();
  });

  it("RF-048 quien no es responsable del viaje (freelance) no ve «Cancelar viaje»", async () => {
    renderFicha("vendido", "freelance");
    const region = await acciones();

    expect(within(region).queryByRole("button", { name: CANCELAR })).toBeNull();
  });

  it.each(["admin", "dueno"] as const)("RF-048 el %s puede cancelar el viaje", async (rol) => {
    renderFicha("vendido", rol);
    const region = await acciones();

    expect(await within(region).findByRole("button", { name: CANCELAR })).toBeEnabled();
  });

  it("RF-048 el diálogo pide motivo y fecha, y no llama a la API todavía", async () => {
    const llamadas: unknown[] = [];
    servidor.use(
      http.post("*/api/viajes/:id/cancelar", () => {
        llamadas.push(1);
        return undefined;
      }),
    );
    const dialogo = await abrirCancelar("vendido");

    expect(within(dialogo).getByLabelText(/motivo de la cancelación/i)).toBeInTheDocument();
    expect(within(dialogo).getByLabelText(/fecha de cancelación/i)).toBeInTheDocument();
    expect(within(dialogo).getByRole("button", { name: /volver/i })).toBeInTheDocument();
    expect(llamadas).toHaveLength(0);
  });

  it("RF-048 el diálogo informa los cobros ya registrados y que el reembolso queda fuera de Rumbo (A2)", async () => {
    // El viaje vendido tiene la seña cobrada: ARS 600.000.
    const dialogo = await abrirCancelar("vendido");

    expect(await within(dialogo).findByText(/ya se cobraron/i)).toHaveTextContent(/600\.000/);
    expect(dialogo).toHaveTextContent(/reembolso|penalidad/i);
    expect(dialogo).toHaveTextContent(/por fuera de rumbo/i);
  });

  it("RF-048 sin cobros registrados, el diálogo no muestra el aviso de cobros", async () => {
    const dialogo = await abrirCancelar("reservado");

    // Esperar a que el diálogo termine de cargar los pagos antes de afirmar la ausencia.
    await within(dialogo).findByLabelText(/motivo de la cancelación/i);
    expect(within(dialogo).queryByText(/ya se cobraron/i)).toBeNull();
  });

  it("RF-048 el diálogo avisa que se puede revertir la cancelación (A3)", async () => {
    const dialogo = await abrirCancelar("vendido");

    expect(dialogo).toHaveTextContent(/si fue un error, se puede revertir/i);
  });

  it("RF-048 sin motivo no se cancela: no llama a la API", async () => {
    const llamadas: unknown[] = [];
    servidor.use(
      http.post("*/api/viajes/:id/cancelar", () => {
        llamadas.push(1);
        return undefined;
      }),
    );
    const dialogo = await abrirCancelar("vendido");

    await userEvent.click(within(dialogo).getByRole("button", { name: CANCELAR }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/motivo/i);
    expect(llamadas).toHaveLength(0);
  });

  it("RF-048 al confirmar, manda POST /cancelar con motivo y fecha, y cierra el diálogo", async () => {
    const cuerpos: { motivo_cancelacion: string; fecha_cancelacion: string }[] = [];
    const ids: string[] = [];
    servidor.use(
      http.post("*/api/viajes/:id/cancelar", async ({ params, request }) => {
        ids.push(String(params["id"]));
        cuerpos.push((await request.clone().json()) as (typeof cuerpos)[number]);
        return undefined;
      }),
    );
    const dialogo = await abrirCancelar("vendido");

    await userEvent.type(
      within(dialogo).getByLabelText(/motivo de la cancelación/i),
      "El cliente desistió por motivos de salud.",
    );
    await userEvent.click(within(dialogo).getByRole("button", { name: CANCELAR }));

    await waitFor(() => {
      expect(ids).toEqual([idViajeMock.vendido]);
    });
    expect(cuerpos[0]?.motivo_cancelacion).toBe("El cliente desistió por motivos de salud.");
    expect(cuerpos[0]?.fecha_cancelacion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("RF-048 «Volver» cierra el diálogo y no cancela el viaje", async () => {
    const llamadas: unknown[] = [];
    servidor.use(
      http.post("*/api/viajes/:id/cancelar", () => {
        llamadas.push(1);
        return undefined;
      }),
    );
    const dialogo = await abrirCancelar("vendido");

    await userEvent.click(within(dialogo).getByRole("button", { name: /volver/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(llamadas).toHaveLength(0);
    expect(screen.getByText("Vendido")).toBeInTheDocument();
  });

  it("RF-048 si el servidor responde 409 muestra el motivo", async () => {
    servidor.use(
      http.post("*/api/viajes/:id/cancelar", () =>
        problema(409, "No se puede cancelar un viaje finalizado."),
      ),
    );
    const dialogo = await abrirCancelar("vendido");

    await userEvent.type(within(dialogo).getByLabelText(/motivo de la cancelación/i), "Error");
    await userEvent.click(within(dialogo).getByRole("button", { name: CANCELAR }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se puede cancelar un viaje/i);
  });
});

describe("RF-053 revertir", () => {
  it("RF-053 un viaje cancelado ofrece «Revertir cancelación»", async () => {
    renderFicha("cancelado");
    const region = await acciones();

    expect(await within(region).findByRole("button", { name: REVERTIR })).toBeEnabled();
  });

  it.each(["reservado", "vendido", "confirmado", "en_curso", "finalizado"] as const)(
    "RF-053 un viaje %s no ofrece revertir",
    async (estado) => {
      renderFicha(estado);
      const region = await acciones();

      expect(within(region).queryByRole("button", { name: REVERTIR })).toBeNull();
    },
  );

  it("RF-053 quien no es responsable del viaje no puede revertir", async () => {
    renderFicha("cancelado", "freelance");
    const region = await acciones();

    expect(within(region).queryByRole("button", { name: REVERTIR })).toBeNull();
  });

  it("RF-053 la confirmación nombra el estado al que vuelve el viaje y no llama a la API todavía", async () => {
    const llamadas: unknown[] = [];
    servidor.use(
      http.post("*/api/viajes/:id/revertir-cancelacion", () => {
        llamadas.push(1);
        return undefined;
      }),
    );
    renderFicha("cancelado");
    const region = await acciones();

    await userEvent.click(await within(region).findByRole("button", { name: REVERTIR }));

    // El viaje ficticio estaba «vendido» antes de cancelarse (estado_previo).
    const dialogo = await screen.findByRole("dialog", { name: /revertir/i });
    expect(dialogo).toHaveTextContent(/vendido/i);
    expect(llamadas).toHaveLength(0);
  });

  it("RF-053 al confirmar, manda POST /revertir-cancelacion y cierra el diálogo", async () => {
    const ids: string[] = [];
    servidor.use(
      http.post("*/api/viajes/:id/revertir-cancelacion", ({ params }) => {
        ids.push(String(params["id"]));
        return undefined;
      }),
    );
    renderFicha("cancelado");
    const region = await acciones();

    await userEvent.click(await within(region).findByRole("button", { name: REVERTIR }));
    const dialogo = await screen.findByRole("dialog", { name: /revertir/i });
    await userEvent.click(within(dialogo).getByRole("button", { name: REVERTIR }));

    await waitFor(() => {
      expect(ids).toEqual([idViajeMock.cancelado]);
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("RF-053 «Todavía no» cierra el diálogo sin revertir", async () => {
    const llamadas: unknown[] = [];
    servidor.use(
      http.post("*/api/viajes/:id/revertir-cancelacion", () => {
        llamadas.push(1);
        return undefined;
      }),
    );
    renderFicha("cancelado");
    const region = await acciones();

    await userEvent.click(await within(region).findByRole("button", { name: REVERTIR }));
    const dialogo = await screen.findByRole("dialog", { name: /revertir/i });
    await userEvent.click(within(dialogo).getByRole("button", { name: /todavía no|volver/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(llamadas).toHaveLength(0);
  });

  it("RF-053 si el servidor responde 409 muestra el motivo", async () => {
    servidor.use(
      http.post("*/api/viajes/:id/revertir-cancelacion", () =>
        problema(409, "No se puede revertir cancelación un viaje finalizado."),
      ),
    );
    renderFicha("cancelado");
    const region = await acciones();

    await userEvent.click(await within(region).findByRole("button", { name: REVERTIR }));
    const dialogo = await screen.findByRole("dialog", { name: /revertir/i });
    await userEvent.click(within(dialogo).getByRole("button", { name: REVERTIR }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se puede revertir/i);
  });
});
