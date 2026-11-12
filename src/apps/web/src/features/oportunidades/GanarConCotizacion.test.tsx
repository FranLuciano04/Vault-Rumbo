/**
 * T-178: ganar eligiendo la cotización que aceptó el cliente, o la venta directa (CU-05, RF-016, DEC-0028).
 *
 * Contrato para el implementador:
 * - El `role="group"` «Ganar la oportunidad» (detalle y embudo) lista como `radio` las cotizaciones
 *   elegibles (`borrador` o `enviada`) de la oportunidad, con fecha, total, moneda y conceptos en el
 *   nombre accesible, y un `radio` «Sin cotización (venta directa)».
 * - Si hay elegibles, «Confirmar» no manda nada hasta elegir una opción (deshabilitado o sin efecto).
 * - Si no hay ninguna, solo existe la venta directa y se puede confirmar directamente.
 * - Cotización elegida: POST /ganar con `{ cotizacion_id }`. Venta directa: sin `cotizacion_id`.
 */
import { crearCliente, formatearFecha } from "@rumbo/shared";
import {
  cotizacionesMock,
  crearServidor,
  idCotizacionMock,
  idOportunidadMock,
  manejadoresAlertas,
  manejadoresOportunidades,
  oportunidadesMock,
  usuariosPorRol,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { DetalleOportunidad } from "./DetalleOportunidad";
import { PaginaOportunidades } from "./PaginaOportunidades";

const servidor = crearServidor(...manejadoresOportunidades, ...manejadoresAlertas);
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
const cotizada = idOportunidadMock.cotizada;
const sinCotizaciones = idOportunidadMock.en_gestion;
const europaV2 = cotizacionesMock.find((c) => c.id === idCotizacionMock.europa_v2);
if (!europaV2) throw new Error("Falta la cotización de Europa en el mock");
const fechaEuropaV2 = new RegExp(formatearFecha(europaV2.fecha));

const problema = (status: number, detail: string) =>
  HttpResponse.json(
    { type: "about:blank", title: "Error", status, detail },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );

/** Registra los cuerpos de los POST /ganar y deja seguir con el handler del mock. */
function registrarGanar(cuerpos: Record<string, unknown>[]) {
  return http.post("*/api/oportunidades/:id/ganar", async ({ request }) => {
    const texto = await request.clone().text();
    cuerpos.push(texto ? (JSON.parse(texto) as Record<string, unknown>) : {});
    return undefined;
  });
}

/** La oportunidad «cotizada» con dos alternativas elegibles: una enviada y un borrador. */
function conDosAlternativas() {
  const borrador = {
    ...europaV2,
    id: idCotizacionMock.europa_v1,
    estado: "borrador" as const,
    fecha: "2026-10-10",
    total: "4800000.00",
    items: [{ concepto: "Paquete Italia", precio: "4800000.00" }],
  };
  return http.get("*/api/oportunidades/:id/cotizaciones", () =>
    HttpResponse.json({ items: [europaV2, borrador], total: 2, pagina: 1, por_pagina: 100 }),
  );
}

function renderDetalle(id: string) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/oportunidades/${id}`]}>
        <Routes>
          <Route
            path="/oportunidades/:id"
            element={<DetalleOportunidad cliente={cliente} usuario={usuariosPorRol.empleado} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function abrirGanarEnDetalle(id: string, destino: RegExp) {
  const usuario = userEvent.setup();
  renderDetalle(id);
  await screen.findByRole("heading", { name: destino });
  await usuario.click(screen.getByRole("button", { name: /^ganar/i }));
  const grupo = await screen.findByRole("group", { name: "Ganar la oportunidad" });
  return { usuario, grupo };
}

const ventaDirecta = (grupo: HTMLElement) =>
  within(grupo).getByRole("radio", { name: /sin cotización \(venta directa\)/i });

describe("RF-016 ganar eligiendo la cotización", () => {
  it("RF-016 lista solo las cotizaciones elegibles con fecha, total, moneda y conceptos, y la venta directa", async () => {
    const { grupo } = await abrirGanarEnDetalle(cotizada, /europa/i);

    const opcion = await within(grupo).findByRole("radio", { name: fechaEuropaV2 });
    // 2.100.000 + 2.160.000 + 250.000 (formato es-AR, con la moneda).
    expect(opcion).toHaveAccessibleName(/4\.510\.000/);
    expect(opcion).toHaveAccessibleName(/ARS|\$/);
    expect(opcion).toHaveAccessibleName(/Aéreo Buenos Aires - Madrid/);
    expect(opcion).toHaveAccessibleName(/Alojamiento 18 noches/);
    expect(opcion).toHaveAccessibleName(/Traslados y excursiones/);
    expect(ventaDirecta(grupo)).toBeInTheDocument();
    // La primera cotización está rechazada: no se puede elegir.
    expect(within(grupo).getAllByRole("radio")).toHaveLength(2);
  });

  it("RF-016 con cotizaciones elegibles no se puede confirmar sin elegir una opción", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrarGanar(cuerpos));
    const { usuario, grupo } = await abrirGanarEnDetalle(cotizada, /europa/i);
    await within(grupo).findAllByRole("radio");

    await usuario.click(within(grupo).getByRole("button", { name: "Confirmar" }));

    expect(cuerpos).toEqual([]);
  });

  it("RF-016 elegir una cotización manda POST /ganar con su cotizacion_id", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(conDosAlternativas(), registrarGanar(cuerpos));
    const { usuario, grupo } = await abrirGanarEnDetalle(cotizada, /europa/i);

    await usuario.click(await within(grupo).findByRole("radio", { name: /Paquete Italia/ }));
    await usuario.click(within(grupo).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(cuerpos).toEqual([{ cotizacion_id: idCotizacionMock.europa_v1 }]);
    });
  });

  it("RF-016 con dos alternativas elegibles se ofrecen las dos, no solo la última", async () => {
    servidor.use(conDosAlternativas());
    const { grupo } = await abrirGanarEnDetalle(cotizada, /europa/i);

    await within(grupo).findByRole("radio", { name: /Paquete Italia/ });
    expect(within(grupo).getByRole("radio", { name: fechaEuropaV2 })).toBeInTheDocument();
    expect(within(grupo).getAllByRole("radio")).toHaveLength(3);
  });

  it("RF-016 la venta directa manda POST /ganar sin cotizacion_id", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrarGanar(cuerpos));
    const { usuario, grupo } = await abrirGanarEnDetalle(cotizada, /europa/i);
    await within(grupo).findAllByRole("radio");

    await usuario.click(ventaDirecta(grupo));
    await usuario.click(within(grupo).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).not.toHaveProperty("cotizacion_id");
  });

  it("RF-016 una oportunidad sin cotizaciones ofrece solo la venta directa y se confirma sin elegir", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrarGanar(cuerpos));
    const { usuario, grupo } = await abrirGanarEnDetalle(sinCotizaciones, /mendoza/i);

    expect(await within(grupo).findByRole("radio", { name: /venta directa/i })).toBeInTheDocument();
    expect(within(grupo).getAllByRole("radio")).toHaveLength(1);
    await usuario.click(within(grupo).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).not.toHaveProperty("cotizacion_id");
  });

  it.each([
    [409, "No se puede elegir una cotización vencida."],
    [422, "La cotización no pertenece a la oportunidad."],
  ])("RF-016 un %s al ganar muestra el detail de la API", async (estado, detail) => {
    servidor.use(http.post("*/api/oportunidades/:id/ganar", () => problema(estado, detail)));
    const { usuario, grupo } = await abrirGanarEnDetalle(cotizada, /europa/i);

    await usuario.click(await within(grupo).findByRole("radio", { name: fechaEuropaV2 }));
    await usuario.click(within(grupo).getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(detail);
  });
});

describe("RF-016 ganar eligiendo la cotización: arrastre al embudo", () => {
  const asesores = [{ id: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03", nombre: "Ana Pérez" }];

  function renderEmbudo() {
    servidor.use(
      http.get("*/api/usuarios/asesores", () => HttpResponse.json(asesores)),
      http.get("*/api/oportunidades", ({ request }) => {
        const estado = new URL(request.url).searchParams.get("estado");
        const items = oportunidadesMock.filter((o) => !estado || o.estado === estado);
        return HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 20 });
      }),
    );
    return render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={["/oportunidades"]}>
          <PaginaOportunidades cliente={cliente} usuario={usuariosPorRol.empleado} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("RF-016 mover a Ganada abre el mismo selector y confirma con la cotización elegida", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrarGanar(cuerpos));
    const usuario = userEvent.setup();
    renderEmbudo();
    const encabezado = await screen.findByRole("heading", { name: /^Cotizada\b/ });
    const columna = encabezado.closest("section") as HTMLElement;
    const li = (await within(columna).findByText("Europa")).closest("li") as HTMLElement;
    await usuario.click(within(li).getByRole("button", { name: /^mover/i }));
    await usuario.click(screen.getByRole("menuitem", { name: "Ganada" }));

    const grupo = await screen.findByRole("group", { name: "Ganar la oportunidad" });
    expect(await within(grupo).findAllByRole("radio")).toHaveLength(2);
    expect(ventaDirecta(grupo)).toBeInTheDocument();
    expect(cuerpos).toEqual([]);

    await usuario.click(within(grupo).getByRole("radio", { name: fechaEuropaV2 }));
    await usuario.click(within(grupo).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(cuerpos).toEqual([{ cotizacion_id: idCotizacionMock.europa_v2 }]);
    });
  });
});

describe("RF-016 ganar eligiendo la cotización: hallazgos de la review", () => {
  const listado = (items: unknown[]) =>
    http.get("*/api/oportunidades/:id/cotizaciones", () =>
      HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 100 }),
    );

  it("RF-016 con una cotización ya aceptada se gana con ella: sin otras opciones y el POST va sin cuerpo", async () => {
    const aceptada = {
      ...europaV2,
      id: idCotizacionMock.europa_v1,
      estado: "aceptada" as const,
      fecha: "2026-10-10",
      total: "4800000.00",
      items: [{ concepto: "Paquete Italia", precio: "4800000.00" }],
    };
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(listado([europaV2, aceptada]), registrarGanar(cuerpos));
    const { usuario, grupo } = await abrirGanarEnDetalle(cotizada, /europa/i);

    expect(
      await within(grupo).findByText(/se gana con la cotización aceptada/i),
    ).toBeInTheDocument();
    expect(within(grupo).getByText(/10\/10\/26/)).toBeInTheDocument();
    expect(within(grupo).getByText(/4\.800\.000/)).toBeInTheDocument();
    expect(within(grupo).queryByRole("radio", { name: /venta directa/i })).not.toBeInTheDocument();
    expect(within(grupo).queryByRole("radio", { name: fechaEuropaV2 })).not.toBeInTheDocument();

    await usuario.click(within(grupo).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).not.toHaveProperty("cotizacion_id");
  });

  it("RF-016 si falla el listado de cotizaciones se ofrece la venta directa y «Reintentar»", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(
      http.get("*/api/oportunidades/:id/cotizaciones", () => problema(500, "Error interno.")),
      registrarGanar(cuerpos),
    );
    const { usuario, grupo } = await abrirGanarEnDetalle(cotizada, /europa/i);

    expect(await within(grupo).findByRole("button", { name: /reintentar/i })).toBeInTheDocument();
    await usuario.click(ventaDirecta(grupo));
    await usuario.click(within(grupo).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).not.toHaveProperty("cotizacion_id");
  });

  it("RF-016 una cotización enviada con la validez vencida no es una opción elegible (DEC-0028)", async () => {
    const vencida = { ...europaV2, validez_hasta: "2020-01-01" };
    servidor.use(listado([vencida]));
    const { grupo } = await abrirGanarEnDetalle(cotizada, /europa/i);

    expect(await within(grupo).findByRole("radio", { name: /venta directa/i })).toBeInTheDocument();
    expect(within(grupo).getAllByRole("radio")).toHaveLength(1);
    expect(within(grupo).queryByRole("radio", { name: fechaEuropaV2 })).not.toBeInTheDocument();
  });
});
