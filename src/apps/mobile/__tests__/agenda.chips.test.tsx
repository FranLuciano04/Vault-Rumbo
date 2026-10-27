import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Slot } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AgendaMobile } from "../src/features/alertas/AgendaMobile";

jest.mock("../global.css", () => ({}));
jest.mock("../src/lib/firebase", () => ({ obtenerTokenId: jest.fn() }));

// MSW no carga bajo jest-expo (ver login.test.tsx): mismo adaptador HTTP falso que agenda.test.tsx.
type Config = { url?: string; method?: string; params?: Record<string, unknown> };
const mockHttp = jest.fn<Promise<unknown>, [Config]>();
jest.mock("../src/cliente", () => {
  const { crearCliente } = jest.requireActual<typeof import("@rumbo/shared")>("@rumbo/shared");
  const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => null });
  cliente.defaults.adapter = ((config: never) => mockHttp(config)) as never;
  return { cliente };
});

// Reloj fijo: «hoy» es 25/10/26, «ayer» 24/10/26.
const HOY = new Date("2026-10-25T12:00:00-03:00");
const HOY_ISO = "2026-10-25";
const AYER_ISO = "2026-10-24";

const ANA = { id: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03", nombre: "Ana Pérez" };
const sinContexto = { cliente: null, oportunidad: null, viaje: null, pago: null };

function alerta(id: string, descripcion: string, fecha: string) {
  return {
    id,
    tipo: "formulario",
    descripcion,
    fecha,
    estado: "pendiente",
    propietario_id: ANA.id,
    responsable: ANA,
    contexto: sinContexto,
    viaje_id: null,
    pago_id: null,
    oportunidad_id: null,
    cliente_id: null,
    viaje_hotel_id: null,
    resuelta_en: null,
    cerrada_por_cancelacion: false,
    created_by: null,
    updated_by: null,
    created_at: "2026-10-20T00:00:00Z",
    updated_at: "2026-10-20T00:00:00Z",
  };
}

const ATRASADA_1 = "Pedir la seña de Mendoza.";
const ATRASADA_2 = "Llamar a la Familia Gómez.";
const DE_HOY_1 = "Enviar el voucher del hotel de Salta.";
const DE_HOY_2 = "Confirmar los pasajes de Bariloche.";
const PROXIMA_1 = "Mandar el itinerario a Lucía.";
const PROXIMA_2 = "Cotizar el crucero de Marta.";
const PROXIMA_3 = "Renovar el pasaporte de Tomás.";

const ATRASADAS = [alerta("at-1", ATRASADA_1, "2026-10-23"), alerta("at-2", ATRASADA_2, AYER_ISO)];
const DE_HOY = [alerta("ho-1", DE_HOY_1, HOY_ISO), alerta("ho-2", DE_HOY_2, HOY_ISO)];
const PROXIMAS = [
  alerta("pr-1", PROXIMA_1, "2026-10-27"),
  alerta("pr-2", PROXIMA_2, "2026-10-28"),
  alerta("pr-3", PROXIMA_3, "2026-10-29"),
];

// Totales del servidor, a propósito distintos de lo cargado: los chips deben mostrar estos.
const TOTALES = { atrasadas: 37, hoy: 15, proximas: 9 };

function respuesta(status: number, data: unknown, config: unknown) {
  return Promise.resolve({ data, status, statusText: "", headers: {}, config });
}

/**
 * Backend falso con el contrato de `GET /api/alertas`: sin filtros, pendientes hasta hoy;
 * `hasta=ayer` atrasadas; `desde=hoy&hasta=hoy` las de hoy; `proximas=true` las posteriores a hoy.
 * `porPaginaServidor` limita el tamaño de página que devuelve el servidor.
 */
function backend(opciones: { porPaginaServidor?: number } = {}) {
  mockHttp.mockImplementation((config) => {
    const url = config.url ?? "";
    const p = config.params ?? {};
    if (url === "/api/auth/yo") {
      return respuesta(
        200,
        { ...ANA, email: "ana@rumbo.test", rol: "empleado", acceso_redes: false },
        config,
      );
    }
    if (url === "/api/alertas/progreso-del-dia") {
      return respuesta(200, { resueltas_hoy: 1, total_del_dia: 5 }, config);
    }
    if (url === "/api/alertas") {
      let items: unknown[];
      let total: number;
      if (p["estado"] === "vista") {
        items = [];
        total = 0;
      } else if (p["proximas"] === true || p["proximas"] === "true") {
        items = PROXIMAS;
        total = TOTALES.proximas;
      } else if (p["desde"] === HOY_ISO && p["hasta"] === HOY_ISO) {
        items = DE_HOY;
        total = TOTALES.hoy;
      } else if (p["hasta"] === AYER_ISO && !p["desde"]) {
        items = ATRASADAS;
        total = TOTALES.atrasadas;
      } else {
        items = [...ATRASADAS, ...DE_HOY];
        total = TOTALES.atrasadas + TOTALES.hoy;
      }
      const pagina = Number(p["pagina"] ?? 1);
      const pedida = Number(p["por_pagina"] ?? 20);
      const porPagina = opciones.porPaginaServidor ?? pedida;
      return respuesta(
        200,
        {
          items: items.slice((pagina - 1) * porPagina, pagina * porPagina),
          total,
          pagina,
          por_pagina: porPagina,
        },
        config,
      );
    }
    return respuesta(404, {}, config);
  });
}

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Raiz() {
  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}

function renderAgenda(url = "/") {
  queryClient.clear();
  return renderRouter({ _layout: Raiz, index: AgendaMobile }, { initialUrl: url });
}

type Vista = Awaited<ReturnType<typeof renderAgenda>>;

const esProximas = (p: Record<string, unknown>) => p["proximas"] === true || p["proximas"] === "true";

/** Pedidos de lista (los de totales traen `por_pagina=1`) que cumplen el filtro. */
function pedidosDeLista(filtro: (params: Record<string, unknown>) => boolean) {
  return mockHttp.mock.calls
    .map(([c]) => c)
    .filter((c) => c.url === "/api/alertas" && c.params?.["estado"] !== "vista")
    .map((c) => c.params ?? {})
    .filter((params) => Number(params["por_pagina"]) > 1 && filtro(params));
}

// Nombre accesible de cada chip: «<Nombre>: <total del servidor>». «Todas» = atrasadas + de hoy.
const NOMBRES = {
  todas: "Todas: 52",
  atrasadas: "Atrasadas: 37",
  hoy: "Hoy: 15",
  proximas: "Próximas: 9",
};

async function esperarChips(vista: Vista) {
  await vista.findByRole("tab", { name: NOMBRES.proximas });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({
    now: HOY,
    doNotFake: ["nextTick", "queueMicrotask", "setImmediate", "clearImmediate"],
  });
});
afterEach(() => {
  jest.useRealTimers();
});

describe("RF-154 chips de la agenda mobile", () => {
  it("RF-154 hay cuatro chips «Todas», «Atrasadas», «Hoy» y «Próximas» dentro de un grupo «Alertas»", async () => {
    backend();
    const vista = await renderAgenda();
    await esperarChips(vista);

    expect(vista.getByRole("tablist", { name: "Alertas" })).toBeTruthy();
    expect(vista.getAllByRole("tab")).toHaveLength(4);
    for (const nombre of Object.values(NOMBRES)) {
      expect(vista.getByRole("tab", { name: nombre })).toBeTruthy();
    }
  });

  it("RF-154 cada chip anuncia su nombre con el total del servidor, no lo cargado", async () => {
    backend();
    const vista = await renderAgenda();
    await esperarChips(vista);

    // 52 = 37 atrasadas + 15 de hoy; la lista cargada tiene solo 2 y 2.
    expect(vista.getByRole("tab", { name: "Todas: 52" })).toBeTruthy();
    expect(vista.getByRole("tab", { name: "Atrasadas: 37" })).toBeTruthy();
    expect(vista.getByRole("tab", { name: "Hoy: 15" })).toBeTruthy();
    expect(vista.getByRole("tab", { name: "Próximas: 9" })).toBeTruthy();
  });

  it("RF-154 los totales se piden con un pedido de una alerta por rango: hasta=ayer, desde=hoy&hasta=hoy y proximas=true", async () => {
    backend();
    const vista = await renderAgenda();
    await esperarChips(vista);

    const totales = mockHttp.mock.calls
      .map(([c]) => c)
      .filter((c) => c.url === "/api/alertas" && Number(c.params?.["por_pagina"]) === 1)
      .map((c) => c.params ?? {})
      .filter((p) => p["estado"] !== "vista");
    expect(totales.some((p) => p["hasta"] === AYER_ISO && !p["desde"] && !esProximas(p))).toBe(
      true,
    );
    expect(
      totales.some((p) => p["desde"] === HOY_ISO && p["hasta"] === HOY_ISO && !esProximas(p)),
    ).toBe(true);
    expect(totales.some(esProximas)).toBe(true);
  });

  it("RF-154 «Todas» arranca seleccionado y es el único seleccionado", async () => {
    backend();
    const vista = await renderAgenda();
    await esperarChips(vista);

    expect(vista.getByRole("tab", { name: NOMBRES.todas, selected: true })).toBeTruthy();
    expect(vista.getByRole("tab", { name: NOMBRES.atrasadas, selected: false })).toBeTruthy();
    expect(vista.getByRole("tab", { name: NOMBRES.hoy, selected: false })).toBeTruthy();
    expect(vista.getByRole("tab", { name: NOMBRES.proximas, selected: false })).toBeTruthy();
    expect(vista.getAllByRole("tab", { selected: true })).toHaveLength(1);
  });

  it("RF-154 «Todas» lista las atrasadas y las de hoy, sin las próximas", async () => {
    backend();
    const vista = await renderAgenda();
    await vista.findByText(DE_HOY_1);

    expect(vista.getByText(ATRASADA_1)).toBeTruthy();
    expect(vista.getByText(DE_HOY_2)).toBeTruthy();
    expect(vista.queryByText(PROXIMA_1)).toBeNull();
  });

  it("RF-154 «Atrasadas» pide hasta=ayer, lista solo las atrasadas y queda seleccionado", async () => {
    backend();
    const vista = await renderAgenda();
    await esperarChips(vista);

    await fireEvent.press(vista.getByRole("tab", { name: NOMBRES.atrasadas }));

    await waitFor(() => {
      expect(vista.getByRole("tab", { name: NOMBRES.atrasadas, selected: true })).toBeTruthy();
    });
    await vista.findByText(ATRASADA_1);
    expect(vista.getByText(ATRASADA_2)).toBeTruthy();
    expect(vista.queryByText(DE_HOY_1)).toBeNull();
    expect(vista.queryByText(PROXIMA_1)).toBeNull();
    expect(
      pedidosDeLista((p) => p["hasta"] === AYER_ISO && !p["desde"] && !esProximas(p)).length,
    ).toBeGreaterThan(0);
  });

  it("RF-154 «Hoy» pide desde=hoy y hasta=hoy y lista solo las de hoy", async () => {
    backend();
    const vista = await renderAgenda();
    await esperarChips(vista);

    await fireEvent.press(vista.getByRole("tab", { name: NOMBRES.hoy }));

    await waitFor(() => {
      expect(vista.getByRole("tab", { name: NOMBRES.hoy, selected: true })).toBeTruthy();
    });
    await vista.findByText(DE_HOY_1);
    expect(vista.getByText(DE_HOY_2)).toBeTruthy();
    expect(vista.queryByText(ATRASADA_1)).toBeNull();
    expect(vista.queryByText(PROXIMA_1)).toBeNull();
    expect(
      pedidosDeLista((p) => p["desde"] === HOY_ISO && p["hasta"] === HOY_ISO && !esProximas(p))
        .length,
    ).toBeGreaterThan(0);
  });

  it("RF-154 «Próximas» pide proximas=true y lista las posteriores a hoy", async () => {
    backend();
    const vista = await renderAgenda();
    await esperarChips(vista);

    await fireEvent.press(vista.getByRole("tab", { name: NOMBRES.proximas }));

    await waitFor(() => {
      expect(vista.getByRole("tab", { name: NOMBRES.proximas, selected: true })).toBeTruthy();
    });
    await vista.findByText(PROXIMA_1);
    expect(vista.getByText(PROXIMA_2)).toBeTruthy();
    expect(vista.queryByText(ATRASADA_1)).toBeNull();
    expect(vista.queryByText(DE_HOY_1)).toBeNull();
    expect(pedidosDeLista(esProximas).length).toBeGreaterThan(0);
  });

  it("RF-154 en «Próximas» las alertas no se rotulan como atrasadas ni «Hoy»", async () => {
    backend();
    const vista = await renderAgenda();
    await esperarChips(vista);

    await fireEvent.press(vista.getByRole("tab", { name: NOMBRES.proximas }));
    await vista.findByText(PROXIMA_1);

    expect(vista.queryByRole("header", { name: /^Atrasadas/ })).toBeNull();
    expect(vista.queryByRole("header", { name: /^Hoy/ })).toBeNull();
    expect(vista.queryByText(/^Hace \d+ días?$/)).toBeNull();
  });

  it("RF-154 «Próximas» sigue con la paginación: «Mostrando N de total» y «Ver más» pide la página 2 con proximas=true", async () => {
    backend({ porPaginaServidor: 2 });
    const vista = await renderAgenda();
    await esperarChips(vista);

    await fireEvent.press(vista.getByRole("tab", { name: NOMBRES.proximas }));
    await vista.findByText(PROXIMA_1);

    expect(vista.getByText("Mostrando 2 de 9 alertas")).toBeTruthy();
    expect(vista.queryByText(PROXIMA_3)).toBeNull();

    await fireEvent.press(vista.getByRole("button", { name: "Ver más alertas" }));

    await vista.findByText(PROXIMA_3);
    expect(pedidosDeLista((p) => esProximas(p) && Number(p["pagina"]) === 2)).toHaveLength(1);
  });

  it("RF-154 volver a «Todas» muestra de nuevo atrasadas y de hoy", async () => {
    backend();
    const vista = await renderAgenda();
    await esperarChips(vista);
    await fireEvent.press(vista.getByRole("tab", { name: NOMBRES.proximas }));
    await vista.findByText(PROXIMA_1);

    await fireEvent.press(vista.getByRole("tab", { name: NOMBRES.todas }));

    await vista.findByText(ATRASADA_1);
    expect(vista.getByText(DE_HOY_1)).toBeTruthy();
    expect(vista.queryByText(PROXIMA_1)).toBeNull();
    expect(vista.getByRole("tab", { name: NOMBRES.todas, selected: true })).toBeTruthy();
  });

  it("RF-154 los chips conviven con el aviso «Recordatorio creado» de T-059", async () => {
    backend();
    const vista = await renderAgenda("/?recordatorio=2026-10-28");

    expect(await vista.findByText("Recordatorio creado para el 28/10/26")).toBeTruthy();
    await esperarChips(vista);
    expect(vista.getByRole("status")).toBeTruthy();
  });
});
