import { crearCliente, type UsuarioActual } from "@rumbo/shared";
import {
  cotizacionesMock,
  crearServidor,
  idCotizacionMock,
  idOportunidadMock,
  manejadoresOportunidades,
  usuariosPorRol,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { CotizacionesOportunidad } from "./CotizacionesOportunidad";

const servidor = crearServidor(...manejadoresOportunidades);
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
const crearObjectURL = vi.fn(() => "blob:cotizacion");
beforeEach(() => {
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: crearObjectURL, revokeObjectURL: vi.fn() }));
  // jsdom no navega: evita el aviso de «not implemented» al hacer clic en el enlace de descarga.
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
});
afterEach(() => {
  servidor.resetHandlers();
  crearObjectURL.mockClear();
  vi.restoreAllMocks();
});
afterAll(() => {
  servidor.close();
});

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });

function renderCotizaciones(
  oportunidadId: string,
  usuario: UsuarioActual = usuariosPorRol.empleado,
) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CotizacionesOportunidad cliente={cliente} usuario={usuario} oportunidadId={oportunidadId} />
    </QueryClientProvider>,
  );
}

const problema = (status: number, detail: string) =>
  HttpResponse.json(
    { type: "about:blank", title: "Error", status, detail },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );

/** La lista de versiones de la oportunidad «cotizada» con la más reciente en el estado indicado. */
function conVersionReciente(estado: "borrador" | "enviada" | "aceptada" | "rechazada" | "vencida") {
  const reciente = { ...cotizacionesMock[1], estado };
  return http.get("*/api/oportunidades/:id/cotizaciones", () =>
    HttpResponse.json({
      items: [reciente, cotizacionesMock[0]],
      total: 2,
      pagina: 1,
      por_pagina: 100,
    }),
  );
}

/** El <li> de la versión más reciente (la primera de la lista). */
async function filaReciente() {
  const lista = await screen.findByRole("list", { name: /versiones/i });
  return within(lista).getAllByRole("listitem")[0] as HTMLElement;
}

const idReciente = idCotizacionMock.europa_v2;
const cotizada = idOportunidadMock.cotizada;

describe("RF-023 enviar", () => {
  it("RF-023 un borrador ofrece «Marcar como enviada» y no aceptar ni rechazar", async () => {
    servidor.use(conVersionReciente("borrador"));
    renderCotizaciones(cotizada);

    const fila = await filaReciente();
    expect(within(fila).getByRole("button", { name: /marcar como enviada/i })).toBeInTheDocument();
    expect(within(fila).queryByRole("button", { name: /aceptar/i })).not.toBeInTheDocument();
    expect(within(fila).queryByRole("button", { name: /rechazar/i })).not.toBeInTheDocument();
  });

  it("RF-023 al marcarla como enviada llama a /enviar y la versión pasa a «Enviada»", async () => {
    const u = userEvent.setup();
    const llamadas: string[] = [];
    let estado: "borrador" | "enviada" = "borrador";
    servidor.use(
      http.get("*/api/oportunidades/:id/cotizaciones", () =>
        HttpResponse.json({
          items: [{ ...cotizacionesMock[1], estado }, cotizacionesMock[0]],
          total: 2,
          pagina: 1,
          por_pagina: 100,
        }),
      ),
      http.post("*/api/cotizaciones/:id/enviar", ({ params }) => {
        llamadas.push(String(params["id"]));
        estado = "enviada";
        return HttpResponse.json({ ...cotizacionesMock[1], estado });
      }),
    );
    renderCotizaciones(cotizada);

    const fila = await filaReciente();
    await u.click(within(fila).getByRole("button", { name: /marcar como enviada/i }));

    await waitFor(async () => {
      expect(llamadas).toEqual([idReciente]);
      expect(await filaReciente()).toHaveTextContent(/enviada/i);
    });
    expect(
      within(await filaReciente()).queryByRole("button", { name: /marcar como enviada/i }),
    ).not.toBeInTheDocument();
  });

  it("RF-023 si el servidor responde 409 al enviar muestra su detail", async () => {
    const u = userEvent.setup();
    servidor.use(
      conVersionReciente("borrador"),
      http.post("*/api/cotizaciones/:id/enviar", () =>
        problema(409, "No se puede enviar una cotización vencida."),
      ),
    );
    renderCotizaciones(cotizada);

    const fila = await filaReciente();
    await u.click(within(fila).getByRole("button", { name: /marcar como enviada/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se puede enviar una cotización vencida.",
    );
  });

  it("RF-023 una cotización enviada ya no ofrece «Marcar como enviada»", async () => {
    renderCotizaciones(cotizada);

    const fila = await filaReciente();
    expect(fila).toHaveTextContent(/enviada/i);
    expect(within(fila).queryByRole("button", { name: /marcar como enviada/i })).not.toBeInTheDocument();
  });
});

describe("RF-025 aceptar o rechazar", () => {
  it("RF-025 una cotización enviada ofrece aceptar y rechazar", async () => {
    renderCotizaciones(cotizada);

    const fila = await filaReciente();
    expect(within(fila).getByRole("button", { name: /aceptar/i })).toBeInTheDocument();
    expect(within(fila).getByRole("button", { name: /rechazar/i })).toBeInTheDocument();
    expect(within(fila).queryByRole("button", { name: /marcar como enviada/i })).not.toBeInTheDocument();
  });

  it.each(["aceptada", "rechazada", "vencida"] as const)(
    "RF-025 una cotización %s no ofrece ninguna acción de respuesta",
    async (estado) => {
      servidor.use(conVersionReciente(estado));
      renderCotizaciones(cotizada);

      const fila = await filaReciente();
      expect(within(fila).queryByRole("button", { name: /aceptar/i })).not.toBeInTheDocument();
      expect(within(fila).queryByRole("button", { name: /rechazar/i })).not.toBeInTheDocument();
      expect(within(fila).queryByRole("button", { name: /marcar como enviada/i })).not.toBeInTheDocument();
    },
  );

  it("RF-025 aceptar llama a /aceptar y la versión pasa a «Aceptada»", async () => {
    const u = userEvent.setup();
    const llamadas: string[] = [];
    let estado: "enviada" | "aceptada" = "enviada";
    servidor.use(
      http.get("*/api/oportunidades/:id/cotizaciones", () =>
        HttpResponse.json({
          items: [{ ...cotizacionesMock[1], estado }, cotizacionesMock[0]],
          total: 2,
          pagina: 1,
          por_pagina: 100,
        }),
      ),
      http.post("*/api/cotizaciones/:id/aceptar", ({ params }) => {
        llamadas.push(String(params["id"]));
        estado = "aceptada";
        return HttpResponse.json({ ...cotizacionesMock[1], estado });
      }),
    );
    renderCotizaciones(cotizada);

    const fila = await filaReciente();
    await u.click(within(fila).getByRole("button", { name: /aceptar/i }));

    await waitFor(async () => {
      expect(llamadas).toEqual([idReciente]);
      expect(await filaReciente()).toHaveTextContent(/aceptada/i);
    });
  });

  it("RF-025 «Rechazar» solo abre la confirmación: no llama al servidor hasta confirmar", async () => {
    const u = userEvent.setup();
    const llamadas: string[] = [];
    servidor.use(
      http.post("*/api/cotizaciones/:id/rechazar", ({ params }) => {
        llamadas.push(String(params["id"]));
        return HttpResponse.json({ ...cotizacionesMock[1], estado: "rechazada" });
      }),
    );
    renderCotizaciones(cotizada);

    const fila = await filaReciente();
    await u.click(within(fila).getByRole("button", { name: /rechazar/i }));

    expect(screen.getByRole("button", { name: /confirmar rechazo/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/motivo/i)).not.toBeInTheDocument();
    expect(llamadas).toHaveLength(0);
  });

  it("RF-025 cancelar la confirmación no llama al servidor y la versión sigue «Enviada»", async () => {
    const u = userEvent.setup();
    const llamadas: string[] = [];
    servidor.use(
      http.post("*/api/cotizaciones/:id/rechazar", ({ params }) => {
        llamadas.push(String(params["id"]));
        return HttpResponse.json({ ...cotizacionesMock[1], estado: "rechazada" });
      }),
    );
    renderCotizaciones(cotizada);

    const fila = await filaReciente();
    await u.click(within(fila).getByRole("button", { name: /rechazar/i }));
    await u.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(screen.queryByRole("button", { name: /confirmar rechazo/i })).not.toBeInTheDocument();
    expect(llamadas).toHaveLength(0);
    expect(await filaReciente()).toHaveTextContent(/enviada/i);
  });

  it("RF-025 confirmar el rechazo llama a /rechazar y la versión pasa a «Rechazada»", async () => {
    const u = userEvent.setup();
    const llamadas: string[] = [];
    let estado: "enviada" | "rechazada" = "enviada";
    servidor.use(
      http.get("*/api/oportunidades/:id/cotizaciones", () =>
        HttpResponse.json({
          items: [{ ...cotizacionesMock[1], estado }, cotizacionesMock[0]],
          total: 2,
          pagina: 1,
          por_pagina: 100,
        }),
      ),
      http.post("*/api/cotizaciones/:id/rechazar", ({ params }) => {
        llamadas.push(String(params["id"]));
        estado = "rechazada";
        return HttpResponse.json({ ...cotizacionesMock[1], estado });
      }),
    );
    renderCotizaciones(cotizada);

    const fila = await filaReciente();
    await u.click(within(fila).getByRole("button", { name: /rechazar/i }));
    await u.click(screen.getByRole("button", { name: /confirmar rechazo/i }));

    await waitFor(async () => {
      expect(llamadas).toEqual([idReciente]);
      expect(await filaReciente()).toHaveTextContent(/rechazada/i);
    });
  });

  it("RF-025 si el servidor responde 409 al aceptar muestra su detail", async () => {
    const u = userEvent.setup();
    servidor.use(
      http.post("*/api/cotizaciones/:id/aceptar", () =>
        problema(409, "No se puede aceptar una cotización vencida."),
      ),
    );
    renderCotizaciones(cotizada);

    const fila = await filaReciente();
    await u.click(within(fila).getByRole("button", { name: /aceptar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se puede aceptar una cotización vencida.",
    );
  });

  it("RF-025 en una oportunidad perdida no hay acciones de respuesta pero sí «Descargar PDF»", async () => {
    servidor.use(conVersionReciente("enviada"));
    renderCotizaciones(idOportunidadMock.perdida);

    const fila = await filaReciente();
    expect(within(fila).getByRole("button", { name: /descargar pdf/i })).toBeInTheDocument();
    expect(
      within(fila).queryByRole("button", { name: /aceptar|rechazar|marcar como enviada/i }),
    ).not.toBeInTheDocument();
  });

  it("RF-025 un empleado que no es el responsable ve las versiones sin acciones de respuesta", async () => {
    const otro = { ...usuariosPorRol.empleado, id: "9c1d7e52-4b3a-4f60-8a21-5e0d3b7c9a10" };
    renderCotizaciones(cotizada, otro);

    const fila = await filaReciente();
    expect(within(fila).queryByRole("button", { name: /aceptar/i })).not.toBeInTheDocument();
    expect(within(fila).queryByRole("button", { name: /rechazar/i })).not.toBeInTheDocument();
  });
});

describe("RF-023 descarga del PDF", () => {
  it("RF-023 cada versión ofrece descargar su PDF", async () => {
    renderCotizaciones(cotizada);

    const lista = await screen.findByRole("list", { name: /versiones/i });
    for (const fila of within(lista).getAllByRole("listitem")) {
      expect(within(fila).getByRole("button", { name: /descargar pdf/i })).toBeInTheDocument();
    }
  });

  it("RF-023 descargar pide el documento de esa versión y genera el archivo", async () => {
    const u = userEvent.setup();
    const pedidos: string[] = [];
    servidor.use(
      http.get("*/api/cotizaciones/:id/documento", ({ params }) => {
        pedidos.push(String(params["id"]));
        return new HttpResponse("%PDF-1.4\n%%EOF\n", {
          headers: { "content-type": "application/pdf" },
        });
      }),
    );
    renderCotizaciones(cotizada);

    const fila = await filaReciente();
    await u.click(within(fila).getByRole("button", { name: /descargar pdf/i }));

    await waitFor(() => {
      expect(pedidos).toEqual([idReciente]);
      expect(crearObjectURL).toHaveBeenCalledTimes(1);
    });
  });

  it("RF-023 si falla la descarga avisa con el detail del servidor", async () => {
    const u = userEvent.setup();
    servidor.use(
      http.get("*/api/cotizaciones/:id/documento", () => problema(500, "No pudimos generar el PDF.")),
    );
    renderCotizaciones(cotizada);

    const fila = await filaReciente();
    await u.click(within(fila).getByRole("button", { name: /descargar pdf/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos generar el PDF.");
    expect(crearObjectURL).not.toHaveBeenCalled();
  });

  it("RF-023 una cotización aceptada de una oportunidad ganada igual permite descargar el PDF", async () => {
    renderCotizaciones(idOportunidadMock.ganada);

    const fila = await filaReciente();
    expect(within(fila).getByRole("button", { name: /descargar pdf/i })).toBeInTheDocument();
    expect(within(fila).queryByRole("button", { name: /aceptar|rechazar/i })).not.toBeInTheDocument();
  });
});
