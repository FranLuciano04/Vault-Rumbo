import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Slot } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ListaClientes } from "../src/features/clientes/ListaClientes";
import { FichaClienteMobile } from "../src/features/clientes/FichaClienteMobile";
import { NuevoClienteMobile } from "../src/features/clientes/NuevoClienteMobile";

jest.mock("../global.css", () => ({}));
jest.mock("../src/lib/firebase", () => ({ obtenerTokenId: jest.fn() }));

// Igual que clientes.test.tsx: cliente real de `@rumbo/shared` con un adaptador HTTP falso.
type Config = { url?: string; method?: string; data?: unknown; params?: Record<string, unknown> };
const mockHttp = jest.fn<Promise<unknown>, [Config]>();
jest.mock("../src/cliente", () => {
  const { crearCliente } = jest.requireActual<typeof import("@rumbo/shared")>("@rumbo/shared");
  const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => null });
  cliente.defaults.adapter = ((config: never) => mockHttp(config)) as never;
  return { cliente };
});

const ASESOR = { id: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03", nombre: "Laura Asesora" };
const NUEVO_ID = "11111111-2222-4333-8444-555555555555";

function fichaDe(id: string, nombre: string, contacto: string, extra = {}) {
  return {
    id,
    nombre,
    contacto,
    instagram: null,
    segmento: "individual",
    etiquetas: [],
    preferencias: null,
    no_recontactar: false,
    asesor_asignado_id: ASESOR.id,
    asesor: ASESOR,
    created_by: ASESOR.id,
    updated_by: ASESOR.id,
    created_at: "2026-01-12T14:30:00Z",
    updated_at: "2026-03-02T10:15:00Z",
    ...extra,
  };
}
const sosa = fichaDe("id-sosa", "Familia Sosa", "sosa.familia@mail.test", { segmento: "familia" });

function respuesta(status: number, data: unknown, config: unknown) {
  const response = { data, status, statusText: "", headers: {}, config };
  return status < 400
    ? Promise.resolve(response)
    : Promise.reject(Object.assign(new Error("fallo"), { isAxiosError: true, config, response }));
}

type Rol = "admin" | "dueno" | "empleado" | "freelance";
const cuerpos: Record<string, unknown>[] = [];

/**
 * Backend falso. `alta` decide la respuesta del POST: por defecto 201; con `duplicados`
 * responde 409 hasta que llega `confirmar_duplicado`.
 */
function backend(
  opciones: {
    rol?: Rol;
    duplicados?: unknown[];
    alta?: (cuerpo: Record<string, unknown>, config: Config) => Promise<unknown>;
  } = {},
) {
  mockHttp.mockImplementation((config) => {
    const url = config.url ?? "";
    const metodo = (config.method ?? "get").toLowerCase();
    if (url === "/api/auth/yo") {
      return respuesta(
        200,
        {
          id: ASESOR.id,
          nombre: ASESOR.nombre,
          email: "laura@rumbo.test",
          rol: opciones.rol ?? "empleado",
          acceso_redes: false,
        },
        config,
      );
    }
    if (url === "/api/usuarios/asesores") return respuesta(200, [ASESOR], config);
    if (url === "/api/clientes" && metodo === "post") {
      const cuerpo = (
        typeof config.data === "string" ? JSON.parse(config.data) : config.data
      ) as Record<string, unknown>;
      cuerpos.push(cuerpo);
      if (opciones.alta) return opciones.alta(cuerpo, config);
      if (opciones.duplicados && !cuerpo["confirmar_duplicado"]) {
        return respuesta(
          409,
          {
            title: "Conflicto",
            status: 409,
            detail: "Ya existe un cliente con ese contacto.",
            duplicados: opciones.duplicados,
          },
          config,
        );
      }
      return respuesta(
        201,
        fichaDe(NUEVO_ID, String(cuerpo["nombre"]), String(cuerpo["contacto"])),
        config,
      );
    }
    if (url === "/api/clientes") {
      return respuesta(200, { items: [], total: 0, pagina: 1, por_pagina: 20 }, config);
    }
    if (/^\/api\/clientes\/([^/]+)\/historial$/.test(url)) {
      return respuesta(200, { oportunidades: [], viajes: [], resenas: [] }, config);
    }
    const ficha = /^\/api\/clientes\/([^/]+)$/.exec(url);
    if (ficha) {
      const id = ficha[1];
      if (id === NUEVO_ID) {
        return respuesta(200, fichaDe(NUEVO_ID, "Ana Gómez", "ana@mail.test"), config);
      }
      if (id === sosa.id) return respuesta(200, sosa, config);
    }
    return respuesta(404, {}, config);
  });
}

function altasEnviadas() {
  return mockHttp.mock.calls
    .map(([config]) => config)
    .filter((c) => c.url === "/api/clientes" && (c.method ?? "").toLowerCase() === "post");
}

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Raiz() {
  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}

function renderAlta(initialUrl = "/clientes/nuevo") {
  queryClient.clear();
  return renderRouter(
    {
      _layout: Raiz,
      "(pestanas)/clientes/index": ListaClientes,
      "(pestanas)/clientes/nuevo": NuevoClienteMobile,
      "(pestanas)/clientes/[id]": FichaClienteMobile,
    },
    { initialUrl },
  );
}

type Vista = Awaited<ReturnType<typeof renderAlta>>;

async function completar(vista: Vista, nombre: string, contacto: string) {
  await fireEvent.changeText(await vista.findByLabelText(/^nombre/i), nombre);
  await fireEvent.changeText(vista.getByLabelText(/^contacto/i), contacto);
}
const registrar = (vista: Vista) => vista.getByRole("button", { name: /registrar cliente/i });

beforeEach(() => {
  jest.clearAllMocks();
  cuerpos.length = 0;
});

describe("RF-002 datos mínimos mobile", () => {
  it("RF-002 muestra nombre, contacto, Instagram opcional y los segmentos", async () => {
    backend();
    const vista = await renderAlta();

    expect(await vista.findByLabelText(/^nombre/i)).toBeTruthy();
    expect(vista.getByLabelText(/^contacto/i)).toBeTruthy();
    expect(vista.getByLabelText(/instagram \(opcional\)/i)).toBeTruthy();
    for (const segmento of [/^familia$/i, /^pareja$/i, /^amigos$/i, /^individual$/i]) {
      expect(vista.getByRole("button", { name: segmento })).toBeTruthy();
    }
  });

  it("RF-002 sin nombre no manda el alta y marca el campo", async () => {
    backend();
    const vista = await renderAlta();
    await fireEvent.changeText(await vista.findByLabelText(/^contacto/i), "ana@mail.test");

    await fireEvent.press(registrar(vista));

    expect(await vista.findByText("Ingresá el nombre.")).toBeTruthy();
    expect(altasEnviadas()).toHaveLength(0);
  });

  it("RF-002 sin contacto no manda el alta y marca el campo", async () => {
    backend();
    const vista = await renderAlta();
    await fireEvent.changeText(await vista.findByLabelText(/^nombre/i), "Ana Gómez");

    await fireEvent.press(registrar(vista));

    expect(await vista.findByText("Ingresá un teléfono o un email válido.")).toBeTruthy();
    expect(altasEnviadas()).toHaveLength(0);
  });

  it("RF-002 un contacto que no es teléfono ni email se rechaza", async () => {
    backend();
    const vista = await renderAlta();
    await completar(vista, "Ana Gómez", "no-es-un-contacto");

    await fireEvent.press(registrar(vista));

    expect(await vista.findByText("Ingresá un teléfono o un email válido.")).toBeTruthy();
    expect(altasEnviadas()).toHaveLength(0);
  });

  it("RF-002 el Instagram no cuenta como contacto mínimo", async () => {
    backend();
    const vista = await renderAlta();
    await fireEvent.changeText(await vista.findByLabelText(/^nombre/i), "Ana Gómez");
    await fireEvent.changeText(vista.getByLabelText(/instagram \(opcional\)/i), "ana.gomez");

    await fireEvent.press(registrar(vista));

    expect(await vista.findByText("Ingresá un teléfono o un email válido.")).toBeTruthy();
    expect(altasEnviadas()).toHaveLength(0);
  });

  it("RF-002 el Instagram es opcional: sin él el alta sale igual", async () => {
    backend();
    const vista = await renderAlta();
    await completar(vista, "Ana Gómez", "ana@mail.test");

    await fireEvent.press(registrar(vista));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({ nombre: "Ana Gómez", contacto: "ana@mail.test" });
    expect(cuerpos[0]?.["instagram"] ?? null).toBeNull();
  });

  it("RF-002 manda el Instagram cuando se completa", async () => {
    backend();
    const vista = await renderAlta();
    await completar(vista, "Ana Gómez", "ana@mail.test");
    await fireEvent.changeText(vista.getByLabelText(/instagram \(opcional\)/i), "ana.gomez");

    await fireEvent.press(registrar(vista));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["instagram"]).toBe("ana.gomez");
  });

  it("RF-002 un Instagram con formato inválido se rechaza", async () => {
    backend();
    const vista = await renderAlta();
    await completar(vista, "Ana Gómez", "ana@mail.test");
    await fireEvent.changeText(vista.getByLabelText(/instagram \(opcional\)/i), "ana gomez!!");

    await fireEvent.press(registrar(vista));

    expect(
      await vista.findByText("Usá letras, números, puntos o guiones bajos (hasta 30)."),
    ).toBeTruthy();
    expect(altasEnviadas()).toHaveLength(0);
  });

  it("RF-002 el segmento elegido viaja en el alta", async () => {
    backend();
    const vista = await renderAlta();
    await completar(vista, "Ana Gómez", "ana@mail.test");
    await fireEvent.press(vista.getByRole("button", { name: /^pareja$/i }));

    await fireEvent.press(registrar(vista));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["segmento"]).toBe("pareja");
  });

  it("RF-002 tras el alta se abre la ficha del cliente nuevo", async () => {
    backend();
    const vista = await renderAlta();
    await completar(vista, "Ana Gómez", "ana@mail.test");

    await fireEvent.press(registrar(vista));

    await waitFor(() => {
      expect(vista).toHavePathname(`/clientes/${NUEVO_ID}`);
    });
    expect(await vista.findByText("Ana Gómez")).toBeTruthy();
  });

  it("RF-002 muestra los errores 422 del servidor en su campo y no abre la ficha", async () => {
    backend({
      alta: (_cuerpo, config) =>
        respuesta(
          422,
          {
            title: "Error de validación",
            status: 422,
            errores: [{ campo: "nombre", mensaje: "El nombre ya está en uso." }],
          },
          config,
        ),
    });
    const vista = await renderAlta();
    await completar(vista, "Ana Gómez", "ana@mail.test");

    await fireEvent.press(registrar(vista));

    expect(await vista.findByText("El nombre ya está en uso.")).toBeTruthy();
    expect(vista).toHavePathname("/clientes/nuevo");
  });

  it("RF-002 un fallo inesperado del servidor muestra un aviso de error accesible", async () => {
    backend({ alta: (_cuerpo, config) => respuesta(500, {}, config) });
    const vista = await renderAlta();
    await completar(vista, "Ana Gómez", "ana@mail.test");

    await fireEvent.press(registrar(vista));

    await vista.findByRole("alert");
    expect(vista).toHavePathname("/clientes/nuevo");
  });

  it("RF-002 el freelance no ve el selector de asesor y no manda asesor_asignado_id", async () => {
    backend({ rol: "freelance" });
    const vista = await renderAlta();
    await completar(vista, "Ana Gómez", "ana@mail.test");

    expect(vista.queryByText(/asesor asignado/i)).toBeNull();
    await fireEvent.press(registrar(vista));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["asesor_asignado_id"] ?? null).toBeNull();
  });

  it("RF-002 un empleado ve el selector de asesor asignado", async () => {
    backend({ rol: "empleado" });
    const vista = await renderAlta();

    expect(await vista.findByText(/asesor asignado/i)).toBeTruthy();
    expect(await vista.findByRole("button", { name: ASESOR.nombre })).toBeTruthy();
  });

  it("RF-002 el empleado elige un asesor y el alta lo manda", async () => {
    backend({ rol: "empleado" });
    const vista = await renderAlta();
    await completar(vista, "Ana Gómez", "ana@mail.test");
    await fireEvent.press(await vista.findByRole("button", { name: ASESOR.nombre }));

    await fireEvent.press(registrar(vista));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["asesor_asignado_id"]).toBe(ASESOR.id);
  });

  it("RF-002 muestra el 422 del servidor sobre el asesor", async () => {
    backend({
      alta: (_cuerpo, config) =>
        respuesta(
          422,
          {
            title: "Error de validación",
            status: 422,
            errores: [{ campo: "asesor_asignado_id", mensaje: "El asesor no está activo." }],
          },
          config,
        ),
    });
    const vista = await renderAlta();
    await completar(vista, "Ana Gómez", "ana@mail.test");
    await vista.findByRole("button", { name: ASESOR.nombre });

    await fireEvent.press(registrar(vista));

    expect(await vista.findByText("El asesor no está activo.")).toBeTruthy();
    expect(vista).toHavePathname("/clientes/nuevo");
  });

  it("RF-002 desde la lista de clientes, «Nuevo cliente» abre el formulario de alta", async () => {
    backend();
    const vista = await renderAlta("/clientes");

    await fireEvent.press(await vista.findByRole("button", { name: /nuevo cliente/i }));

    await waitFor(() => {
      expect(vista).toHavePathname("/clientes/nuevo");
    });
  });
});

describe("RF-003 duplicado mobile", () => {
  async function altaDuplicada(rol: Rol = "empleado", duplicados: unknown[] = [sosa]) {
    backend({ rol, duplicados });
    const vista = await renderAlta();
    await completar(vista, "Familia Sosa Nueva", sosa.contacto);
    await fireEvent.press(registrar(vista));
    return vista;
  }

  it("RF-003 si el servidor avisa un duplicado, lista los candidatos con nombre y contacto", async () => {
    const vista = await altaDuplicada();

    expect(await vista.findByRole("alert")).toBeTruthy();
    expect(vista.getByText(/posible cliente duplicado/i)).toBeTruthy();
    expect(vista.getByText("Familia Sosa")).toBeTruthy();
    expect(vista.getAllByText("sosa.familia@mail.test").length).toBeGreaterThan(0);
    expect(vista).toHavePathname("/clientes/nuevo");
    expect(altasEnviadas()).toHaveLength(1);
  });

  it("RF-003 «Ir al cliente existente» abre la ficha del candidato sin crear otro", async () => {
    const vista = await altaDuplicada();

    await fireEvent.press(await vista.findByRole("button", { name: /ir al cliente existente/i }));

    await waitFor(() => {
      expect(vista).toHavePathname(`/clientes/${sosa.id}`);
    });
    expect(altasEnviadas()).toHaveLength(1);
  });

  it("RF-003 «Confirmar alta» reenvía el alta con confirmar_duplicado y abre la ficha nueva", async () => {
    const vista = await altaDuplicada();

    await act(async () => {
      await fireEvent.press(await vista.findByRole("button", { name: /confirmar alta/i }));
    });

    await waitFor(() => {
      expect(vista).toHavePathname(`/clientes/${NUEVO_ID}`);
    });
    expect(cuerpos).toHaveLength(2);
    expect(cuerpos[0]?.["confirmar_duplicado"] ?? false).toBe(false);
    expect(cuerpos[1]).toMatchObject({
      nombre: "Familia Sosa Nueva",
      contacto: sosa.contacto,
      confirmar_duplicado: true,
    });
  });

  it("RF-003 el freelance, sin candidatos, ve el aviso de cliente ajeno y puede confirmar", async () => {
    const vista = await altaDuplicada("freelance", []);

    expect(
      await vista.findByText(
        "Ya hay un cliente con ese contacto en la agencia. Consultalo con un admin",
      ),
    ).toBeTruthy();
    expect(vista.queryByRole("button", { name: /ir al cliente existente/i })).toBeNull();

    await fireEvent.press(vista.getByRole("button", { name: /confirmar alta/i }));

    await waitFor(() => {
      expect(vista).toHavePathname(`/clientes/${NUEVO_ID}`);
    });
    expect(cuerpos[1]?.["confirmar_duplicado"]).toBe(true);
    expect(cuerpos[1]?.["asesor_asignado_id"] ?? null).toBeNull();
  });

  it("RF-003 con candidatos no se muestra el aviso del freelance", async () => {
    const vista = await altaDuplicada("admin");

    await vista.findByText("Familia Sosa");
    expect(vista.queryByText(/consultalo con un admin/i)).toBeNull();
  });

  it("RF-003 editar el contacto tras el aviso oculta el aviso y el botón «Confirmar alta»", async () => {
    const vista = await altaDuplicada();
    await vista.findByRole("button", { name: /confirmar alta/i });

    await fireEvent.changeText(vista.getByLabelText(/^contacto/i), "otro@mail.test");

    await waitFor(() => {
      expect(vista.queryByRole("button", { name: /confirmar alta/i })).toBeNull();
    });
    expect(vista.queryByRole("alert")).toBeNull();
    expect(vista.queryByText("Familia Sosa")).toBeNull();
  });

  it("RF-003 editar el nombre tras el aviso también oculta el aviso", async () => {
    const vista = await altaDuplicada();
    await vista.findByRole("button", { name: /confirmar alta/i });

    await fireEvent.changeText(vista.getByLabelText(/^nombre/i), "Otro nombre");

    await waitFor(() => {
      expect(vista.queryByRole("button", { name: /confirmar alta/i })).toBeNull();
    });
  });

  it("RF-003 editar el Instagram tras el aviso también oculta el aviso", async () => {
    const vista = await altaDuplicada();
    await vista.findByRole("button", { name: /confirmar alta/i });

    await fireEvent.changeText(vista.getByLabelText(/instagram \(opcional\)/i), "sosa.nueva");

    await waitFor(() => {
      expect(vista.queryByRole("button", { name: /confirmar alta/i })).toBeNull();
    });
  });

  it("RF-003 cambiar el segmento tras el aviso también oculta el aviso", async () => {
    const vista = await altaDuplicada();
    await vista.findByRole("button", { name: /confirmar alta/i });

    await fireEvent.press(vista.getByRole("button", { name: /^pareja$/i }));

    await waitFor(() => {
      expect(vista.queryByRole("button", { name: /confirmar alta/i })).toBeNull();
    });
  });

  it("RF-003 cambiar el asesor tras el aviso también oculta el aviso", async () => {
    const vista = await altaDuplicada();
    await vista.findByRole("button", { name: /confirmar alta/i });

    await fireEvent.press(await vista.findByRole("button", { name: ASESOR.nombre }));

    await waitFor(() => {
      expect(vista.queryByRole("button", { name: /confirmar alta/i })).toBeNull();
    });
  });

  it("RF-003 si se edita mientras el alta está en vuelo, el 409 tardío no muestra el aviso", async () => {
    let soltar = () => {};
    const respuestaTardia = new Promise<void>((resolver) => {
      soltar = resolver;
    });
    backend({
      alta: async (_cuerpo, config) => {
        await respuestaTardia;
        return respuesta(
          409,
          {
            title: "Conflicto",
            status: 409,
            detail: "Ya existe un cliente con ese contacto.",
            duplicados: [sosa],
          },
          config,
        );
      },
    });
    const vista = await renderAlta();
    await completar(vista, "Familia Sosa Nueva", sosa.contacto);
    await fireEvent.press(registrar(vista));

    await fireEvent.changeText(vista.getByLabelText(/^contacto/i), "otro@mail.test");
    await act(async () => {
      soltar();
      await respuestaTardia;
    });

    await waitFor(() => {
      expect(vista.queryByText("Familia Sosa")).toBeNull();
    });
    expect(vista.queryByRole("button", { name: /confirmar alta/i })).toBeNull();
  });

  it("RF-003 tras editar, volver a «Registrar cliente» hace un POST nuevo sin confirmar_duplicado", async () => {
    const vista = await altaDuplicada();
    await vista.findByRole("button", { name: /confirmar alta/i });

    await fireEvent.changeText(vista.getByLabelText(/^contacto/i), "otro@mail.test");
    await waitFor(() => {
      expect(vista.queryByRole("button", { name: /confirmar alta/i })).toBeNull();
    });
    await fireEvent.press(registrar(vista));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(2);
    });
    expect(cuerpos[1]).toMatchObject({ contacto: "otro@mail.test" });
    expect(cuerpos[1]?.["confirmar_duplicado"] ?? false).toBe(false);
    expect(await vista.findByRole("alert")).toBeTruthy();
  });
});
