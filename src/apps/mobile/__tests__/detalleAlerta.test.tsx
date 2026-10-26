import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Slot } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AgendaMobile } from "../src/features/alertas/AgendaMobile";
import { DetalleAlertaMobile } from "../src/features/alertas/DetalleAlertaMobile";

jest.mock("../global.css", () => ({}));
jest.mock("../src/lib/firebase", () => ({ obtenerTokenId: jest.fn() }));

// MSW no carga bajo jest-expo (ver login.test.tsx): se usa el cliente real de `@rumbo/shared`
// con un adaptador HTTP falso que responde las rutas de /api/alertas.
type Config = { url?: string; method?: string; data?: string; params?: Record<string, unknown> };
const mockHttp = jest.fn<Promise<unknown>, [Config]>();
jest.mock("../src/cliente", () => {
  const { crearCliente } = jest.requireActual<typeof import("@rumbo/shared")>("@rumbo/shared");
  const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => null });
  cliente.defaults.adapter = ((config: never) => mockHttp(config)) as never;
  return { cliente };
});

// Reloj fijo: «hoy» es 25/10/26. Las opciones de posponer salen de ahí (pantalla 54).
const HOY = new Date("2026-10-25T12:00:00-03:00");

const ANA = { id: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03", nombre: "Ana Pérez" };
const camila = { id: "cl-1", nombre: "Camila Benítez" };
const viajeCamila = {
  id: "vi-1",
  destino: "Punta Cana",
  estado: "finalizado",
  fecha_salida: "2026-09-01",
  fecha_regreso: "2026-09-15",
};
const pagoCamila = {
  id: "pa-1",
  tipo: "cuota",
  monto: "450000.00",
  moneda: "ARS",
  vencimiento: "2026-10-23",
  estado: "pendiente",
};
const sinContexto = { cliente: null, oportunidad: null, viaje: null, pago: null };

function alerta(id: string, tipo: string, descripcion: string, fecha: string, contexto: object) {
  return {
    id,
    tipo,
    descripcion,
    fecha,
    estado: "pendiente",
    propietario_id: ANA.id,
    responsable: ANA,
    contexto: { ...sinContexto, ...contexto },
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

const PAGO = "Cobrar la cuota 2 de 3 de Camila Benítez (Punta Cana).";
const FORMULARIO = "Pedir el pasaporte vigente: Roma exige 6 meses de validez.";
const RECORDATORIO = "Llamar a la aerolínea por el cambio de equipaje.";

const ID_PAGO = "al-1";
const ID_FORMULARIO = "al-3";
const ID_SUELTA = "al-9";

const ALERTAS = [
  alerta(ID_PAGO, "pago", PAGO, "2026-10-23", {
    cliente: camila,
    viaje: viajeCamila,
    pago: pagoCamila,
  }),
  alerta(ID_FORMULARIO, "formulario", FORMULARIO, "2026-10-25", {
    cliente: camila,
    viaje: viajeCamila,
  }),
  // Recordatorio manual sin ningún origen: no tiene ficha de cliente a la que ir.
  alerta(ID_SUELTA, "manual", RECORDATORIO, "2026-10-25", {}),
];

function respuesta(status: number, data: unknown, config: unknown) {
  const response = { data, status, statusText: "", headers: {}, config };
  return status < 400
    ? Promise.resolve(response)
    : Promise.reject(Object.assign(new Error("fallo"), { isAxiosError: true, config, response }));
}

/** Backend falso: posponer cambia la fecha; la agenda solo trae las alertas hasta hoy. */
function backend(opciones: { rechazarPosponer?: { status: number; detalle: string } } = {}) {
  const alertas = ALERTAS.map((a) => ({ ...a })) as (ReturnType<typeof alerta> & { fecha: string })[];
  mockHttp.mockImplementation((config) => {
    const url = config.url ?? "";
    if (url === "/api/auth/yo") {
      return respuesta(
        200,
        { ...ANA, email: "ana@rumbo.test", rol: "empleado", acceso_redes: false },
        config,
      );
    }
    if (url === "/api/alertas/progreso-del-dia") {
      return respuesta(200, { resueltas_hoy: 0, total_del_dia: alertas.length }, config);
    }
    const posponer = /^\/api\/alertas\/([^/]+)\/posponer$/.exec(url);
    if (posponer && config.method === "post") {
      if (opciones.rechazarPosponer) {
        const { status, detalle } = opciones.rechazarPosponer;
        return respuesta(
          status,
          { type: "about:blank", title: "Error", status, detail: detalle },
          config,
        );
      }
      const encontrada = alertas.find((a) => a.id === posponer[1]);
      if (!encontrada) return respuesta(404, {}, config);
      encontrada.fecha = (JSON.parse(config.data ?? "{}") as { fecha: string }).fecha;
      return respuesta(200, encontrada, config);
    }
    const una = /^\/api\/alertas\/([^/]+)$/.exec(url);
    if (una && !["progreso-del-dia"].includes(una[1] as string)) {
      const encontrada = alertas.find((a) => a.id === una[1]);
      return encontrada ? respuesta(200, encontrada, config) : respuesta(404, {}, config);
    }
    if (url === "/api/alertas" && config.params?.["estado"] === "vista") {
      return respuesta(200, { items: [], total: 0, pagina: 1, por_pagina: 1 }, config);
    }
    if (url === "/api/alertas") {
      const vigentes = alertas.filter((a) => a.fecha <= "2026-10-25");
      return respuesta(
        200,
        { items: vigentes, total: vigentes.length, pagina: 1, por_pagina: 20 },
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

function FichaFalsa() {
  return null;
}

/** Rutas: agenda en `/`, detalle en `/alertas/[id]` y la ficha del cliente en `/clientes/[id]`. */
function renderApp(initialUrl = "/") {
  queryClient.clear();
  return renderRouter(
    {
      _layout: Raiz,
      index: AgendaMobile,
      "alertas/[id]": DetalleAlertaMobile,
      "clientes/[id]": FichaFalsa,
    },
    { initialUrl },
  );
}

function llamadasPosponer() {
  return mockHttp.mock.calls
    .map(([c]) => c)
    .filter((c) => c.method === "post" && /\/posponer$/.test(c.url ?? ""));
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

describe("RF-075 detalle", () => {
  it("al tocar una alerta de la agenda se abre su detalle", async () => {
    backend();
    const vista = await renderApp("/");

    await fireEvent.press(await vista.findByText(FORMULARIO));

    await waitFor(() => {
      expect(vista).toHavePathname(`/alertas/${ID_FORMULARIO}`);
    });
    expect(await vista.findByText(FORMULARIO)).toBeTruthy();
  });

  it("muestra el tipo, la descripción y el contexto del origen: viaje y cliente", async () => {
    backend();
    const vista = await renderApp(`/alertas/${ID_PAGO}`);

    await vista.findByText(PAGO);
    expect(vista.getByText("Pago")).toBeTruthy();
    expect(vista.getByText(/Punta Cana/)).toBeTruthy();
    expect(vista.getByText(/Camila Benítez/)).toBeTruthy();
  });

  it("una alerta atrasada indica hace cuántos días venció", async () => {
    backend();
    const vista = await renderApp(`/alertas/${ID_PAGO}`);

    await vista.findByText(PAGO);
    expect(vista.getByText("Hace 2 días")).toBeTruthy();
  });

  it("pide la alerta por su id", async () => {
    backend();
    const vista = await renderApp(`/alertas/${ID_FORMULARIO}`);
    await vista.findByText(FORMULARIO);

    const pedidos = mockHttp.mock.calls.map(([c]) => c.url);
    expect(pedidos).toContain(`/api/alertas/${ID_FORMULARIO}`);
  });

  it("«Ver cliente» abre la ficha del cliente de la alerta", async () => {
    backend();
    const vista = await renderApp(`/alertas/${ID_FORMULARIO}`);
    await vista.findByText(FORMULARIO);

    await fireEvent.press(vista.getByRole("button", { name: /ver cliente/i }));

    await waitFor(() => {
      expect(vista).toHavePathname("/clientes/cl-1");
    });
  });

  it("un recordatorio sin cliente no ofrece «Ver cliente»", async () => {
    backend();
    const vista = await renderApp(`/alertas/${ID_SUELTA}`);

    await vista.findByText(RECORDATORIO);
    expect(vista.queryByRole("button", { name: /ver cliente/i })).toBeNull();
  });

  it("mientras carga muestra un indicador de carga", async () => {
    mockHttp.mockImplementation(() => new Promise(() => undefined));
    const vista = await renderApp(`/alertas/${ID_PAGO}`);

    expect(vista.getByLabelText(/cargando/i)).toBeTruthy();
  });

  it("si la alerta no existe avisa con un error accesible", async () => {
    backend();
    const vista = await renderApp("/alertas/no-existe");

    await vista.findByRole("alert");
    expect(vista.getByText(/no encontramos la alerta|no pudimos cargar/i)).toBeTruthy();
  });
});

describe("RF-077 posponer mobile", () => {
  const abrirPosponer = async (id: string) => {
    const vista = await renderApp(`/alertas/${id}`);
    await vista.findByRole("button", { name: /posponer/i });
    await fireEvent.press(vista.getByRole("button", { name: /posponer/i }));
    return vista;
  };

  it("«Posponer» ofrece solo fechas futuras: mañana, en 3 días y en una semana", async () => {
    backend();
    const vista = await abrirPosponer(ID_FORMULARIO);

    expect(await vista.findByText("Posponer alerta")).toBeTruthy();
    expect(vista.getByRole("button", { name: "Mañana · 26/10/26" })).toBeTruthy();
    expect(vista.getByRole("button", { name: "En 3 días · 28/10/26" })).toBeTruthy();
    expect(vista.getByRole("button", { name: "En una semana · 01/11/26" })).toBeTruthy();
    expect(vista.queryByText(/25\/10\/26/)).toBeNull();
  });

  it("elegir una fecha hace un único POST /posponer con esa fecha", async () => {
    backend();
    const vista = await abrirPosponer(ID_FORMULARIO);

    await fireEvent.press(await vista.findByRole("button", { name: "En 3 días · 28/10/26" }));

    await waitFor(() => {
      expect(llamadasPosponer()).toHaveLength(1);
    });
    const [llamada] = llamadasPosponer();
    expect(llamada?.url).toBe(`/api/alertas/${ID_FORMULARIO}/posponer`);
    expect(JSON.parse(llamada?.data ?? "{}")).toEqual({ fecha: "2026-10-28" });
  });

  it("al posponer vuelve a la agenda, que ya no muestra la alerta", async () => {
    backend();
    const vista = await abrirPosponer(ID_FORMULARIO);

    await fireEvent.press(await vista.findByRole("button", { name: "Mañana · 26/10/26" }));

    await waitFor(() => {
      expect(vista).toHavePathname("/");
    });
    await vista.findByText(PAGO);
    await waitFor(() => {
      expect(vista.queryByText(FORMULARIO)).toBeNull();
    });
  });

  it("«Cancelar» cierra el selector sin enviar nada", async () => {
    backend();
    const vista = await abrirPosponer(ID_FORMULARIO);

    await fireEvent.press(await vista.findByRole("button", { name: /cancelar/i }));

    expect(vista.queryByText("Posponer alerta")).toBeNull();
    expect(llamadasPosponer()).toHaveLength(0);
    expect(vista).toHavePathname(`/alertas/${ID_FORMULARIO}`);
  });

  it("si el servidor rechaza la fecha muestra el motivo y se queda en el detalle", async () => {
    const motivo = "La nueva fecha debe ser posterior a la actual.";
    backend({ rechazarPosponer: { status: 422, detalle: motivo } });
    const vista = await abrirPosponer(ID_FORMULARIO);

    await fireEvent.press(await vista.findByRole("button", { name: "Mañana · 26/10/26" }));

    await vista.findByText(motivo);
    expect(vista.getByRole("alert")).toBeTruthy();
    expect(vista).toHavePathname(`/alertas/${ID_FORMULARIO}`);
  });
});
