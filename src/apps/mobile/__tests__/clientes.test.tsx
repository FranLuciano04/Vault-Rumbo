import { Linking } from "react-native";
import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Slot } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ListaClientes } from "../src/features/clientes/ListaClientes";
import { FichaClienteMobile } from "../src/features/clientes/FichaClienteMobile";

jest.mock("../global.css", () => ({}));
jest.mock("../src/lib/firebase", () => ({ obtenerTokenId: jest.fn() }));

// MSW no carga bajo jest-expo (ver login.test.tsx): se usa el cliente real de `@rumbo/shared`
// con un adaptador HTTP falso que responde las rutas de /api/clientes.
type Config = { url?: string; params?: Record<string, unknown> };
const mockHttp = jest.fn<Promise<unknown>, [Config]>();
jest.mock("../src/cliente", () => {
  const { crearCliente } = jest.requireActual<typeof import("@rumbo/shared")>("@rumbo/shared");
  const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => null });
  cliente.defaults.adapter = ((config: never) => mockHttp(config)) as never;
  return { cliente };
});

const ASESOR = { id: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03", nombre: "Laura Asesora" };

function listado(n: number, nombre: string, contacto: string, extra = {}) {
  return {
    id: `id-${String(n)}`,
    nombre,
    contacto,
    instagram: null,
    segmento: "pareja",
    etiquetas: ["Caribe"],
    preferencias: "Hoteles todo incluido.",
    no_recontactar: false,
    asesor_asignado_id: ASESOR.id,
    asesor: ASESOR,
    ultimo_viaje: null,
    oportunidades_abiertas: 0,
    created_by: ASESOR.id,
    updated_by: ASESOR.id,
    created_at: "2026-01-12T14:30:00Z",
    updated_at: "2026-03-02T10:15:00Z",
    ...extra,
  };
}

const camila = listado(1, "Camila Benítez", "+54 9 11 5555-1234", { instagram: "camila.benitez" });
const sosa = listado(2, "Familia Sosa", "sosa.familia@mail.test", { segmento: "familia" });
const joaquin = listado(3, "Joaquín Ramos", "+54 9 351 555-9876", { no_recontactar: true });

const historial = {
  oportunidades: [
    {
      id: "op-1",
      destino_consultado: "Punta Cana",
      estado: "ganada",
      fecha_desde_tentativa: "2026-02-10",
      fecha_hasta_tentativa: "2026-02-20",
    },
  ],
  viajes: [
    {
      id: "vi-1",
      destino_id: "de-1",
      estado: "finalizado",
      fecha_salida: "2026-02-10",
      fecha_regreso: "2026-02-20",
    },
  ],
  resenas: [
    {
      id: "re-1",
      hotel_id: "ho-1",
      puntaje: 5,
      comentario: "Excelente atención y muy buena ubicación.",
      fecha: "2026-02-25",
      estado: "publicada",
    },
  ],
};
const SIN_HISTORIAL = { oportunidades: [], viajes: [], resenas: [] };

function respuesta(status: number, data: unknown, config: unknown) {
  const response = { data, status, statusText: "", headers: {}, config };
  return status < 400
    ? Promise.resolve(response)
    : Promise.reject(Object.assign(new Error("fallo"), { isAxiosError: true, config, response }));
}

/** Backend falso: `paginas` es la lista de ítems de cada página; `fichas` e `historiales` por id. */
function backend(opciones: {
  paginas?: unknown[][];
  fichas?: Record<string, unknown>;
  historiales?: Record<string, unknown>;
  falla?: number;
}) {
  const paginas = opciones.paginas ?? [[camila, sosa, joaquin]];
  const total = paginas.flat().length;
  mockHttp.mockImplementation((config) => {
    const url = config.url ?? "";
    if (opciones.falla) return respuesta(opciones.falla, {}, config);
    const historialDe = /^\/api\/clientes\/([^/]+)\/historial$/.exec(url);
    if (historialDe) {
      const id = historialDe[1] as string;
      return respuesta(200, opciones.historiales?.[id] ?? SIN_HISTORIAL, config);
    }
    const fichaDe = /^\/api\/clientes\/([^/]+)$/.exec(url);
    if (fichaDe) {
      const ficha = opciones.fichas?.[fichaDe[1] as string];
      return ficha ? respuesta(200, ficha, config) : respuesta(404, {}, config);
    }
    if (url === "/api/clientes") {
      const pagina = Number(config.params?.["pagina"] ?? 1);
      const items = paginas[pagina - 1] ?? [];
      return respuesta(200, { items, total, pagina, por_pagina: 20 }, config);
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

function renderClientes(initialUrl = "/clientes") {
  queryClient.clear();
  return renderRouter(
    {
      _layout: Raiz,
      "(pestanas)/clientes/index": ListaClientes,
      "(pestanas)/clientes/[id]": FichaClienteMobile,
    },
    { initialUrl },
  );
}

function llamadasLista() {
  return mockHttp.mock.calls
    .map(([config]) => config)
    .filter((config) => config.url === "/api/clientes");
}

let abrir: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  abrir = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
});

describe("RF-005 búsqueda mobile", () => {
  it("lista los clientes que devuelve GET /api/clientes con su nombre y contacto", async () => {
    backend({});
    const vista = await renderClientes();

    await vista.findByText("Camila Benítez");
    expect(vista.getByText("Familia Sosa")).toBeTruthy();
    expect(vista.getByText("Joaquín Ramos")).toBeTruthy();
    expect(vista.getByText("+54 9 11 5555-1234")).toBeTruthy();
  });

  it("pide la primera página sin filtros y no agrega un filtro propio de asesor (lo resuelve el backend)", async () => {
    backend({});
    const vista = await renderClientes();
    await vista.findByText("Camila Benítez");

    const params = llamadasLista()[0]?.params ?? {};
    expect(params["pagina"] ?? 1).toBe(1);
    expect(params["buscar"] ?? "").toBe("");
    expect(params).not.toHaveProperty("mios");
  });

  it("buscar por texto vuelve a consultar con el parámetro buscar y muestra solo lo devuelto", async () => {
    backend({});
    const vista = await renderClientes();
    await vista.findByText("Camila Benítez");

    mockHttp.mockClear();
    backend({ paginas: [[sosa]] });
    await fireEvent.changeText(vista.getByLabelText(/buscar cliente/i), "sosa");

    await waitFor(() => {
      expect(llamadasLista().some((c) => c.params?.["buscar"] === "sosa")).toBe(true);
    });
    await waitFor(() => {
      expect(vista.queryByText("Camila Benítez")).toBeNull();
    });
    expect(vista.getByText("Familia Sosa")).toBeTruthy();
  });

  it("una búsqueda sin resultados muestra un mensaje de lista vacía", async () => {
    backend({ paginas: [[]] });
    const vista = await renderClientes();

    await vista.findByText(/no encontramos clientes/i);
  });

  it("scroll paginado: al llegar al final de la lista pide la página siguiente y agrega los clientes", async () => {
    backend({ paginas: [[camila, sosa], [joaquin]] });
    const vista = await renderClientes();
    await vista.findByText("Camila Benítez");
    expect(vista.queryByText("Joaquín Ramos")).toBeNull();

    await act(async () => {
      await fireEvent(vista.getByTestId("lista-clientes"), "endReached");
    });

    await vista.findByText("Joaquín Ramos");
    expect(llamadasLista().some((c) => c.params?.["pagina"] === 2)).toBe(true);
    expect(vista.getByText("Camila Benítez")).toBeTruthy();
  });

  it("no pide más páginas cuando ya se cargaron todos los clientes", async () => {
    backend({ paginas: [[camila, sosa, joaquin]] });
    const vista = await renderClientes();
    await vista.findByText("Camila Benítez");

    await act(async () => {
      await fireEvent(vista.getByTestId("lista-clientes"), "endReached");
    });

    expect(llamadasLista()).toHaveLength(1);
  });

  it("si la consulta falla muestra un aviso de error accesible", async () => {
    backend({ falla: 500 });
    const vista = await renderClientes();

    await vista.findByRole("alert");
    expect(vista.getByText(/no pudimos cargar los clientes/i)).toBeTruthy();
  });

  it("una búsqueda nueva después de paginar reemplaza la lista y pide pagina=1", async () => {
    backend({ paginas: [[camila, sosa], [joaquin]] });
    const vista = await renderClientes();
    await vista.findByText("Camila Benítez");
    await act(async () => {
      await fireEvent(vista.getByTestId("lista-clientes"), "endReached");
    });
    await vista.findByText("Joaquín Ramos");

    mockHttp.mockClear();
    backend({ paginas: [[sosa]] });
    await fireEvent.changeText(vista.getByLabelText(/buscar cliente/i), "sosa");

    await waitFor(() => {
      expect(
        llamadasLista().some((c) => c.params?.["buscar"] === "sosa" && c.params["pagina"] === 1),
      ).toBe(true);
    });
    await waitFor(() => {
      expect(vista.queryByText("Joaquín Ramos")).toBeNull();
    });
    expect(vista.queryByText("Camila Benítez")).toBeNull();
    expect(vista.getByText("Familia Sosa")).toBeTruthy();
  });

  it("si falla una página siguiente se puede reintentar y se agregan los clientes", async () => {
    backend({ paginas: [[camila, sosa], [joaquin]] });
    const vista = await renderClientes();
    await vista.findByText("Camila Benítez");

    const normal = mockHttp.getMockImplementation() as (config: Config) => Promise<unknown>;
    mockHttp.mockImplementation((config) =>
      config.url === "/api/clientes" && config.params?.["pagina"] === 2
        ? respuesta(500, {}, config)
        : normal(config),
    );
    await act(async () => {
      await fireEvent(vista.getByTestId("lista-clientes"), "endReached");
    });
    await vista.findByRole("alert");

    mockHttp.mockImplementation(normal);
    await fireEvent.press(vista.getByRole("button", { name: /reintentar/i }));

    await vista.findByText("Joaquín Ramos");
    expect(vista.getByText("Camila Benítez")).toBeTruthy();
    expect(vista.queryByRole("alert")).toBeNull();
  });

  it("tocar un cliente abre su ficha", async () => {
    backend({ fichas: { "id-1": camila } });
    const vista = await renderClientes();
    await fireEvent.press(await vista.findByText("Camila Benítez"));

    await waitFor(() => {
      expect(vista).toHavePathname("/clientes/id-1");
    });
  });
});

describe("RF-005 lista mobile con caché ya poblada (H-06 de M2)", () => {
  // Misma clave que arma `useClientes`: ["clientes", "buscar", filtros].
  const CLAVE_PAGINA_1 = ["clientes", "buscar", { buscar: "", pagina: 1 }];

  function renderConCache() {
    return renderRouter(
      { _layout: Raiz, "(pestanas)/clientes/index": ListaClientes },
      { initialUrl: "/clientes" },
    );
  }

  it("RF-005 con la primera página en caché y un refetch idéntico, la lista muestra los clientes y no el vacío", async () => {
    backend({ paginas: [[camila, sosa, joaquin]] });
    queryClient.clear();
    queryClient.setQueryData(CLAVE_PAGINA_1, {
      items: [camila, sosa, joaquin],
      total: 3,
      pagina: 1,
      por_pagina: 20,
    });
    const vista = await renderConCache();

    // El refetch al montar termina (la caché está vencida) y devuelve el mismo contenido.
    await waitFor(() => {
      expect(llamadasLista()).toHaveLength(1);
    });
    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(0);
    });

    expect(vista.queryByText(/no encontramos clientes/i)).toBeNull();
    expect(vista.getByText("Camila Benítez")).toBeTruthy();
    expect(vista.getByText("Familia Sosa")).toBeTruthy();
    expect(vista.getByText("Joaquín Ramos")).toBeTruthy();
  });

  const PAGINA_1_DE_2 = { items: [camila, sosa], total: 3, pagina: 1, por_pagina: 20 };

  it("RF-005 con la página 1 en caché, al llegar al final durante un refetch en segundo plano se agrega la página 2 sin perder la 1", async () => {
    backend({ paginas: [[camila, sosa], [joaquin]] });
    const responder = mockHttp.getMockImplementation() as (config: Config) => Promise<unknown>;
    // El refetch de la página 1 queda pendiente hasta que el test lo libera.
    let liberarPagina1 = () => {};
    mockHttp.mockImplementation((config) => {
      if (config.url === "/api/clientes" && config.params?.["pagina"] === 1) {
        return new Promise((resolver) => {
          liberarPagina1 = () => {
            resolver(responder(config));
          };
        });
      }
      return responder(config);
    });
    queryClient.clear();
    queryClient.setQueryData(CLAVE_PAGINA_1, PAGINA_1_DE_2);
    const vista = await renderConCache();

    await vista.findByText("Camila Benítez");
    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(1);
    });

    await act(async () => {
      await fireEvent(vista.getByTestId("lista-clientes"), "endReached");
    });

    await vista.findByText("Joaquín Ramos");
    expect(llamadasLista().some((c) => c.params?.["pagina"] === 2)).toBe(true);

    await act(() => {
      liberarPagina1();
    });
    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(0);
    });
    const nombres = vista
      .getAllByText(/^(Camila Benítez|Familia Sosa|Joaquín Ramos)$/)
      .map((n) => n.props.children as string);
    expect(nombres).toEqual(["Camila Benítez", "Familia Sosa", "Joaquín Ramos"]);
  });

  it("RF-005 la página 2 sigue visible pasada la espera de la búsqueda y no se vuelve a pedir la página 1", async () => {
    backend({ paginas: [[camila, sosa], [joaquin]] });
    queryClient.clear();
    queryClient.setQueryData(CLAVE_PAGINA_1, PAGINA_1_DE_2);
    const montado = Date.now();
    const vista = await renderConCache();

    await vista.findByText("Camila Benítez");
    await act(async () => {
      await fireEvent(vista.getByTestId("lista-clientes"), "endReached");
    });
    await vista.findByText("Joaquín Ramos");

    // Espera acotada: hay que dejar pasar la espera de 300 ms de la búsqueda, que usa temporizadores reales.
    await waitFor(
      () => {
        expect(Date.now() - montado).toBeGreaterThan(450);
      },
      { timeout: 2000 },
    );

    expect(vista.getByText("Joaquín Ramos")).toBeTruthy();
    const paginasPedidas = llamadasLista().map((c) => c.params?.["pagina"]);
    expect(paginasPedidas.slice(paginasPedidas.lastIndexOf(2))).toEqual([2]);
  });
  // Caché vacía: ya cubierto por "lista los clientes que devuelve GET /api/clientes…" y "scroll paginado…".
});

describe("RF-006 ficha mobile", () => {
  it("muestra los datos del cliente: nombre, contacto, instagram, segmento, etiquetas y preferencias", async () => {
    backend({ fichas: { "id-1": camila } });
    const vista = await renderClientes("/clientes/id-1");

    await vista.findByText("Camila Benítez");
    expect(vista.getByText("+54 9 11 5555-1234")).toBeTruthy();
    expect(vista.getByText(/camila\.benitez/)).toBeTruthy();
    expect(vista.getByText(/pareja/i)).toBeTruthy();
    expect(vista.getByText("Caribe")).toBeTruthy();
    expect(vista.getByText("Hoteles todo incluido.")).toBeTruthy();
  });

  it("muestra el historial: oportunidades, viajes y reseñas", async () => {
    backend({ fichas: { "id-1": camila }, historiales: { "id-1": historial } });
    const vista = await renderClientes("/clientes/id-1");

    await vista.findByText("Punta Cana");
    expect(vista.getByText(/ganada/i)).toBeTruthy();
    expect(vista.getByText(/finalizado/i)).toBeTruthy();
    expect(vista.getByText(/excelente atención/i)).toBeTruthy();
  });

  it("un cliente sin movimientos muestra los vacíos del historial", async () => {
    backend({ fichas: { "id-2": sosa } });
    const vista = await renderClientes("/clientes/id-2");

    await vista.findByText("Familia Sosa");
    expect(await vista.findByText(/sin oportunidades/i)).toBeTruthy();
    expect(vista.getByText(/sin viajes/i)).toBeTruthy();
    expect(vista.getByText(/sin reseñas/i)).toBeTruthy();
  });

  it("acciones de contacto con teléfono: Llamar abre tel: y WhatsApp abre wa.me con solo dígitos", async () => {
    backend({ fichas: { "id-1": camila } });
    const vista = await renderClientes("/clientes/id-1");
    await vista.findByText("Camila Benítez");

    await fireEvent.press(vista.getByRole("button", { name: /llamar/i }));
    expect(abrir).toHaveBeenCalledWith("tel:+5491155551234");

    await fireEvent.press(vista.getByRole("button", { name: /whatsapp/i }));
    expect(abrir).toHaveBeenCalledWith("https://wa.me/5491155551234");
  });

  it("acciones de contacto con email: Enviar email abre mailto: y no ofrece llamar", async () => {
    backend({ fichas: { "id-2": sosa } });
    const vista = await renderClientes("/clientes/id-2");
    await vista.findByText("Familia Sosa");

    await fireEvent.press(vista.getByRole("button", { name: /enviar email/i }));
    expect(abrir).toHaveBeenCalledWith("mailto:sosa.familia@mail.test");
    expect(vista.queryByRole("button", { name: /llamar/i })).toBeNull();
    expect(vista.queryByRole("button", { name: /whatsapp/i })).toBeNull();
  });

  it("un cliente con no_recontactar sigue mostrando las acciones de contacto y la etiqueta informativa", async () => {
    backend({ fichas: { "id-3": joaquin } });
    const vista = await renderClientes("/clientes/id-3");
    await vista.findByText("Joaquín Ramos");

    expect(vista.getByText(/no incluir en recontactos/i)).toBeTruthy();
    expect(vista.getByRole("button", { name: /llamar/i })).toBeTruthy();
    expect(vista.getByRole("button", { name: /whatsapp/i })).toBeTruthy();
  });

  it("un contacto sin un teléfono válido no ofrece llamar ni WhatsApp", async () => {
    const raro = listado(4, "Cliente Raro", "consultar por Instagram");
    backend({ fichas: { "id-4": raro } });
    const vista = await renderClientes("/clientes/id-4");
    await vista.findByText("Cliente Raro");

    expect(vista.queryByRole("button", { name: /llamar/i })).toBeNull();
    expect(vista.queryByRole("button", { name: /whatsapp/i })).toBeNull();
  });

  it("un teléfono que no se puede pasar a WhatsApp ofrece Llamar con los dígitos tal como están escritos", async () => {
    const fijo = listado(5, "Cliente Fijo", "4444-5555");
    backend({ fichas: { "id-5": fijo } });
    const vista = await renderClientes("/clientes/id-5");
    await vista.findByText("Cliente Fijo");

    await fireEvent.press(vista.getByRole("button", { name: /llamar/i }));
    expect(abrir).toHaveBeenCalledWith("tel:44445555");
    expect(vista.queryByRole("button", { name: /whatsapp/i })).toBeNull();
  });

  it("Volver sin historial de navegación lleva a la lista de clientes", async () => {
    backend({ fichas: { "id-1": camila } });
    const vista = await renderClientes("/clientes/id-1");
    await vista.findByText("Camila Benítez");

    await fireEvent.press(vista.getByRole("button", { name: /volver/i }));

    await waitFor(() => {
      expect(vista).toHavePathname("/clientes");
    });
  });

  it("la ficha ofrece volver también cuando el cliente no existe", async () => {
    backend({ fichas: {} });
    const vista = await renderClientes("/clientes/id-99");

    await vista.findByText(/cliente no encontrado/i);
    expect(vista.getByRole("button", { name: /volver/i })).toBeTruthy();
  });

  it("un cliente inexistente o ajeno (404 del backend, caso freelance) muestra 'Cliente no encontrado'", async () => {
    backend({ fichas: {} });
    const vista = await renderClientes("/clientes/id-99");

    await vista.findByText(/cliente no encontrado/i);
    expect(abrir).not.toHaveBeenCalled();
  });

  it("si falla la carga del historial la ficha sigue visible y avisa del error", async () => {
    backend({ fichas: { "id-1": camila } });
    const base = mockHttp.getMockImplementation() as (config: Config) => Promise<unknown>;
    mockHttp.mockImplementation((config) =>
      /historial$/.test(config.url ?? "") ? respuesta(500, {}, config) : base(config),
    );
    const vista = await renderClientes("/clientes/id-1");

    await vista.findByText("Camila Benítez");
    await vista.findByText(/no pudimos cargar el historial/i);
  });
});
