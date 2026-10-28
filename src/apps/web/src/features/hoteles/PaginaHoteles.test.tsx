import { crearCliente } from "@rumbo/shared";
import {
  crearServidor,
  destinosMock,
  hotelesMock,
  manejadoresHotelesPara,
  manejadoresM1,
  usuariosPorRol,
  type RolMock,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse, type RequestHandler } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { PaginaHoteles } from "./PaginaHoteles";

const servidor = crearServidor(...manejadoresHotelesPara("empleado"), ...manejadoresM1);
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  servidor.resetHandlers();
  servidor.events.removeAllListeners();
});
afterAll(() => {
  servidor.close();
});

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });
const bariloche = destinosMock[0].id;

/** Monta el catálogo con los handlers del rol; el alta es otro ticket, así que su ruta es un marcador. */
function renderPagina(rol: RolMock = "empleado", ...propios: RequestHandler[]) {
  // `use` antepone: en la lista van primero los propios del test y después los del rol.
  servidor.use(...propios, ...manejadoresHotelesPara(rol));
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/hoteles"]}>
        <Routes>
          <Route
            path="/hoteles"
            element={<PaginaHoteles cliente={cliente} usuario={usuariosPorRol[rol]} />}
          />
          <Route path="/hoteles/nuevo" element={<p>Alta de hotel</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Registra los parámetros de cada pedido al catálogo, sin cambiar la respuesta del mock. */
function espiar(pedidos: URLSearchParams[]) {
  servidor.events.on("request:start", ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === "/api/hoteles") pedidos.push(url.searchParams);
  });
}

/** Responde siempre con los hoteles activos del mock y un total a elección, para la paginación. */
function paginaFija(total: number, pedidos: URLSearchParams[]) {
  return http.get("*/api/hoteles", ({ request }) => {
    const params = new URL(request.url).searchParams;
    pedidos.push(params);
    return HttpResponse.json({
      items: hotelesMock.filter((h) => h.estado === "activo"),
      total,
      pagina: Number(params.get("pagina") ?? 1),
      por_pagina: Number(params.get("por_pagina") ?? 20),
      alternativas: null,
    });
  });
}

const nombresEnPantalla = () =>
  screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent.trim());
const llaoLlao = () => screen.findByRole("heading", { level: 2, name: "Hotel Llao Llao" });
const tarjeta = async (nombre: string) => {
  const titulo = await screen.findByRole("heading", { level: 2, name: nombre });
  return within(titulo.closest("li") as HTMLElement);
};
const filtroDestino = () => screen.findByRole("combobox", { name: /destino/i });
const filtroCategoria = () => screen.findByRole("combobox", { name: /categoría/i });
const filtroOrden = () => screen.findByRole("combobox", { name: /ordenar por/i });
const filtroPrecio = () => screen.findByRole("spinbutton", { name: /precio máximo/i });
const filtroPrecioActual = () => screen.getByRole("spinbutton", { name: /precio máximo/i });
const chipSpa = () => screen.getByRole("button", { name: /^spa$/i });

describe("RF-106 búsqueda de hoteles", () => {
  it("RF-106 muestra el catálogo activo como grilla de tarjetas con el título del prototipo", async () => {
    renderPagina("admin");

    expect(
      await screen.findByRole("heading", { level: 1, name: /catálogo de hoteles/i }),
    ).toBeVisible();
    await llaoLlao();
    expect(nombresEnPantalla()).toHaveLength(5);
    expect(screen.queryByText("Hotel Playa Dorada")).not.toBeInTheDocument();
  });

  it("RF-106 cada tarjeta muestra nombre, destino, categoría y precio de referencia", async () => {
    renderPagina();
    const llao = await tarjeta("Hotel Llao Llao");

    expect(llao.getByText(/bariloche/i)).toBeInTheDocument();
    expect(llao.getByText(/5 estrellas/i)).toBeInTheDocument();
    expect(llao.getByText(/150\.000/)).toBeInTheDocument();
  });

  it("RF-106 muestra los servicios del hotel en la tarjeta", async () => {
    renderPagina();
    const copacabana = await tarjeta("Copacabana Palace");

    expect(copacabana.getByText(/spa/i)).toBeInTheDocument();
    expect(copacabana.getByText(/desayuno/i)).toBeInTheDocument();
  });

  it("RF-106 muestra el puntaje promedio con la cantidad de reseñas publicadas", async () => {
    renderPagina();
    const llao = await tarjeta("Hotel Llao Llao");
    const riu = await tarjeta("Riu Palace Punta Cana");

    // 4 y 5 publicadas; la reseña oculta por moderación no cuenta.
    expect(llao.getByText("4,5")).toBeInTheDocument();
    expect(llao.getByText(/2 reseñas/i)).toBeInTheDocument();
    expect(riu.getByText("5,0")).toBeInTheDocument();
    expect(riu.getByText(/1 reseña(?!s)/i)).toBeInTheDocument();
  });

  it("RF-106 un hotel sin reseñas dice «Sin reseñas» y no inventa un puntaje", async () => {
    renderPagina();
    const cabanas = await tarjeta("Cabañas del Nahuel");

    expect(cabanas.getByText(/sin reseñas/i)).toBeInTheDocument();
    // Solo se descarta un puntaje tipo «4,5»; el precio («$ 60.000,00») sí lleva coma.
    expect(cabanas.queryByText(/^\d,\d$/)).not.toBeInTheDocument();
  });

  it("RF-106 aclara que el puntaje es el promedio de las reseñas de los clientes", async () => {
    renderPagina();

    expect(
      await screen.findByText(/el puntaje es el promedio de las reseñas/i),
    ).toBeInTheDocument();
  });

  it("RF-106 indica cuántos hoteles se encontraron", async () => {
    renderPagina();

    expect(await screen.findByText(/5 hoteles encontrados/i)).toBeInTheDocument();
  });

  it("RF-106 el filtro de destino lista los destinos activos y manda destino_id", async () => {
    const pedidos: URLSearchParams[] = [];
    espiar(pedidos);
    renderPagina();
    const usuario = userEvent.setup();
    await llaoLlao();
    await screen.findByRole("option", { name: "Bariloche" });

    await usuario.selectOptions(await filtroDestino(), "Bariloche");

    await waitFor(() => {
      expect(pedidos.at(-1)?.get("destino_id")).toBe(bariloche);
    });
    await waitFor(() => {
      expect(nombresEnPantalla().sort()).toEqual(["Cabañas del Nahuel", "Hotel Llao Llao"]);
    });
  });

  it("RF-106 el filtro de categoría manda categoria", async () => {
    const pedidos: URLSearchParams[] = [];
    espiar(pedidos);
    renderPagina();
    const usuario = userEvent.setup();
    await llaoLlao();

    await usuario.selectOptions(await filtroCategoria(), "4 estrellas");

    await waitFor(() => {
      expect(pedidos.at(-1)?.get("categoria")).toBe("4 estrellas");
    });
    await waitFor(() => {
      expect(nombresEnPantalla()).toEqual(["Pousada do Sol"]);
    });
  });

  it("RF-106 el filtro de precio máximo manda precio_max y deja los hoteles hasta ese precio", async () => {
    const pedidos: URLSearchParams[] = [];
    espiar(pedidos);
    renderPagina();
    const usuario = userEvent.setup();
    await llaoLlao();

    await usuario.type(await filtroPrecio(), "150000");

    await waitFor(() => {
      expect(pedidos.at(-1)?.get("precio_max")).toBe("150000");
    });
    await waitFor(() => {
      expect(nombresEnPantalla().sort()).toEqual([
        "Cabañas del Nahuel",
        "Hotel Llao Llao",
        "Pousada do Sol",
      ]);
    });
  });

  it("RF-106 el precio máximo espera a que se deje de tipear antes de pedir", async () => {
    const pedidos: URLSearchParams[] = [];
    espiar(pedidos);
    renderPagina();
    const usuario = userEvent.setup();
    await llaoLlao();

    await usuario.type(await filtroPrecio(), "150000");

    await waitFor(() => {
      expect(pedidos.at(-1)?.get("precio_max")).toBe("150000");
    });
    expect(pedidos.map((p) => p.get("precio_max")).filter(Boolean)).toEqual(["150000"]);
  });

  it("RF-106 los servicios son chips: elegir «Spa» manda servicio y volver a tocarlo lo quita", async () => {
    const pedidos: URLSearchParams[] = [];
    espiar(pedidos);
    renderPagina();
    const usuario = userEvent.setup();
    await llaoLlao();

    expect(chipSpa()).toHaveAttribute("aria-pressed", "false");
    await usuario.click(chipSpa());

    await waitFor(() => {
      expect(pedidos.at(-1)?.get("servicio")?.toLowerCase()).toBe("spa");
    });
    expect(chipSpa()).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => {
      expect(nombresEnPantalla()).toEqual(["Copacabana Palace"]);
    });

    await usuario.click(chipSpa());
    await waitFor(() => {
      expect(pedidos.at(-1)?.has("servicio")).toBe(false);
    });
  });

  it("RF-106 arranca ordenado por mejor valorados y lo pide a la API", async () => {
    const pedidos: URLSearchParams[] = [];
    espiar(pedidos);
    renderPagina();
    await llaoLlao();

    expect(pedidos[0]?.get("orden")).toBe("valoracion");
    expect(await filtroOrden()).toHaveDisplayValue(/mejor valorados/i);
    // Copacabana y Riu (5,0) primero, el sin reseñas al final.
    expect(nombresEnPantalla()).toEqual([
      "Copacabana Palace",
      "Riu Palace Punta Cana",
      "Hotel Llao Llao",
      "Pousada do Sol",
      "Cabañas del Nahuel",
    ]);
  });

  it("RF-106 ordenar por precio manda orden=precio y reordena de menor a mayor", async () => {
    const pedidos: URLSearchParams[] = [];
    espiar(pedidos);
    renderPagina();
    const usuario = userEvent.setup();
    await llaoLlao();

    await usuario.selectOptions(await filtroOrden(), "Precio");

    await waitFor(() => {
      expect(pedidos.at(-1)?.get("orden")).toBe("precio");
    });
    await waitFor(() => {
      expect(nombresEnPantalla()).toEqual([
        "Cabañas del Nahuel",
        "Pousada do Sol",
        "Hotel Llao Llao",
        "Riu Palace Punta Cana",
        "Copacabana Palace",
      ]);
    });
  });

  it("RF-106 ordenar por nombre manda orden=nombre", async () => {
    const pedidos: URLSearchParams[] = [];
    espiar(pedidos);
    renderPagina();
    const usuario = userEvent.setup();
    await llaoLlao();

    await usuario.selectOptions(await filtroOrden(), "Nombre");

    await waitFor(() => {
      expect(pedidos.at(-1)?.get("orden")).toBe("nombre");
    });
    await waitFor(() => {
      expect(nombresEnPantalla()[0]).toBe("Cabañas del Nahuel");
    });
  });

  it("RF-106 «Limpiar filtros» quita todos los filtros y deja el orden por valoración", async () => {
    const pedidos: URLSearchParams[] = [];
    espiar(pedidos);
    renderPagina();
    const usuario = userEvent.setup();
    await llaoLlao();
    await screen.findByRole("option", { name: "Bariloche" });
    await usuario.selectOptions(await filtroDestino(), "Bariloche");
    await usuario.click(chipSpa());
    await waitFor(() => {
      expect(pedidos.at(-1)?.has("servicio")).toBe(true);
    });

    await usuario.click(screen.getByRole("button", { name: /limpiar filtros/i }));

    await waitFor(() => {
      expect(pedidos.at(-1)?.has("destino_id")).toBe(false);
    });
    expect(pedidos.at(-1)?.has("servicio")).toBe(false);
    expect(pedidos.at(-1)?.get("orden")).toBe("valoracion");
  });

  it("RF-106 cada cambio de filtro vuelve a la primera página", async () => {
    const pedidos: URLSearchParams[] = [];
    renderPagina("empleado", paginaFija(45, pedidos));
    const usuario = userEvent.setup();
    await llaoLlao();
    await usuario.click(screen.getByRole("button", { name: /siguiente/i }));
    await waitFor(() => {
      expect(pedidos.at(-1)?.get("pagina")).toBe("2");
    });

    await usuario.click(await screen.findByRole("button", { name: /^spa$/i }));

    await waitFor(() => {
      expect(pedidos.at(-1)?.get("servicio")?.toLowerCase()).toBe("spa");
    });
    expect(pedidos.at(-1)?.get("pagina")).toBe("1");
  });

  it("RF-106 pagina: Siguiente pide la página 2 y Anterior vuelve a la 1", async () => {
    const pedidos: URLSearchParams[] = [];
    renderPagina("empleado", paginaFija(45, pedidos));
    const usuario = userEvent.setup();
    await llaoLlao();
    expect(screen.getByRole("button", { name: /anterior/i })).toBeDisabled();

    await usuario.click(screen.getByRole("button", { name: /siguiente/i }));
    await waitFor(() => {
      expect(pedidos.some((p) => p.get("pagina") === "2")).toBe(true);
    });
    await usuario.click(await screen.findByRole("button", { name: /anterior/i }));

    await waitFor(() => {
      expect(pedidos.at(-1)?.get("pagina")).toBe("1");
    });
  });

  it("RF-106 Siguiente queda deshabilitado en la última página", async () => {
    renderPagina();
    await llaoLlao();

    expect(screen.getByRole("button", { name: /siguiente/i })).toBeDisabled();
  });

  it("RF-106 muestra un estado de carga mientras llega el catálogo", async () => {
    renderPagina(
      "empleado",
      http.get("*/api/hoteles", async () => {
        await delay("infinite");
        return HttpResponse.json({});
      }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(/cargando hoteles/i);
  });

  it("RF-106 muestra un error cuando la API falla", async () => {
    renderPagina(
      "empleado",
      http.get("*/api/hoteles", () => new HttpResponse(null, { status: 500 })),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos cargar los hoteles/i);
  });

  it.each(["empleado", "admin", "dueno"] as RolMock[])(
    "RF-106 %s ve «Nuevo hotel» en el encabezado y lleva al alta",
    async (rol) => {
      renderPagina(rol);

      const enlace = await screen.findByRole("link", { name: /nuevo hotel/i });
      expect(enlace).toHaveAttribute("href", "/hoteles/nuevo");
    },
  );

  it("RF-106 el freelance consulta el catálogo pero no ve «Nuevo hotel» (pantalla 44)", async () => {
    renderPagina("freelance");

    await llaoLlao();
    expect(screen.queryByRole("link", { name: /nuevo hotel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /nuevo hotel/i })).not.toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      "Solo consulta: el catálogo de hoteles es compartido. El alta de hoteles la hacen empleados y administración.",
    );
  });

  it("RF-106 limpiar filtros no reaplica el precio máximo ya demorado", async () => {
    const pedidos: URLSearchParams[] = [];
    espiar(pedidos);
    renderPagina();
    const usuario = userEvent.setup();
    await llaoLlao();
    await usuario.type(await filtroPrecio(), "150000");
    await waitFor(() => {
      expect(pedidos.at(-1)?.get("precio_max")).toBe("150000");
    });

    await usuario.click(screen.getByRole("button", { name: /limpiar filtros/i }));
    const desde = pedidos.length;
    await new Promise((resolver) => setTimeout(resolver, 600));

    expect(filtroPrecioActual()).toHaveValue(null);
    expect(pedidos.slice(desde).some((p) => p.has("precio_max"))).toBe(false);
    expect(pedidos.at(-1)?.has("precio_max")).toBe(false);
  });

  it("RF-106 un precio máximo inválido muestra un error en el campo y no se manda", async () => {
    const pedidos: URLSearchParams[] = [];
    espiar(pedidos);
    renderPagina();
    const usuario = userEvent.setup();
    await llaoLlao();

    await usuario.type(await filtroPrecio(), "1.234");
    await new Promise((resolver) => setTimeout(resolver, 600));

    expect(screen.getByText(/ingresá un importe válido/i)).toBeInTheDocument();
    expect(pedidos.some((p) => p.has("precio_max"))).toBe(false);
  });

  it("RF-106 usa el singular con un solo hotel", async () => {
    const [llao] = hotelesMock;
    const propios = [
      http.get("*/api/hoteles", () =>
        HttpResponse.json({
          items: [llao],
          total: 1,
          pagina: 1,
          por_pagina: 20,
          alternativas: null,
        }),
      ),
    ];
    renderPagina("empleado", ...propios);

    expect(await screen.findByText("1 hotel encontrado")).toBeInTheDocument();
  });

  it("RF-106 los chips de servicio están agrupados bajo «Servicios»", async () => {
    renderPagina();
    await llaoLlao();

    const grupo = screen.getByRole("group", { name: "Servicios" });
    expect(within(grupo).getAllByRole("button")).toHaveLength(6);
  });
});

describe("RF-110 sin resultados", () => {
  /** Bariloche + Spa no tiene hoteles: la API devuelve las alternativas. */
  async function buscarSinResultados(rol: RolMock) {
    renderPagina(rol);
    const usuario = userEvent.setup();
    await llaoLlao();
    await screen.findByRole("option", { name: "Bariloche" });
    await usuario.selectOptions(await filtroDestino(), "Bariloche");
    await usuario.click(chipSpa());
    await screen.findByText(/no encontramos hoteles con esos filtros/i);
    return usuario;
  }

  it("RF-110 sin resultados avisa «0 hoteles encontrados» y no muestra tarjetas", async () => {
    await buscarSinResultados("empleado");

    expect(screen.getByText(/0 hoteles encontrados/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 2, name: "Hotel Llao Llao" }),
    ).not.toBeInTheDocument();
  });

  it("RF-110 ofrece quitar cada filtro aplicado que ampliaría la búsqueda", async () => {
    await buscarSinResultados("empleado");

    expect(screen.getByRole("button", { name: /quitar.*destino/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /quitar.*servicio/i })).toBeInTheDocument();
    // No se ofrecen filtros que no están aplicados.
    expect(screen.queryByRole("button", { name: /quitar.*categoría/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /quitar.*precio/i })).not.toBeInTheDocument();
  });

  it("RF-110 quitar un filtro sugerido repite la búsqueda sin él y vuelve a mostrar hoteles", async () => {
    const pedidos: URLSearchParams[] = [];
    espiar(pedidos);
    const usuario = await buscarSinResultados("empleado");

    await usuario.click(screen.getByRole("button", { name: /quitar.*destino/i }));

    await waitFor(() => {
      expect(pedidos.at(-1)?.has("destino_id")).toBe(false);
    });
    expect(pedidos.at(-1)?.get("servicio")?.toLowerCase()).toBe("spa");
    expect(
      await screen.findByRole("heading", { level: 2, name: "Copacabana Palace" }),
    ).toBeVisible();
    expect(screen.queryByText(/no encontramos hoteles con esos filtros/i)).not.toBeInTheDocument();
  });

  it.each(["empleado", "admin", "dueno"] as RolMock[])(
    "RF-110 %s ve «Dar de alta un hotel» cuando puede_dar_de_alta",
    async (rol) => {
      await buscarSinResultados(rol);

      const alta = screen.getByRole("link", { name: /dar de alta un hotel/i });
      expect(alta).toHaveAttribute("href", "/hoteles/nuevo");
    },
  );

  it("RF-110 el freelance ve las alternativas para ampliar pero no «Dar de alta un hotel»", async () => {
    await buscarSinResultados("freelance");

    expect(screen.getByRole("button", { name: /quitar.*destino/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /dar de alta un hotel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dar de alta un hotel/i })).not.toBeInTheDocument();
  });

  it("RF-110 el botón de alta sale de lo que dice la API (puede_dar_de_alta), no del rol", async () => {
    renderPagina(
      "admin",
      http.get("*/api/hoteles", () =>
        HttpResponse.json({
          items: [],
          total: 0,
          pagina: 1,
          por_pagina: 20,
          alternativas: { ampliar_filtros: [], puede_dar_de_alta: false },
        }),
      ),
    );

    await screen.findByText(/no encontramos hoteles con esos filtros/i);
    expect(screen.queryByRole("link", { name: /dar de alta un hotel/i })).not.toBeInTheDocument();
  });

  it("RF-110 con resultados no muestra el estado sin resultados ni el alta sugerida", async () => {
    renderPagina("admin");
    await llaoLlao();

    expect(screen.queryByText(/no encontramos hoteles/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /dar de alta un hotel/i })).not.toBeInTheDocument();
  });

  it("RF-110 sin resultados y sin alternativas ofrece «Limpiar filtros»", async () => {
    const propios = [
      http.get("*/api/hoteles", () =>
        HttpResponse.json({ items: [], total: 0, pagina: 1, por_pagina: 20, alternativas: null }),
      ),
    ];
    renderPagina("empleado", ...propios);

    await screen.findByText(/no encontramos hoteles con esos filtros/i);
    expect(screen.getAllByRole("button", { name: /limpiar filtros/i })).toHaveLength(2);
  });

  it("RF-110 quitar el precio máximo sugerido no lo reaplica", async () => {
    const pedidos: URLSearchParams[] = [];
    const propios = [
      http.get("*/api/hoteles", ({ request }) => {
        const params = new URL(request.url).searchParams;
        pedidos.push(params);
        const vacio = params.has("precio_max");
        return HttpResponse.json({
          items: vacio ? [] : hotelesMock.slice(0, 1),
          total: vacio ? 0 : 1,
          pagina: 1,
          por_pagina: 20,
          alternativas: vacio ? { ampliar_filtros: ["precio_max"], puede_dar_de_alta: true } : null,
        });
      }),
    ];
    renderPagina("empleado", ...propios);
    const usuario = userEvent.setup();
    await llaoLlao();
    await usuario.type(await filtroPrecio(), "10");
    await usuario.click(await screen.findByRole("button", { name: /quitar.*precio/i }));
    await llaoLlao();
    await new Promise((resolver) => setTimeout(resolver, 600));

    expect(pedidos.at(-1)?.has("precio_max")).toBe(false);
  });
});
