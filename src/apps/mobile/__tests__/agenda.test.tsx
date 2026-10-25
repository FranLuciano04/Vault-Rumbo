import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";
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
    rol?: string;
    /** Alertas vistas sin resolver (la consulta con `estado: "vista"`). */
    vistas?: number;
    /** Las alertas de `alertas` se sirven de a `porPagina`, y el total real es `totalReal`. */
    paginacion?: { porPagina: number; totalReal: number };
  } = {},
) {
  const pendientes = [...(opciones.alertas ?? ALERTAS)] as { id: string }[];
  let resueltas = opciones.resueltasInicial ?? 1;
  const total = pendientes.length + resueltas;
  mockHttp.mockImplementation((config) => {
    const url = config.url ?? "";
    if (opciones.falla) return respuesta(opciones.falla, {}, config);
    if (url === "/api/auth/yo") {
      return respuesta(
        200,
        { ...ANA, email: "ana@rumbo.test", rol: opciones.rol ?? "empleado", acceso_redes: false },
        config,
      );
    }
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
    if (url === "/api/alertas" && config.params?.["estado"] === "vista") {
      const total = opciones.vistas ?? 0;
      return respuesta(200, { items: [], total, pagina: 1, por_pagina: 1 }, config);
    }
    if (url === "/api/alertas" && opciones.paginacion) {
      const { porPagina, totalReal } = opciones.paginacion;
      const pagina = Number(config.params?.["pagina"] ?? 1);
      const items = pendientes.slice((pagina - 1) * porPagina, pagina * porPagina);
      return respuesta(200, { items, total: totalReal, pagina, por_pagina: porPagina }, config);
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
      await Promise.resolve();
    });
  };

  it("la alerta sale de la lista al instante y aparece «Alerta resuelta» con «Deshacer»", async () => {
    backend();
    const vista = await renderAgenda();
    await resolverFormulario(vista);

    expect(vista.queryByText(FORMULARIO)).toBeNull();
    expect(vista.getByText("Alerta resuelta")).toBeTruthy();
    expect(vista.getByRole("button", { name: `Deshacer: ${FORMULARIO}` })).toBeTruthy();
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

    await fireEvent.press(vista.getByRole("button", { name: `Deshacer: ${FORMULARIO}` }));
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

describe("RF-074 agenda mobile: paginación, agencia y avisos", () => {
  it("si hay más alertas que las cargadas muestra «mostrando N de total» y «Ver más» trae la siguiente página", async () => {
    backend({ paginacion: { porPagina: 2, totalReal: 4 } });
    const vista = await renderAgenda();
    await vista.findByText(PAGO);

    expect(vista.getByText("Mostrando 2 de 4 alertas")).toBeTruthy();
    expect(vista.queryByText(FORMULARIO)).toBeNull();

    await fireEvent.press(vista.getByRole("button", { name: "Ver más alertas" }));

    await vista.findByText(FORMULARIO);
    expect(vista.getByText(VIAJE)).toBeTruthy();
    expect(vista.queryByText(/^Mostrando/)).toBeNull();
    expect(vista.getByRole("header", { name: "Hoy · 2" })).toBeTruthy();
  });

  it("para el dueño muestra al responsable en cada fila y los textos de la agencia", async () => {
    backend({ rol: "dueno" });
    const vista = await renderAgenda();
    await vista.findByText(PAGO);

    await vista.findByText(/La agencia lleva 1 de 5/);
    expect(vista.getAllByText(/· Ana Pérez$/)).toHaveLength(4);
  });

  it("para un empleado no muestra al responsable", async () => {
    backend({ rol: "empleado" });
    const vista = await renderAgenda();
    await vista.findByText(PAGO);

    expect(vista.queryByText(/· Ana Pérez$/)).toBeNull();
  });

  it("para el dueño, sin alertas, el vacío habla de la agencia", async () => {
    backend({ rol: "dueno", alertas: [], resueltasInicial: 3 });
    const vista = await renderAgenda();

    await vista.findByText(/La agencia no tiene alertas pendientes/i);
  });

  it("sin pendientes pero con vistas sin resolver avisa cuántas son", async () => {
    backend({ alertas: [], resueltasInicial: 3, vistas: 2 });
    const vista = await renderAgenda();

    await vista.findByText("Tenés 2 alertas vistas sin resolver.");
  });

  it("el progreso es una barra accesible con su valor", async () => {
    backend({ resueltasInicial: 1 });
    const vista = await renderAgenda();

    const barra = await vista.findByRole("progressbar");
    expect(barra.props.accessibilityValue).toEqual({ min: 0, max: 5, now: 1 });
  });

  it("el aviso «Alerta resuelta» se anuncia como región viva", async () => {
    backend();
    const vista = await renderAgenda();
    await vista.findByText(FORMULARIO);
    await fireEvent.press(vista.getByRole("button", { name: `Resolver: ${FORMULARIO}` }));

    const aviso = vista.getByText("Alerta resuelta");
    let nodo = aviso.parent;
    while (nodo && nodo.props.accessibilityLiveRegion !== "polite") nodo = nodo.parent;
    expect(nodo).toBeTruthy();
  });

  it("al pasar la app a segundo plano envía el POST sin esperar el plazo", async () => {
    let cambiarEstado: ((estado: string) => void) | undefined;
    jest.spyOn(AppState, "addEventListener").mockImplementation(((
      _evento: string,
      manejador: (estado: string) => void,
    ) => {
      cambiarEstado = manejador;
      return { remove: jest.fn() };
    }) as never);
    backend();
    const vista = await renderAgenda();
    await vista.findByText(FORMULARIO);
    await fireEvent.press(vista.getByRole("button", { name: `Resolver: ${FORMULARIO}` }));
    expect(llamadasResolver()).toHaveLength(0);

    await act(async () => {
      cambiarEstado?.("background");
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(llamadasResolver(ID_FORMULARIO)).toHaveLength(1);
    });
  });

  it("el pull-to-refresh limpia el error de una resolución rechazada", async () => {
    const motivo = "La alerta ya estaba resuelta por otra persona.";
    backend({ rechazarResolver: { status: 409, detalle: motivo } });
    const vista = await renderAgenda();
    await vista.findByText(FORMULARIO);
    await fireEvent.press(vista.getByRole("button", { name: `Resolver: ${FORMULARIO}` }));
    await act(async () => {
      jest.advanceTimersByTime(ESPERA_DESHACER_MS + 100);
      await Promise.resolve();
    });
    await vista.findByText(motivo);

    await act(async () => {
      await fireEvent(vista.getByTestId("lista-alertas"), "refresh");
    });

    await waitFor(() => {
      expect(vista.queryByText(motivo)).toBeNull();
    });
  });
});
