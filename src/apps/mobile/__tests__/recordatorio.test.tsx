import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Slot } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AgendaMobile } from "../src/features/alertas/AgendaMobile";
import { NuevoRecordatorioMobile } from "../src/features/alertas/NuevoRecordatorioMobile";

jest.mock("../global.css", () => ({}));
jest.mock("../src/lib/firebase", () => ({ obtenerTokenId: jest.fn() }));

// MSW no carga bajo jest-expo (ver login.test.tsx): cliente real de `@rumbo/shared` con adaptador falso.
type Config = { url?: string; method?: string; data?: unknown; params?: Record<string, unknown> };
const mockHttp = jest.fn<Promise<unknown>, [Config]>();
jest.mock("../src/cliente", () => {
  const { crearCliente } = jest.requireActual<typeof import("@rumbo/shared")>("@rumbo/shared");
  const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => null });
  cliente.defaults.adapter = ((config: never) => mockHttp(config)) as never;
  return { cliente };
});

// El selector nativo no corre en jest: se reemplaza por un componente falso con dos botones, uno que
// elige la fecha de `mockFechaElegida` (año, mes 1-12, día) y otro que cancela el selector.
let mockFechaElegida: [number, number, number] = [2026, 11, 2];
jest.mock(
  "@react-native-community/datetimepicker",
  () => {
    const { Pressable, Text, View } = jest.requireActual<typeof import("react-native")>("react-native");
    const { createElement } = jest.requireActual<typeof import("react")>("react");
    const boton = (testID: string, texto: string, alPresionar: () => void) =>
      createElement(
        Pressable,
        { testID, role: "button", onPress: alPresionar },
        createElement(Text, null, texto),
      );
    const Falso = ({ onChange }: { onChange: (evento: { type: string }, fecha?: Date) => void }) =>
      createElement(
        View,
        null,
        boton("selector-fecha-aceptar", "Aceptar fecha", () => {
          const [anio, mes, dia] = mockFechaElegida;
          onChange({ type: "set" }, new Date(anio, mes - 1, dia, 12));
        }),
        boton("selector-fecha-cancelar", "Cancelar selector", () => {
          onChange({ type: "dismissed" });
        }),
      );
    return { __esModule: true, default: Falso };
  },
  { virtual: true },
);

const ANA = { id: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03", nombre: "Ana Pérez" };
const CLIENTE_ID = "3c1f6d2e-8a47-4b19-9e53-7d0a2b4c6e11";
const camila = {
  id: CLIENTE_ID,
  nombre: "Camila Benítez",
  contacto: "camila@mail.test",
  segmento: "familia",
};
const sinContexto = { cliente: null, oportunidad: null, viaje: null, pago: null };

function respuesta(status: number, data: unknown, config: unknown) {
  const response = { data, status, statusText: "", headers: {}, config };
  return status < 400
    ? Promise.resolve(response)
    : Promise.reject(Object.assign(new Error("fallo"), { isAxiosError: true, config, response }));
}

const cuerpos: Record<string, unknown>[] = [];

/** Backend falso: el POST /api/alertas suma el recordatorio a la agenda. */
function backend(opciones: { alta?: (config: Config) => Promise<unknown> } = {}) {
  const pendientes: Record<string, unknown>[] = [];
  mockHttp.mockImplementation((config) => {
    const url = config.url ?? "";
    const metodo = (config.method ?? "get").toLowerCase();
    if (url === "/api/auth/yo") {
      return respuesta(
        200,
        { ...ANA, email: "ana@rumbo.test", rol: "empleado", acceso_redes: false },
        config,
      );
    }
    if (url === "/api/alertas/progreso-del-dia") {
      return respuesta(200, { resueltas_hoy: 0, total_del_dia: pendientes.length }, config);
    }
    if (url === "/api/alertas" && metodo === "post") {
      const cuerpo = (
        typeof config.data === "string" ? JSON.parse(config.data) : config.data
      ) as Record<string, unknown>;
      cuerpos.push(cuerpo);
      if (opciones.alta) return opciones.alta(config);
      const creada = {
        id: "al-nueva",
        tipo: "manual",
        estado: "pendiente",
        propietario_id: ANA.id,
        responsable: ANA,
        contexto: { ...sinContexto, cliente: cuerpo["cliente_id"] ? camila : null },
        viaje_id: null,
        pago_id: null,
        oportunidad_id: null,
        cliente_id: null,
        viaje_hotel_id: null,
        resuelta_en: null,
        cerrada_por_cancelacion: false,
        created_by: ANA.id,
        updated_by: ANA.id,
        created_at: "2026-10-26T00:00:00Z",
        updated_at: "2026-10-26T00:00:00Z",
        ...cuerpo,
      };
      pendientes.push(creada);
      return respuesta(201, creada, config);
    }
    if (url === "/api/alertas") {
      if (config.params?.["estado"] === "vista") {
        return respuesta(200, { items: [], total: 0, pagina: 1, por_pagina: 1 }, config);
      }
      return respuesta(
        200,
        { items: pendientes, total: pendientes.length, pagina: 1, por_pagina: 100 },
        config,
      );
    }
    if (url === "/api/clientes") {
      const buscar = String(config.params?.["buscar"] ?? "").toLowerCase();
      const items = buscar && camila.nombre.toLowerCase().includes(buscar) ? [camila] : [];
      return respuesta(200, { items, total: items.length, pagina: 1, por_pagina: 5 }, config);
    }
    return respuesta(404, {}, config);
  });
}

const altasEnviadas = () =>
  mockHttp.mock.calls
    .map(([c]) => c)
    .filter((c) => c.url === "/api/alertas" && (c.method ?? "").toLowerCase() === "post");

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Raiz() {
  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}

function renderRecordatorio(initialUrl = "/agenda/nuevo") {
  queryClient.clear();
  return renderRouter(
    {
      _layout: Raiz,
      "(pestanas)/agenda/index": AgendaMobile,
      "(pestanas)/agenda/nuevo": NuevoRecordatorioMobile,
    },
    { initialUrl },
  );
}
type Vista = Awaited<ReturnType<typeof renderRecordatorio>>;

const guardar = (vista: Vista) => vista.getByRole("button", { name: /^guardar/i });
const botonFecha = (vista: Vista) => vista.getByRole("button", { name: /^fecha/i });
/** Abre el selector y elige el día indicado (año, mes 1-12, día). */
async function elegirFecha(vista: Vista, dia: [number, number, number] = [2026, 11, 2]) {
  mockFechaElegida = dia;
  await fireEvent.press(botonFecha(vista));
  await fireEvent.press(await vista.findByTestId("selector-fecha-aceptar"));
}
async function completar(vista: Vista, descripcion: string, dia?: [number, number, number]) {
  await fireEvent.changeText(await vista.findByLabelText(/^descripci[oó]n/i), descripcion);
  await elegirFecha(vista, dia);
}
async function elegirCamila(vista: Vista) {
  await fireEvent.press(vista.getByRole("button", { name: /^cliente$/i }));
  await fireEvent.changeText(await vista.findByLabelText(/buscar cliente/i), "Camila");
  await fireEvent.press(await vista.findByRole("button", { name: /Camila Benítez/ }));
}

beforeEach(() => {
  jest.clearAllMocks();
  cuerpos.length = 0;
});

describe("RF-080 recordatorio mobile", () => {
  it("RF-080 pide descripción y fecha, sin asociación obligatoria", async () => {
    backend();
    const vista = await renderRecordatorio();

    expect(await vista.findByLabelText(/^descripci[oó]n/i)).toBeTruthy();
    expect(botonFecha(vista)).toBeTruthy();
    expect(vista.getByText("Elegir fecha")).toBeTruthy();
    expect(vista.queryByTestId("selector-fecha-aceptar")).toBeNull();
    expect(vista.queryByText(/asociado a/i)).toBeNull();
  });

  it("RF-080 tocar «Fecha» abre el selector y elegir un día lo muestra en dd/mm/aa", async () => {
    backend();
    const vista = await renderRecordatorio();
    await vista.findByLabelText(/^descripci[oó]n/i);

    await elegirFecha(vista, [2026, 11, 2]);

    expect(vista.getByText("02/11/26")).toBeTruthy();
    expect(vista.queryByText("Elegir fecha")).toBeNull();
  });

  it("RF-080 sin descripción no manda el alta y marca el campo", async () => {
    backend();
    const vista = await renderRecordatorio();
    await vista.findByLabelText(/^descripci[oó]n/i);
    await elegirFecha(vista);

    await fireEvent.press(guardar(vista));

    expect(await vista.findByText("Escribí qué hay que hacer.")).toBeTruthy();
    expect(altasEnviadas()).toHaveLength(0);
  });

  it("RF-080 una descripción de solo espacios se rechaza", async () => {
    backend();
    const vista = await renderRecordatorio();
    await completar(vista, "   ");

    await fireEvent.press(guardar(vista));

    expect(await vista.findByText("Escribí qué hay que hacer.")).toBeTruthy();
    expect(altasEnviadas()).toHaveLength(0);
  });

  it("RF-080 sin fecha no manda el alta y marca el campo", async () => {
    backend();
    const vista = await renderRecordatorio();
    await fireEvent.changeText(await vista.findByLabelText(/^descripci[oó]n/i), "Llamar a Ana");

    await fireEvent.press(guardar(vista));

    expect(await vista.findByText("Elegí una fecha.")).toBeTruthy();
    expect(altasEnviadas()).toHaveLength(0);
  });

  it("RF-080 cancelar el selector no cambia la fecha", async () => {
    backend();
    const vista = await renderRecordatorio();
    await completar(vista, "Llamar a Ana", [2026, 11, 2]);
    mockFechaElegida = [2026, 12, 25];
    await fireEvent.press(botonFecha(vista));

    await fireEvent.press(await vista.findByTestId("selector-fecha-cancelar"));

    expect(vista.getByText("02/11/26")).toBeTruthy();
    await fireEvent.press(guardar(vista));
    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({ fecha: "2026-11-02" });
  });

  it("RF-080 cancelar el selector sin fecha previa deja «Elegir fecha»", async () => {
    backend();
    const vista = await renderRecordatorio();
    await vista.findByLabelText(/^descripci[oó]n/i);
    await fireEvent.press(botonFecha(vista));

    await fireEvent.press(await vista.findByTestId("selector-fecha-cancelar"));

    expect(vista.getByText("Elegir fecha")).toBeTruthy();
  });

  it("RF-080 crea un recordatorio personal, sin asociación y con la descripción recortada", async () => {
    backend();
    const vista = await renderRecordatorio();
    await completar(vista, "  Llamar a Ana  ");

    await fireEvent.press(guardar(vista));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({ descripcion: "Llamar a Ana", fecha: "2026-11-02" });
    expect(cuerpos[0]?.["cliente_id"] ?? null).toBeNull();
    expect(cuerpos[0]?.["oportunidad_id"] ?? null).toBeNull();
    expect(cuerpos[0]?.["viaje_id"] ?? null).toBeNull();
  });

  it("RF-080 asocia el recordatorio a un cliente buscado por nombre", async () => {
    backend();
    const vista = await renderRecordatorio();
    await completar(vista, "Mandar el itinerario", [2026, 11, 3]);
    await elegirCamila(vista);

    expect(await vista.findByText(/Asociado a: Camila Benítez/)).toBeTruthy();
    await fireEvent.press(guardar(vista));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({ cliente_id: CLIENTE_ID, fecha: "2026-11-03" });
    expect(cuerpos[0]?.["oportunidad_id"] ?? null).toBeNull();
    expect(cuerpos[0]?.["viaje_id"] ?? null).toBeNull();
  });

  it("RF-080 elegir «Cliente» sin elegir uno no guarda y avisa", async () => {
    backend();
    const vista = await renderRecordatorio();
    await completar(vista, "Llamar");
    await fireEvent.press(vista.getByRole("button", { name: /^cliente$/i }));

    await fireEvent.press(guardar(vista));

    expect(await vista.findByText(/elegí un cliente/i)).toBeTruthy();
    expect(altasEnviadas()).toHaveLength(0);
  });

  it("RF-080 volver a «Personal» descarta el cliente elegido", async () => {
    backend();
    const vista = await renderRecordatorio();
    await completar(vista, "Llamar");
    await elegirCamila(vista);
    await fireEvent.press(vista.getByRole("button", { name: /^personal/i }));

    await fireEvent.press(guardar(vista));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["cliente_id"] ?? null).toBeNull();
  });

  it("RF-080 un 422 del servidor queda en el campo descripción y no sale de la pantalla", async () => {
    backend({
      alta: (config) =>
        respuesta(
          422,
          {
            title: "Error de validación",
            status: 422,
            errores: [{ campo: "descripcion", mensaje: "La descripción es demasiado larga." }],
          },
          config,
        ),
    });
    const vista = await renderRecordatorio();
    await completar(vista, "Algo");

    await fireEvent.press(guardar(vista));

    expect(await vista.findByText("La descripción es demasiado larga.")).toBeTruthy();
    expect(vista).toHavePathname("/agenda/nuevo");
  });

  it("RF-080 si la entidad asociada ya no existe, muestra un aviso accesible sin el id", async () => {
    backend({
      alta: (config) =>
        respuesta(
          404,
          { title: "No encontrado", status: 404, detail: `Cliente ${CLIENTE_ID} no encontrado` },
          config,
        ),
    });
    const vista = await renderRecordatorio();
    await completar(vista, "Llamar");

    await fireEvent.press(guardar(vista));

    const aviso = await vista.findByRole("alert");
    expect(aviso).toHaveTextContent("Lo que querés guardar ya no existe o no lo podés ver.");
    expect(aviso).not.toHaveTextContent(CLIENTE_ID);
  });

  it("RF-080 un fallo inesperado del servidor muestra un aviso accesible", async () => {
    backend({ alta: (config) => respuesta(500, {}, config) });
    const vista = await renderRecordatorio();
    await completar(vista, "Llamar");

    await fireEvent.press(guardar(vista));

    await vista.findByRole("alert");
    expect(vista).toHavePathname("/agenda/nuevo");
  });

  it("RF-080 tras guardar vuelve a la agenda y el recordatorio aparece en ella", async () => {
    backend();
    const vista = await renderRecordatorio();
    await completar(vista, "Llamar a Ana");

    await fireEvent.press(guardar(vista));

    await waitFor(() => {
      expect(vista).toHavePathname("/agenda");
    });
    expect(await vista.findByText("Llamar a Ana")).toBeTruthy();
  });

  it("RF-080 Cancelar vuelve a la agenda sin mandar nada", async () => {
    backend();
    const vista = await renderRecordatorio();
    await vista.findByLabelText(/^descripci[oó]n/i);

    await fireEvent.press(vista.getByRole("button", { name: /cancelar/i }));

    await waitFor(() => {
      expect(vista).toHavePathname("/agenda");
    });
    expect(altasEnviadas()).toHaveLength(0);
  });

  it("RF-080 desde la agenda, «Nuevo recordatorio» abre el formulario", async () => {
    backend();
    const vista = await renderRecordatorio("/agenda");

    await fireEvent.press(await vista.findByRole("button", { name: /nuevo recordatorio/i }));

    await waitFor(() => {
      expect(vista).toHavePathname("/agenda/nuevo");
    });
  });
});
