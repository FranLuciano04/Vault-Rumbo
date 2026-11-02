import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Slot, Stack, Tabs } from "expo-router";
import { Linking } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AgendaMobile } from "../src/features/alertas/AgendaMobile";
import { DetalleAlertaMobile } from "../src/features/alertas/DetalleAlertaMobile";

jest.mock("../global.css", () => ({}));
jest.mock("../src/lib/firebase", () => ({ obtenerTokenId: jest.fn() }));

// T-117 (CU-30, pantalla 53): la sugerencia de recontacto en el celular. Igual que en
// detalleAlerta.test.tsx, MSW no carga bajo jest-expo: se usa el cliente real de `@rumbo/shared`
// con un adaptador HTTP falso que responde las rutas de /api/alertas y /api/clientes.
type Config = { url?: string; method?: string; data?: string; params?: Record<string, unknown> };
const mockHttp = jest.fn<Promise<unknown>, [Config]>();
jest.mock("../src/cliente", () => {
  const { crearCliente } = jest.requireActual<typeof import("@rumbo/shared")>("@rumbo/shared");
  const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => null });
  cliente.defaults.adapter = ((config: never) => mockHttp(config)) as never;
  return { cliente };
});

const HOY = new Date("2026-10-25T12:00:00-03:00");

const ANA = { id: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03", nombre: "Ana Pérez" };
const ID_CLIENTE = "cl-3";
const joaquinResumen = { id: ID_CLIENTE, nombre: "Joaquín Ramos" };
const sinContexto = { cliente: null, oportunidad: null, viaje: null, pago: null };

const DESCRIPCION = "Hace un año que Joaquín Ramos no viaja: ofrecele una escapada.";
const ID_RECONTACTO = "al-30";
const ID_VISTA = "al-31";
const ID_RESUELTA = "al-32";

function alerta(id: string, estado: string) {
  return {
    id,
    tipo: "recontacto",
    descripcion: DESCRIPCION,
    fecha: "2026-10-25",
    estado,
    propietario_id: ANA.id,
    responsable: ANA,
    contexto: { ...sinContexto, cliente: joaquinResumen },
    viaje_id: null,
    pago_id: null,
    oportunidad_id: null,
    cliente_id: ID_CLIENTE,
    viaje_hotel_id: null,
    resuelta_en: null,
    cerrada_por_cancelacion: false,
    created_by: null,
    updated_by: null,
    created_at: "2026-10-20T00:00:00Z",
    updated_at: "2026-10-20T00:00:00Z",
  };
}

function ficha(contacto: string) {
  return {
    id: ID_CLIENTE,
    nombre: "Joaquín Ramos",
    contacto,
    instagram: null,
    segmento: "individual",
    etiquetas: [],
    preferencias: "Viaja solo, prefiere escapadas cortas.",
    no_recontactar: false,
    asesor_asignado_id: ANA.id,
    asesor: ANA,
    ultimo_viaje: null,
    oportunidades_abiertas: 0,
    created_by: ANA.id,
    updated_by: ANA.id,
    created_at: "2026-01-12T14:30:00Z",
    updated_at: "2026-03-02T10:15:00Z",
  };
}

function respuesta(status: number, data: unknown, config: unknown) {
  const response = { data, status, statusText: "", headers: {}, config };
  return status < 400
    ? Promise.resolve(response)
    : Promise.reject(Object.assign(new Error("fallo"), { isAxiosError: true, config, response }));
}

const problema = (status: number, detail: string) => ({
  type: "about:blank",
  title: "Error",
  status,
  detail,
});

/** Backend falso: registra el PATCH del cliente y el resolver; el PATCH puede rechazarse. */
function backend(
  opciones: {
    contacto?: string;
    fallaFicha?: boolean;
    resolverFalla?: boolean;
    rechazarPatch?: { status: number; detalle: string };
  } = {},
) {
  const alertas = [
    alerta(ID_RECONTACTO, "pendiente"),
    alerta(ID_VISTA, "vista"),
    alerta(ID_RESUELTA, "resuelta"),
  ];
  mockHttp.mockImplementation((config) => {
    const url = config.url ?? "";
    const metodo = config.method;
    if (url === "/api/auth/yo") {
      return respuesta(
        200,
        { ...ANA, email: "ana@rumbo.test", rol: "empleado", acceso_redes: false },
        config,
      );
    }
    if (url === "/api/alertas/progreso-del-dia") {
      return respuesta(200, { resueltas_hoy: 0, total_del_dia: 1 }, config);
    }
    if (url === `/api/clientes/${ID_CLIENTE}/historial`) {
      return respuesta(200, { oportunidades: [], viajes: [], resenas: [] }, config);
    }
    if (url === `/api/clientes/${ID_CLIENTE}`) {
      if (metodo === "patch") {
        if (opciones.rechazarPatch) {
          const { status, detalle } = opciones.rechazarPatch;
          return respuesta(status, problema(status, detalle), config);
        }
        return respuesta(
          200,
          { ...ficha(opciones.contacto ?? "+54 9 351 555-9876"), no_recontactar: true },
          config,
        );
      }
      if (opciones.fallaFicha) return respuesta(500, problema(500, "Error"), config);
      return respuesta(200, ficha(opciones.contacto ?? "+54 9 351 555-9876"), config);
    }
    const resolver = /^\/api\/alertas\/([^/]+)\/resolver$/.exec(url);
    if (resolver && metodo === "post" && opciones.resolverFalla) {
      return respuesta(500, problema(500, "Servicio caído."), config);
    }
    if (resolver && metodo === "post") {
      return respuesta(200, { ...alerta(resolver[1] as string, "resuelta") }, config);
    }
    if (/^\/api\/alertas\/[^/]+\/posponer$/.test(url) && metodo === "post") {
      return respuesta(200, alerta(ID_RECONTACTO, "pendiente"), config);
    }
    const una = /^\/api\/alertas\/([^/]+)$/.exec(url);
    if (una) {
      const encontrada = alertas.find((a) => a.id === una[1]);
      return encontrada ? respuesta(200, encontrada, config) : respuesta(404, {}, config);
    }
    if (url === "/api/alertas") {
      const vigentes = alertas.filter((a) => a.estado === "pendiente");
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
function Pestanas() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="agenda" />
      <Tabs.Screen name="clientes" />
    </Tabs>
  );
}
function Pila() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

function renderApp(initialUrl: string) {
  queryClient.clear();
  return renderRouter(
    {
      _layout: Raiz,
      "(pestanas)/_layout": Pestanas,
      "(pestanas)/agenda/_layout": Pila,
      "(pestanas)/agenda/index": AgendaMobile,
      "(pestanas)/agenda/[id]": DetalleAlertaMobile,
      "(pestanas)/clientes/_layout": Pila,
      "(pestanas)/clientes/index": FichaFalsa,
      "(pestanas)/clientes/[id]": FichaFalsa,
    },
    { initialUrl },
  );
}

function llamadas(metodo: string, patron: RegExp) {
  return mockHttp.mock.calls
    .map(([c]) => c)
    .filter((c) => c.method === metodo && patron.test(c.url ?? ""));
}
const patchCliente = () => llamadas("patch", /^\/api\/clientes\/[^/]+$/);
const resolver = () => llamadas("post", /\/resolver$/);

let abrir: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({
    now: HOY,
    doNotFake: ["nextTick", "queueMicrotask", "setImmediate", "clearImmediate"],
  });
  abrir = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
});
afterEach(() => {
  jest.useRealTimers();
});

async function abrirSugerencia(id = ID_RECONTACTO) {
  const vista = await renderApp(`/agenda/${id}`);
  await vista.findByText(DESCRIPCION);
  return vista;
}

describe("RF-030 opt-out mobile", () => {
  describe("detalle de la sugerencia", () => {
    it("muestra el cliente y sus preferencias", async () => {
      backend();
      const vista = await abrirSugerencia();

      expect(await vista.findAllByText("Joaquín Ramos")).not.toHaveLength(0);
      expect(await vista.findByText(/Viaja solo, prefiere escapadas cortas/)).toBeTruthy();
    });

    it("«Ver cliente» abre la ficha del cliente", async () => {
      backend();
      const vista = await abrirSugerencia();

      await fireEvent.press(vista.getByRole("button", { name: /ver cliente/i }));

      await waitFor(() => {
        expect(vista).toHavePathname(`/clientes/${ID_CLIENTE}`);
      });
    });

    it("con un teléfono ofrece Llamar (tel:) y WhatsApp (wa.me)", async () => {
      backend({ contacto: "+54 9 11 5555-1234" });
      const vista = await abrirSugerencia();

      await fireEvent.press(await vista.findByRole("button", { name: /llamar/i }));
      expect(abrir).toHaveBeenCalledWith("tel:+5491155551234");
      await fireEvent.press(vista.getByRole("button", { name: /whatsapp/i }));
      expect(abrir).toHaveBeenCalledWith("https://wa.me/5491155551234");
    });

    it("con un email ofrece Enviar email (mailto:) y no ofrece llamar", async () => {
      backend({ contacto: "joaquin@mail.test" });
      const vista = await abrirSugerencia();

      await fireEvent.press(await vista.findByRole("button", { name: /enviar email/i }));
      expect(abrir).toHaveBeenCalledWith("mailto:joaquin@mail.test");
      expect(vista.queryByRole("button", { name: /llamar/i })).toBeNull();
    });

    it("avisa que crear la consulta se hace desde la web y no ofrece crearla", async () => {
      backend();
      const vista = await abrirSugerencia();

      expect(await vista.findByText(/crear la consulta.*web|desde la web.*consulta/i)).toBeTruthy();
      expect(vista.queryByRole("button", { name: /crear consulta/i })).toBeNull();
    });
  });

  describe("No recontactar", () => {
    it("pide confirmación y todavía no envía nada", async () => {
      backend();
      const vista = await abrirSugerencia();

      await fireEvent.press(vista.getByRole("button", { name: /no recontactar/i }));

      expect(await vista.findByRole("button", { name: /confirmar/i })).toBeTruthy();
      expect(patchCliente()).toHaveLength(0);
      expect(resolver()).toHaveLength(0);
    });

    it("«Cancelar» cierra la confirmación sin enviar nada", async () => {
      backend();
      const vista = await abrirSugerencia();
      await fireEvent.press(vista.getByRole("button", { name: /no recontactar/i }));

      await fireEvent.press(await vista.findByRole("button", { name: /cancelar/i }));

      expect(vista.queryByRole("button", { name: /confirmar/i })).toBeNull();
      expect(patchCliente()).toHaveLength(0);
      expect(resolver()).toHaveLength(0);
    });

    it("al confirmar hace PATCH no_recontactar:true y después resuelve la alerta", async () => {
      backend();
      const vista = await abrirSugerencia();
      await fireEvent.press(vista.getByRole("button", { name: /no recontactar/i }));

      await fireEvent.press(await vista.findByRole("button", { name: /confirmar/i }));

      await waitFor(() => {
        expect(resolver()).toHaveLength(1);
      });
      const [patch] = patchCliente();
      expect(patch?.url).toBe(`/api/clientes/${ID_CLIENTE}`);
      expect(JSON.parse(patch?.data ?? "{}")).toEqual({ no_recontactar: true });
      expect(resolver()[0]?.url).toBe(`/api/alertas/${ID_RECONTACTO}/resolver`);
      const orden = mockHttp.mock.calls.map(([c]) => c);
      expect(orden.indexOf(patch as Config)).toBeLessThan(orden.indexOf(resolver()[0] as Config));
    });

    it("tras resolver vuelve a la agenda", async () => {
      backend();
      const vista = await abrirSugerencia();
      await fireEvent.press(vista.getByRole("button", { name: /no recontactar/i }));

      await fireEvent.press(await vista.findByRole("button", { name: /confirmar/i }));

      await waitFor(() => {
        expect(vista).toHavePathname("/agenda");
      });
    });

    it("si el servidor rechaza el opt-out muestra el motivo, no resuelve y se queda en el detalle", async () => {
      backend({ rechazarPatch: { status: 403, detalle: "No podés editar a este cliente." } });
      const vista = await abrirSugerencia();
      await fireEvent.press(vista.getByRole("button", { name: /no recontactar/i }));

      await fireEvent.press(await vista.findByRole("button", { name: /confirmar/i }));

      await vista.findByText(/no podés editar a este cliente/i);
      expect(vista.getByRole("alert")).toBeTruthy();
      expect(resolver()).toHaveLength(0);
      expect(vista).toHavePathname(`/agenda/${ID_RECONTACTO}`);
    });
  });

  describe("Posponer", () => {
    it("con la alerta pendiente ofrece las fechas futuras y hace POST /posponer", async () => {
      backend();
      const vista = await abrirSugerencia();

      await fireEvent.press(vista.getByRole("button", { name: /posponer/i }));
      await fireEvent.press(await vista.findByRole("button", { name: "Mañana · 26/10/26" }));

      await waitFor(() => {
        expect(llamadas("post", /\/posponer$/)).toHaveLength(1);
      });
      const [llamada] = llamadas("post", /\/posponer$/);
      expect(llamada?.url).toBe(`/api/alertas/${ID_RECONTACTO}/posponer`);
      expect(JSON.parse(llamada?.data ?? "{}")).toEqual({ fecha: "2026-10-26" });
    });

    it("con la alerta vista no ofrece «Posponer» pero sí «No recontactar»", async () => {
      backend();
      const vista = await abrirSugerencia(ID_VISTA);

      expect(vista.queryByRole("button", { name: /^posponer$/i })).toBeNull();
      expect(vista.getByRole("button", { name: /no recontactar/i })).toBeTruthy();
    });
  });

  it("con la alerta resuelta no se ofrece «No recontactar»", async () => {
    backend();
    const vista = await abrirSugerencia(ID_RESUELTA);

    expect(vista.queryByRole("button", { name: /no recontactar/i })).toBeNull();
  });

  it("si el resolver falla tras un PATCH ok avisa que el cliente quedó marcado y el reintento solo resuelve", async () => {
    backend({ resolverFalla: true });
    const vista = await abrirSugerencia();
    await fireEvent.press(vista.getByRole("button", { name: /no recontactar/i }));
    await fireEvent.press(await vista.findByRole("button", { name: /confirmar/i }));

    await vista.findByText(/el cliente quedó marcado para no recontactar/i);
    expect(vista.getByRole("alert")).toBeTruthy();
    await fireEvent.press(vista.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => {
      expect(resolver()).toHaveLength(2);
    });
    expect(patchCliente()).toHaveLength(1);
  });

  it("si falla la ficha avisa que no se pudo cargar el contacto", async () => {
    backend({ fallaFicha: true });
    const vista = await abrirSugerencia();

    expect(await vista.findByText(/no pudimos cargar el contacto del cliente/i)).toBeTruthy();
  });

  it("una alerta de otro tipo no muestra las acciones de recontacto", async () => {
    backend();
    mockHttp.mockImplementation((config) =>
      /^\/api\/alertas\/[^/]+$/.test(config.url ?? "")
        ? respuesta(
            200,
            { ...alerta("al-99", "pendiente"), tipo: "manual", contexto: sinContexto },
            config,
          )
        : respuesta(404, {}, config),
    );
    const vista = await renderApp("/agenda/al-99");

    await vista.findByText(DESCRIPCION);
    expect(vista.queryByRole("button", { name: /no recontactar/i })).toBeNull();
  });
});
