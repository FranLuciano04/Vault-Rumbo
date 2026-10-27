import { crearCliente, type UsuarioActual } from "@rumbo/shared";
import {
  configuracionMock,
  cotizacionesMock,
  crearServidor,
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
// El «hoy» de los mocks (25/10/26): la vigencia por defecto es de 1 mes, o sea hasta el 25/11/26.
const HOY = new Date("2026-10-25T12:00:00-03:00");
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: HOY });
});
afterEach(() => {
  servidor.resetHandlers();
  vi.useRealTimers();
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
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CotizacionesOportunidad cliente={cliente} usuario={usuario} oportunidadId={oportunidadId} />
    </QueryClientProvider>,
  );
}

const problema = (status: number, detail: string) =>
  HttpResponse.json(
    { type: "about:blank", title: "Error", status, detail },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );

/** Registra el cuerpo JSON del POST de emisión y deja seguir con el handler del mock. */
function registrarEmision(cuerpos: Record<string, unknown>[]) {
  return http.post("*/api/oportunidades/:id/cotizaciones", async ({ request }) => {
    cuerpos.push((await request.clone().json()) as Record<string, unknown>);
    return undefined;
  });
}

const nuevoUsuario = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

/** Completa la fila `indice` de ítems del formulario (cada fila tiene «Concepto» y «Precio»). */
async function completarItem(
  u: ReturnType<typeof nuevoUsuario>,
  indice: number,
  concepto: string,
  precio: string,
) {
  await u.type(screen.getAllByLabelText(/concepto/i)[indice] as HTMLElement, concepto);
  await u.type(screen.getAllByLabelText(/precio/i)[indice] as HTMLElement, precio);
}

const enGestion = idOportunidadMock.en_gestion;
// El responsable de la oportunidad del mock es el empleado: el freelance que cotiza tiene que serlo.
const freelanceResponsable = { ...usuariosPorRol.freelance, id: usuariosPorRol.empleado.id };

describe("RF-021 emitir cotización", () => {
  it("RF-021 muestra el contexto de la oportunidad y el formulario con moneda ARS por defecto", async () => {
    renderCotizaciones(enGestion);

    expect(await screen.findByText("Mendoza")).toBeInTheDocument();
    expect(screen.getByText("Familia Sosa")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "ARS" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "USD" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: /agregar ítem/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generar documento/i })).toBeInTheDocument();
  });

  it("RF-021 calcula y muestra el total a medida que se cargan los ítems", async () => {
    const u = nuevoUsuario();
    renderCotizaciones(enGestion);
    await screen.findByText("Mendoza");

    await completarItem(u, 0, "Aéreo", "780000,50");
    await u.click(screen.getByRole("button", { name: /agregar ítem/i }));
    await completarItem(u, 1, "Alojamiento", "640000");

    const total = screen.getByText(/total calculado/i).parentElement as HTMLElement;
    expect(total).toHaveTextContent("$ 1.420.000,50");
  });

  it("RF-021 al elegir USD el total se muestra en dólares", async () => {
    const u = nuevoUsuario();
    renderCotizaciones(enGestion);
    await screen.findByText("Mendoza");

    await u.click(screen.getByRole("radio", { name: "USD" }));
    await completarItem(u, 0, "Aéreo", "1500");

    const total = screen.getByText(/total calculado/i).parentElement as HTMLElement;
    expect(total).toHaveTextContent("US$ 1.500,00");
  });

  it("RF-022 el admin ve la vigencia calculada con los meses de la configuración (2 meses: 25/12/26)", async () => {
    servidor.use(
      http.get("*/api/configuracion", () =>
        HttpResponse.json({ ...configuracionMock, vigencia_cotizacion_meses: 2 }),
      ),
    );
    renderCotizaciones(enGestion, usuariosPorRol.admin);
    await screen.findByText("Mendoza");

    expect(await screen.findByText(/válida hasta/i)).toHaveTextContent("25/12/26");
  });

  it("RF-022 quien no lee la configuración ve la vigencia sin fecha", async () => {
    renderCotizaciones(enGestion);
    await screen.findByText("Mendoza");

    expect(screen.getByText(/vigencia según la configuración/i)).toBeInTheDocument();
    expect(screen.queryByText(/válida hasta/i)).not.toBeInTheDocument();
  });

  it("RF-021 importes es-AR: «780.000» es 780 mil y se envía como «780000»", async () => {
    const u = nuevoUsuario();
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrarEmision(cuerpos));
    renderCotizaciones(enGestion);
    await screen.findByText("Mendoza");

    await completarItem(u, 0, "Aéreo", "780.000");
    const total = screen.getByText(/total calculado/i).parentElement as HTMLElement;
    expect(total).toHaveTextContent("$ 780.000,00");
    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect((cuerpos[0] as { items: { precio: string }[] }).items[0]?.precio).toBe("780000");
  });

  it("RF-021 importes es-AR: «1.420.000,50» suma bien y «1500,50» se envía como «1500.50»", async () => {
    const u = nuevoUsuario();
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrarEmision(cuerpos));
    renderCotizaciones(enGestion);
    await screen.findByText("Mendoza");

    await completarItem(u, 0, "Aéreo", "1.420.000,50");
    const total = screen.getByText(/total calculado/i).parentElement as HTMLElement;
    expect(total).toHaveTextContent("$ 1.420.000,50");
    await u.clear(screen.getByLabelText(/precio/i));
    await u.type(screen.getByLabelText(/precio/i), "1500,50");
    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect((cuerpos[0] as { items: { precio: string }[] }).items[0]?.precio).toBe("1500.50");
  });

  it("RF-021 no envía un importe mal agrupado como «1.50.000»", async () => {
    const u = nuevoUsuario();
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrarEmision(cuerpos));
    renderCotizaciones(enGestion);
    await screen.findByText("Mendoza");

    await completarItem(u, 0, "Aéreo", "1.50.000");
    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-021 no envía un importe con grupo de miles que empieza en cero como «0.500»", async () => {
    const u = nuevoUsuario();
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrarEmision(cuerpos));
    renderCotizaciones(enGestion);
    await screen.findByText("Mendoza");

    await completarItem(u, 0, "Aéreo", "0.500");
    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-021 si el servidor responde 409 porque la oportunidad es ganada muestra su detail", async () => {
    const u = nuevoUsuario();
    servidor.use(
      http.post("*/api/oportunidades/:id/cotizaciones", () =>
        problema(409, "No se cotiza una oportunidad ganada."),
      ),
    );
    renderCotizaciones(enGestion);
    await screen.findByText("Mendoza");

    await completarItem(u, 0, "Aéreo", "780000");
    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se cotiza una oportunidad ganada.",
    );
  });

  it("RF-021 si el servidor responde 422 muestra el mensaje real del error", async () => {
    const u = nuevoUsuario();
    servidor.use(
      http.post("*/api/oportunidades/:id/cotizaciones", () =>
        HttpResponse.json(
          {
            type: "about:blank",
            title: "Error de validación",
            status: 422,
            errores: [{ campo: "total", mensaje: "El total excede el máximo permitido." }],
          },
          { status: 422, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );
    renderCotizaciones(enGestion);
    await screen.findByText("Mendoza");

    await completarItem(u, 0, "Aéreo", "780000");
    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El total excede el máximo permitido.",
    );
  });

  it("RF-021 envía moneda e ítems al servidor con los importes como texto decimal", async () => {
    const u = nuevoUsuario();
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrarEmision(cuerpos));
    renderCotizaciones(enGestion);
    await screen.findByText("Mendoza");

    await u.click(screen.getByRole("radio", { name: "USD" }));
    await completarItem(u, 0, "Aéreo", "1500,50");
    await u.click(screen.getByRole("button", { name: /agregar ítem/i }));
    await completarItem(u, 1, "Alojamiento", "1700");
    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    const cuerpo = cuerpos[0] as { moneda: string; items: { concepto: string; precio: string }[] };
    expect(cuerpo.moneda).toBe("USD");
    expect(cuerpo.items).toHaveLength(2);
    expect(cuerpo.items[0]?.concepto).toBe("Aéreo");
    expect(cuerpo.items[0]?.precio).toMatch(/^\d+(\.\d{1,4})?$/);
    expect(Number(cuerpo.items[0]?.precio)).toBe(1500.5);
    expect(cuerpo.items[1]?.concepto).toBe("Alojamiento");
    expect(Number(cuerpo.items[1]?.precio)).toBe(1700);
  });

  it("RF-021 tras emitir confirma la cotización y la muestra como borrador", async () => {
    const u = nuevoUsuario();
    servidor.use(
      http.post("*/api/oportunidades/:id/cotizaciones", () =>
        HttpResponse.json(
          {
            ...cotizacionesMock[0],
            id: "2f8c1d4e-9a30-4b57-8e62-5d7a0c3b1f99",
            oportunidad_id: enGestion,
            moneda: "ARS",
            items: [{ concepto: "Aéreo", precio: "780000.00" }],
            total: "780000.00",
            fecha: "2026-10-25",
            validez_hasta: "2026-11-25",
            estado: "borrador",
          },
          { status: 201 },
        ),
      ),
    );
    renderCotizaciones(enGestion);
    await screen.findByText("Mendoza");

    await completarItem(u, 0, "Aéreo", "780000");
    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/cotización|documento/i);
    expect(screen.getByText(/borrador/i)).toBeInTheDocument();
  });

  it("RF-021 no envía nada si no hay al menos un ítem con concepto y precio", async () => {
    const u = nuevoUsuario();
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrarEmision(cuerpos));
    renderCotizaciones(enGestion);
    await screen.findByText("Mendoza");

    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-021 no envía un precio que no es un importe válido", async () => {
    const u = nuevoUsuario();
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrarEmision(cuerpos));
    renderCotizaciones(enGestion);
    await screen.findByText("Mendoza");

    await completarItem(u, 0, "Aéreo", "mucho");
    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-021 si el servidor responde 409 muestra su detail en un aviso legible", async () => {
    const u = nuevoUsuario();
    servidor.use(
      http.post("*/api/oportunidades/:id/cotizaciones", () =>
        problema(409, "No se cotiza una oportunidad perdida."),
      ),
    );
    renderCotizaciones(enGestion);
    await screen.findByText("Mendoza");

    await completarItem(u, 0, "Aéreo", "780000");
    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se cotiza una oportunidad perdida.",
    );
  });

  it("RF-021 sobre una oportunidad ganada no se muestra el formulario y sí las versiones", async () => {
    renderCotizaciones(idOportunidadMock.ganada);

    expect(await screen.findByRole("list", { name: /versiones/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generar documento/i })).not.toBeInTheDocument();
  });
});

describe("RF-024 versiones", () => {
  it("RF-024 lista las versiones de la más reciente a la más antigua, con su estado", async () => {
    renderCotizaciones(idOportunidadMock.cotizada);

    const lista = await screen.findByRole("list", { name: /versiones/i });
    const items = within(lista).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(/versión 2/i);
    expect(items[0]).toHaveTextContent(/enviada/i);
    expect(items[1]).toHaveTextContent(/versión 1/i);
    expect(items[1]).toHaveTextContent(/rechazada/i);
  });

  it("RF-024 cada versión muestra su fecha de emisión y su total", async () => {
    renderCotizaciones(idOportunidadMock.cotizada);

    const lista = await screen.findByRole("list", { name: /versiones/i });
    const [v2, v1] = within(lista).getAllByRole("listitem");
    expect(v2).toHaveTextContent("20/10/26");
    expect(v2).toHaveTextContent("$ 4.510.000,00");
    expect(v1).toHaveTextContent("12/10/26");
    expect(v1).toHaveTextContent("$ 4.800.000,00");
  });

  it("RF-024 una cotización en dólares muestra su total en US$", async () => {
    renderCotizaciones(idOportunidadMock.ganada);

    const lista = await screen.findByRole("list", { name: /versiones/i });
    const [unica] = within(lista).getAllByRole("listitem");
    expect(unica).toHaveTextContent(/aceptada/i);
    expect(unica).toHaveTextContent("US$ 3.200,00");
  });

  it("RF-024 si la oportunidad no tiene cotizaciones lo dice, sin lista de versiones", async () => {
    renderCotizaciones(enGestion);

    expect(
      await screen.findByText(/todavía no hay cotizaciones|sin cotizaciones/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /versiones/i })).not.toBeInTheDocument();
  });

  it("RF-024 si no se pueden cargar las versiones avisa", async () => {
    servidor.use(
      http.get("*/api/oportunidades/:id/cotizaciones", () => problema(500, "Error interno.")),
    );
    renderCotizaciones(enGestion);

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos cargar.*cotizaciones/i);
  });
});

describe("RF-022 vista del freelance (pantalla 41)", () => {
  it("RF-022 el freelance ve el formulario de emisión y puede emitir", async () => {
    const u = nuevoUsuario();
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrarEmision(cuerpos));
    renderCotizaciones(enGestion, freelanceResponsable);
    await screen.findByText("Mendoza");

    await completarItem(u, 0, "Aéreo", "780000");
    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
  });

  it("RF-022 si el freelance no puede emitir sobre esa oportunidad (403) muestra el detail", async () => {
    const u = nuevoUsuario();
    servidor.use(
      http.post("*/api/oportunidades/:id/cotizaciones", () =>
        problema(403, "Solo el responsable puede cotizar esta oportunidad."),
      ),
    );
    renderCotizaciones(enGestion, freelanceResponsable);
    await screen.findByText("Mendoza");

    await completarItem(u, 0, "Aéreo", "780000");
    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Solo el responsable puede cotizar esta oportunidad.",
    );
  });
});

describe("RF-022 quién puede emitir", () => {
  it("RF-022 un empleado que no es el responsable no ve el formulario, pero sí las versiones", async () => {
    const otro = { ...usuariosPorRol.empleado, id: "9c1d7e52-4b3a-4f60-8a21-5e0d3b7c9a10" };
    renderCotizaciones(idOportunidadMock.cotizada, otro);

    expect(await screen.findByRole("list", { name: /versiones/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generar documento/i })).not.toBeInTheDocument();
  });

  it("RF-022 una oportunidad perdida no ofrece el formulario", async () => {
    renderCotizaciones(idOportunidadMock.perdida);

    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generar documento/i })).not.toBeInTheDocument();
  });

  it("RF-024 si hay más versiones de las que se listan, avisa cuántas quedan", async () => {
    servidor.use(
      http.get("*/api/oportunidades/:id/cotizaciones", () =>
        HttpResponse.json({
          items: [cotizacionesMock[0]],
          total: 3,
          pagina: 1,
          por_pagina: 100,
        }),
      ),
    );
    renderCotizaciones(idOportunidadMock.cotizada);

    expect(await screen.findByText(/y 2 versiones anteriores/i)).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent(/versión 3/i);
  });
});
