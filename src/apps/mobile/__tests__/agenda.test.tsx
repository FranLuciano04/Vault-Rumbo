import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Slot } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AgendaMobile } from "../src/features/alertas/AgendaMobile";

jest.mock("../global.css", () => ({}));
jest.mock("../src/lib/firebase", () => ({ obtenerTokenId: jest.fn() }));

// MSW no carga bajo jest-expo (ver login.test.tsx): se usa el cliente real de `@rumbo/shared`
// con un adaptador HTTP falso que responde las rutas de /api/alertas.
type Config = { url?: string; method?: string; params?: Record<string, unknown> };
const mockHttp = jest.fn<Promise<unknown>, [Config]>();
jest.mock("../src/cliente", () => {
  const { crearCliente } = jest.requireActual<typeof import("@rumbo/shared")>("@rumbo/shared");
  const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => null });
  cliente.defaults.adapter = ((config: never) => mockHttp(config)) as never;
  return { cliente };
});

// Reloj fijo: el «hoy» de la agenda es 25/10/26 (las alertas atrasadas dependen de él).
const HOY = new Date("2026-10-25T12:00:00-03:00");
const ESPERA_DESHACER_MS = 5_000;

const ANA = { id: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03", nombre: "Ana Pérez" };
const camila = { id: "cl-1", nombre: "Camila Benítez" };
const joaquin = { id: "cl-2", nombre: "Joaquín Ramos" };
const sosa = { id: "cl-3", nombre: "Familia Sosa" };
const viajeCamila = {
  id: "vi-1",
  destino: "Punta Cana",
  estado: "finalizado",
  fecha_salida: "2026-09-01",
  fecha_regreso: "2026-09-15",
};
const viajeSosa = {
  id: "vi-2",
  destino: "Brasil",
  estado: "confirmado",
  fecha_salida: "2026-11-01",
  fecha_regreso: "2026-11-15",
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
const INSISTENCIA = "Insistir con la cotización a Joaquín Ramos (Europa).";
const FORMULARIO = "Pedir el pasaporte vigente: Roma exige 6 meses de validez.";
const VIAJE = "Hoy sale el viaje de la Familia Sosa: pasalo a «en curso».";
const ID_FORMULARIO = "al-3";

const ALERTAS = [
  alerta("al-1", "pago", PAGO, "2026-10-23", {
    cliente: camila,
    viaje: viajeCamila,
    pago: pagoCamila,
  }),
  alerta("al-2", "insistencia", INSISTENCIA, "2026-10-24", {
    cliente: joaquin,
    oportunidad: { id: "op-1", destino_consultado: "Europa", estado: "cotizada" },
  }),
  alerta(ID_FORMULARIO, "formulario", FORMULARIO, "2026-10-25", {
    cliente: camila,
    viaje: viajeCamila,
  }),
  alerta("al-4", "viaje", VIAJE, "2026-10-25", { cliente: sosa, viaje: viajeSosa }),
];

function respuesta(status: number, data: unknown, config: unknown) {
  const response = { data, status, statusText: "", headers: {}, config };
  return status < 400
    ? Promise.resolve(response)
    : Promise.reject(Object.assign(new Error("fallo"), { isAxiosError: true, config, response }));
}

function problema(status: number, titulo: string, detalle: string) {
  return { type: "about:blank", title: titulo, status, detail: detalle };
}

/** Backend falso: `pendientes` es la agenda; resolver una alerta la saca y suma al progreso. */
function backend(
  opciones: {
    alertas?: unknown[];
    resueltasInicial?: number;
    falla?: number;
    rechazarResolver?: { status: number; detalle: string };
  } = {},
) {
  const pendientes = [...(opciones.alertas ?? ALERTAS)] as { id: string }[];
  let resueltas = opciones.resueltasInicial ?? 1;
  const total = pendientes.length + resueltas;
  mockHttp.mockImplementation((config) => {
    const url = config.url ?? "";
    if (opciones.falla) return respuesta(opciones.falla, {}, config);
    if (url === "/api/alertas/progreso-del-dia") {
      return respuesta(200, { resueltas_hoy: resueltas, total_del_dia: total }, config);
    }
    const resolver = /^\/api\/alertas\/([^/]+)\/resolver$/.exec(url);
    if (resolver && config.method === "post") {
      const id = resolver[1] as string;
      if (opciones.rechazarResolver) {
        const { status, detalle } = opciones.rechazarResolver;
        return respuesta(status, problema(status, "Conflicto", detalle), config);
      }
      const indice = pendientes.findIndex((a) => a.id === id);
      if (indice >= 0) {
        pendientes.splice(indice, 1);
        resueltas += 1;
      }
      return respuesta(200, { id, estado: "resuelta" }, config);
    }
    if (url === "/api/alertas") {
      return respuesta(
        200,
        { items: pendientes, total: pendientes.length, pagina: 1, por_pagina: 20 },
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

function renderAgenda() {
  queryClient.clear();
  return renderRouter({ _layout: Raiz, index: AgendaMobile }, { initialUrl: "/" });
}

function llamadasLista() {
  return mockHttp.mock.calls.map(([c]) => c).filter((c) => c.url === "/api/alertas");
}
function llamadasResolver(id?: string) {
  return mockHttp.mock.calls
    .map(([c]) => c)
    .filter(
      (c) =>
        c.method === "post" &&
        (id ? c.url === `/api/alertas/${id}/resolver` : /\/resolver$/.test(c.url ?? "")),
    );
}

beforeEach(() => {
  jest.clearAllMocks();
  // Solo se simulan los temporizadores y la fecha; las promesas siguen reales.
  jest.useFakeTimers({
    now: HOY,
    doNotFake: ["nextTick", "queueMicrotask", "setImmediate", "clearImmediate"],
  });
});
afterEach(() => {
  jest.useRealTimers();
});

describe("RF-074 agenda mobile", () => {
  it("lista las alertas pendientes con su descripción", async () => {
    backend();
    const vista = await renderAgenda();

    for (const descripcion of [PAGO, INSISTENCIA, FORMULARIO, VIAJE]) {
      expect(await vista.findByText(descripcion)).toBeTruthy();
    }
  });

  it("pide la agenda por defecto, sin filtros propios (el alcance por rol lo resuelve el backend)", async () => {
    backend();
    const vista = await renderAgenda();
    await vista.findByText(PAGO);

    const params = llamadasLista()[0]?.params ?? {};
    expect(params).not.toHaveProperty("propietario_id");
    expect(params).not.toHaveProperty("estado");
  });

  it("cada alerta muestra su tipo con la etiqueta compartida", async () => {
    backend();
    const vista = await renderAgenda();
    await vista.findByText(PAGO);

    expect(vista.getByText("Pago")).toBeTruthy();
    expect(vista.getByText("Insistencia")).toBeTruthy();
    expect(vista.getByText("Formulario")).toBeTruthy();
    expect(vista.getByText("Viaje")).toBeTruthy();
  });

  it("la línea de contexto muestra viaje, cliente y el pago con su importe y vencimiento", async () => {
    backend();
    const vista = await renderAgenda();
    await vista.findByText(PAGO);

    const contexto = vista.getByText(/^Viaje: Punta Cana · Camila Benítez · /);
    expect(contexto).toHaveTextContent(/\$ 450\.000,00 · vence 23\/10\/26/);
    expect(vista.getByText(/^Oportunidad: Europa · Joaquín Ramos/)).toBeTruthy();
  });

  it("separa las atrasadas de las de hoy, con su cantidad", async () => {
    backend();
    const vista = await renderAgenda();
    await vista.findByText(PAGO);

    expect(vista.getByRole("header", { name: "Atrasadas · 2" })).toBeTruthy();
    expect(vista.getByRole("header", { name: "Hoy · 2" })).toBeTruthy();
  });

  it("una alerta atrasada indica hace cuántos días venció", async () => {
    backend();
    const vista = await renderAgenda();
    await vista.findByText(PAGO);

    expect(vista.getByText("Hace 2 días")).toBeTruthy();
    expect(vista.getByText("Hace 1 día")).toBeTruthy();
  });

  it("muestra el progreso del día: «Llevás X de Y»", async () => {
    backend({ resueltasInicial: 1 });
    const vista = await renderAgenda();

    await vista.findByText(/Llevás 1 de 5/);
  });

  it("sin alertas muestra el estado vacío", async () => {
    backend({ alertas: [], resueltasInicial: 3 });
    const vista = await renderAgenda();

    await vista.findByText(/no tenés alertas pendientes/i);
    expect(vista.queryByRole("alert")).toBeNull();
  });

  it("mientras carga muestra un indicador de carga", async () => {
    mockHttp.mockImplementation(() => new Promise(() => undefined));
    const vista = await renderAgenda();

    expect(vista.getByLabelText(/cargando/i)).toBeTruthy();
    expect(vista.queryByText(/no tenés alertas pendientes/i)).toBeNull();
  });

  it("si la consulta falla avisa con un error accesible y Reintentar vuelve a pedirla", async () => {
    backend({ falla: 500 });
    const vista = await renderAgenda();

    await vista.findByRole("alert");
    expect(vista.getByText(/no pudimos cargar la agenda/i)).toBeTruthy();

    backend();
    await fireEvent.press(vista.getByRole("button", { name: /reintentar/i }));

    await vista.findByText(PAGO);
    expect(vista.queryByRole("alert")).toBeNull();
  });

  it("pull-to-refresh vuelve a pedir la agenda y el progreso", async () => {
    backend();
    const vista = await renderAgenda();
    await vista.findByText(PAGO);
    const antes = llamadasLista().length;
    const progresoAntes = mockHttp.mock.calls.filter(
      ([c]) => c.url === "/api/alertas/progreso-del-dia",
    ).length;

    await act(async () => {
      await fireEvent(vista.getByTestId("lista-alertas"), "refresh");
    });

    await waitFor(() => {
      expect(llamadasLista().length).toBeGreaterThan(antes);
    });
    expect(
      mockHttp.mock.calls.filter(([c]) => c.url === "/api/alertas/progreso-del-dia").length,
    ).toBeGreaterThan(progresoAntes);
  });
});

describe("RF-076 resolver con deshacer", () => {
  const resolverFormulario = async (vista: Awaited<ReturnType<typeof renderAgenda>>) => {
    await vista.findByText(FORMULARIO);
    await fireEvent.press(vista.getByRole("button", { name: `Resolver: ${FORMULARIO}` }));
  };
  const avanzar = async (ms: number) => {
    await act(async () => {
      jest.advanceTimersByTime(ms);
    });
  };

  it("la alerta sale de la lista al instante y aparece «Alerta resuelta» con «Deshacer»", async () => {
    backend();
    const vista = await renderAgenda();
    await resolverFormulario(vista);

    expect(vista.queryByText(FORMULARIO)).toBeNull();
    expect(vista.getByText("Alerta resuelta")).toBeTruthy();
    expect(vista.getByRole("button", { name: "Deshacer" })).toBeTruthy();
  });

  it("no envía el POST antes de que venza el plazo de gracia", async () => {
    backend();
    const vista = await renderAgenda();
    await resolverFormulario(vista);

    await avanzar(ESPERA_DESHACER_MS - 1_000);

    expect(llamadasResolver()).toHaveLength(0);
  });

  it("pasado el plazo envía un único POST /resolver de esa alerta", async () => {
    backend();
    const vista = await renderAgenda();
    await resolverFormulario(vista);

    await avanzar(ESPERA_DESHACER_MS + 100);
    await waitFor(() => {
      expect(llamadasResolver(ID_FORMULARIO)).toHaveLength(1);
    });
    await avanzar(ESPERA_DESHACER_MS * 2);

    expect(llamadasResolver()).toHaveLength(1);
  });

  it("una vez enviada, el progreso del día suma la alerta resuelta", async () => {
    backend({ resueltasInicial: 1 });
    const vista = await renderAgenda();
    await vista.findByText(/Llevás 1 de 5/);
    await resolverFormulario(vista);

    await avanzar(ESPERA_DESHACER_MS + 100);

    await vista.findByText(/Llevás 2 de 5/);
    expect(vista.queryByText(FORMULARIO)).toBeNull();
  });

  it("«Deshacer» cancela el envío: la alerta vuelve a la lista y nunca se hace el POST", async () => {
    backend();
    const vista = await renderAgenda();
    await resolverFormulario(vista);

    await fireEvent.press(vista.getByRole("button", { name: "Deshacer" }));
    await avanzar(ESPERA_DESHACER_MS * 2);

    expect(llamadasResolver()).toHaveLength(0);
    expect(vista.getByText(FORMULARIO)).toBeTruthy();
    expect(vista.queryByText("Alerta resuelta")).toBeNull();
  });

  it("si el servidor rechaza con 409, la alerta vuelve a la lista y se muestra el motivo", async () => {
    const motivo = "La alerta ya estaba resuelta por otra persona.";
    backend({ rechazarResolver: { status: 409, detalle: motivo } });
    const vista = await renderAgenda();
    await resolverFormulario(vista);
    expect(vista.queryByText(FORMULARIO)).toBeNull();

    await avanzar(ESPERA_DESHACER_MS + 100);

    await vista.findByText(motivo);
    expect(vista.getByRole("alert")).toBeTruthy();
    expect(vista.getByText(FORMULARIO)).toBeTruthy();
  });

  it("la alerta de un pago no ofrece Resolver: se resuelve al registrar el cobro", async () => {
    backend();
    const vista = await renderAgenda();
    await vista.findByText(PAGO);

    expect(vista.queryByRole("button", { name: `Resolver: ${PAGO}` })).toBeNull();
    expect(vista.getByText(/se resuelve al registrar el cobro/i)).toBeTruthy();
    expect(vista.getByRole("button", { name: `Resolver: ${INSISTENCIA}` })).toBeTruthy();
  });
});
