import { crearCliente } from "@rumbo/shared";
import {
  clientesMock,
  crearServidor,
  manejadoresClientes,
  usuariosPorRol,
  type RolMock,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { PaginaClientes } from "./PaginaClientes";

const servidor = crearServidor(...manejadoresClientes);
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

function renderPagina(rol: RolMock = "empleado") {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/clientes"]}>
        <Routes>
          <Route
            path="/clientes"
            element={<PaginaClientes cliente={cliente} usuario={usuariosPorRol[rol]} />}
          />
          <Route path="/clientes/:id" element={<p>Ficha del cliente</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const todaLaAgencia = () => screen.findByRole("button", { name: /toda la agencia/i });
const buscador = () =>
  screen.findByRole("textbox", { name: /buscar por nombre, teléfono o email/i });

/** Responde siempre con los tres clientes del mock y registra los parámetros de cada pedido. */
function paginaFija(total: number, pedidos: URLSearchParams[]) {
  return http.get("*/api/clientes", ({ request }) => {
    const params = new URL(request.url).searchParams;
    pedidos.push(params);
    return HttpResponse.json({
      items: clientesMock,
      total,
      pagina: Number(params.get("pagina") ?? 1),
      por_pagina: Number(params.get("por_pagina") ?? 20),
    });
  });
}

describe("RF-005 búsqueda de clientes", () => {
  it("RF-005 muestra la tabla con las columnas del prototipo", async () => {
    renderPagina("admin");
    await screen.findByRole("table");

    const encabezados = screen.getAllByRole("columnheader").map((c) => c.textContent.trim());
    expect(encabezados).toEqual(
      expect.arrayContaining([
        "Cliente",
        "Segmento",
        "Etiquetas",
        "Asesor",
        "Último viaje",
        "Oportunidades",
      ]),
    );
  });

  it("RF-005 cada fila muestra nombre, contacto, segmento y etiquetas", async () => {
    const usuario = userEvent.setup();
    renderPagina("admin");
    await usuario.click(await todaLaAgencia());
    const fila = (await screen.findByText("Familia Sosa")).closest("tr");

    expect(fila).not.toBeNull();
    const dentro = within(fila as HTMLElement);
    expect(dentro.getByText("sosa.familia@mail.test")).toBeInTheDocument();
    expect(dentro.getByText("Familia")).toBeInTheDocument();
    expect(dentro.getByText("Brasil")).toBeInTheDocument();
    expect(dentro.getByText("cruceros")).toBeInTheDocument();
  });

  it("RF-005 la búsqueda por texto filtra la lista contra el servidor", async () => {
    renderPagina("admin");
    const usuario = userEvent.setup();
    await usuario.click(await todaLaAgencia());
    expect(await screen.findByText("Camila Benítez")).toBeInTheDocument();

    await usuario.type(await buscador(), "sosa");

    await waitFor(() => {
      expect(screen.queryByText("Camila Benítez")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Familia Sosa")).toBeInTheDocument();
    expect(screen.queryByText("Joaquín Ramos")).not.toBeInTheDocument();
  });

  it("RF-005 el filtro de segmento (chips) pide solo ese segmento", async () => {
    renderPagina("admin");
    const usuario = userEvent.setup();
    await usuario.click(await todaLaAgencia());
    await screen.findByText("Camila Benítez");

    await usuario.click(screen.getByRole("button", { name: "Pareja" }));

    await waitFor(() => {
      expect(screen.queryByText("Familia Sosa")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Camila Benítez")).toBeInTheDocument();
  });

  it("RF-005 el filtro por etiqueta pide solo los clientes con esa etiqueta", async () => {
    renderPagina("admin");
    const usuario = userEvent.setup();
    await usuario.click(await todaLaAgencia());
    await screen.findByText("Camila Benítez");

    await usuario.click(screen.getByRole("button", { name: /etiquetas/i }));
    await usuario.click(await screen.findByRole("checkbox", { name: "Brasil" }));

    await waitFor(() => {
      expect(screen.queryByText("Camila Benítez")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Familia Sosa")).toBeInTheDocument();
  });

  it("RF-005 indica cuántos clientes se muestran del total", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(paginaFija(128, pedidos));
    renderPagina("admin");

    expect(await screen.findByText(/mostrando 3 de 128 clientes/i)).toBeInTheDocument();
  });

  it("RF-005 pagina: Siguiente pide la página 2 y Anterior vuelve a la 1", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(paginaFija(128, pedidos));
    renderPagina("admin");
    const usuario = userEvent.setup();

    await screen.findByText("Camila Benítez");
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

  it("RF-005 Siguiente queda deshabilitado en la última página", async () => {
    const usuario = userEvent.setup();
    renderPagina("admin");
    await usuario.click(await todaLaAgencia());
    await screen.findByText("Camila Benítez");

    expect(screen.getByRole("button", { name: /siguiente/i })).toBeDisabled();
  });

  it("RF-005 el clic en una fila navega a la ficha /clientes/:id", async () => {
    renderPagina("admin");
    const usuario = userEvent.setup();
    await usuario.click(await todaLaAgencia());

    await usuario.click(await screen.findByText("Familia Sosa"));

    expect(await screen.findByText("Ficha del cliente")).toBeInTheDocument();
  });

  it("RF-005 muestra un estado de carga mientras llega la lista", async () => {
    servidor.use(
      http.get("*/api/clientes", async () => {
        await delay("infinite");
        return HttpResponse.json({});
      }),
    );
    renderPagina("admin");

    expect(await screen.findByRole("status")).toHaveTextContent(/cargando clientes/i);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("RF-005 muestra el estado vacío cuando no hay resultados", async () => {
    servidor.use(
      http.get("*/api/clientes", () =>
        HttpResponse.json({ items: [], total: 0, pagina: 1, por_pagina: 20 }),
      ),
    );
    renderPagina("admin");

    expect(await screen.findByText(/no se encontraron clientes/i)).toBeInTheDocument();
    expect(screen.queryByText("Camila Benítez")).not.toBeInTheDocument();
  });
});

describe("RF-005 estados de la lista", () => {
  it("RF-005 al paginar, la tabla sigue en pantalla mientras llega la página siguiente", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(
      http.get("*/api/clientes", async ({ request }) => {
        const params = new URL(request.url).searchParams;
        pedidos.push(params);
        if (params.get("pagina") === "2") await delay("infinite");
        return HttpResponse.json({
          items: clientesMock,
          total: 128,
          pagina: 1,
          por_pagina: 20,
        });
      }),
    );
    renderPagina("admin");
    const usuario = userEvent.setup();
    await screen.findByText("Camila Benítez");

    await usuario.click(screen.getByRole("button", { name: /siguiente/i }));
    await waitFor(() => {
      expect(pedidos.some((p) => p.get("pagina") === "2")).toBe(true);
    });

    expect(screen.getByText("Camila Benítez")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /siguiente/i })).toBeDisabled();
  });

  it("RF-005 Anterior parte de la página pedida y queda bloqueado mientras llega la nueva", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(
      http.get("*/api/clientes", async ({ request }) => {
        const params = new URL(request.url).searchParams;
        pedidos.push(params);
        if (params.get("segmento") === "pareja") await delay("infinite");
        return HttpResponse.json({
          items: clientesMock,
          total: 128,
          pagina: Number(params.get("pagina") ?? 1),
          por_pagina: 20,
        });
      }),
    );
    renderPagina("admin");
    const usuario = userEvent.setup();
    await screen.findByText("Camila Benítez");
    await usuario.click(screen.getByRole("button", { name: /siguiente/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /anterior/i })).toBeEnabled();
    });

    await usuario.click(screen.getByRole("button", { name: "Pareja" }));
    await waitFor(() => {
      expect(pedidos.some((p) => p.get("segmento") === "pareja")).toBe(true);
    });

    expect(pedidos.at(-1)?.get("pagina")).toBe("1");
    expect(screen.getByRole("button", { name: /anterior/i })).toBeDisabled();
  });

  it("RF-005 muestra un error cuando la API falla", async () => {
    servidor.use(http.get("*/api/clientes", () => new HttpResponse(null, { status: 500 })));
    renderPagina("admin");

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos cargar los clientes/i);
  });

  it("RF-005 la búsqueda espera a que se deje de tipear antes de pedir", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(paginaFija(3, pedidos));
    renderPagina("admin");
    const usuario = userEvent.setup();
    await screen.findByText("Camila Benítez");

    await usuario.type(await buscador(), "sosa");

    await waitFor(() => {
      expect(pedidos.at(-1)?.get("buscar")).toBe("sosa");
    });
    expect(pedidos.map((p) => p.get("buscar")).filter(Boolean)).toEqual(["sosa"]);
  });

  it("RF-005 el botón Etiquetas abre el menú y elegir una manda etiquetas (no etiqueta)", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(paginaFija(3, pedidos));
    renderPagina("admin");
    const usuario = userEvent.setup();
    await screen.findByText("Camila Benítez");

    const boton = screen.getByRole("button", { name: /etiquetas/i });
    expect(boton).toHaveAttribute("aria-expanded", "false");
    await usuario.click(boton);
    expect(boton).toHaveAttribute("aria-expanded", "true");
    await usuario.click(await screen.findByRole("checkbox", { name: "Brasil" }));

    await waitFor(() => {
      expect(pedidos.at(-1)?.getAll("etiquetas")).toEqual(["Brasil"]);
    });
    expect(pedidos.at(-1)?.has("etiqueta")).toBe(false);
  });
});

describe("RF-005 columnas con datos reales", () => {
  async function filaDe(nombre: string) {
    const usuario = userEvent.setup();
    renderPagina("admin");
    await usuario.click(await todaLaAgencia());
    const fila = (await screen.findByText(nombre)).closest("tr");
    expect(fila).not.toBeNull();
    return within(fila as HTMLElement);
  }

  it("RF-005 muestra el asesor, el último viaje y las oportunidades abiertas del cliente", async () => {
    const fila = await filaDe("Joaquín Ramos");

    expect(fila.getByText("Nicolás Paz")).toBeInTheDocument();
    expect(fila.getByText(/Roma/)).toBeInTheDocument();
    expect(fila.getByText(/03\/11\/25/)).toBeInTheDocument();
    expect(fila.getAllByRole("cell").at(5)).toHaveTextContent(/^2 abiertas$/);
  });

  it("RF-005 el asesor es el de la fila aunque no sea el usuario de la sesión", async () => {
    const fila = await filaDe("Camila Benítez");

    expect(fila.getByText("Laura Asesora")).toBeInTheDocument();
    expect(fila.getByText(/Punta Cana/)).toBeInTheDocument();
    expect(fila.getByText(/01\/09\/26/)).toBeInTheDocument();
  });

  it("RF-005 muestra «—» en asesor y último viaje cuando no hay dato, y 0 oportunidades", async () => {
    const fila = await filaDe("Familia Sosa");

    const celdas = fila.getAllByRole("cell");
    expect(celdas.at(3)).toHaveTextContent("—");
    expect(celdas.at(4)).toHaveTextContent("—");
    expect(celdas.at(5)).toHaveTextContent("—");
  });
});

describe("RF-031 filtro de etiquetas", () => {
  async function abrirMenu(pedidos: URLSearchParams[]) {
    servidor.use(paginaFija(3, pedidos));
    renderPagina("admin");
    const usuario = userEvent.setup();
    await screen.findByText("Camila Benítez");
    await usuario.click(screen.getByRole("button", { name: /etiquetas/i }));
    return usuario;
  }

  it("RF-031 el menú lista las etiquetas en uso que devuelve la API", async () => {
    await abrirMenu([]);

    for (const etiqueta of ["Brasil", "Caribe", "cruceros", "Europa", "luna de miel"]) {
      expect(await screen.findByRole("checkbox", { name: etiqueta })).toBeInTheDocument();
    }
  });

  it("RF-031 ya no hay campo de texto para escribir la etiqueta", async () => {
    await abrirMenu([]);
    await screen.findByRole("checkbox", { name: "Brasil" });

    expect(
      screen.queryByRole("textbox", { name: /filtrar por etiqueta/i }),
    ).not.toBeInTheDocument();
  });

  it("RF-031 elegir una etiqueta manda etiquetas y muestra un chip removible", async () => {
    const pedidos: URLSearchParams[] = [];
    const usuario = await abrirMenu(pedidos);

    await usuario.click(await screen.findByRole("checkbox", { name: "Brasil" }));

    await waitFor(() => {
      expect(pedidos.at(-1)?.getAll("etiquetas")).toEqual(["Brasil"]);
    });
    expect(screen.getByRole("button", { name: /quitar.*brasil/i })).toBeInTheDocument();
  });

  it("RF-031 permite elegir varias y las manda como parámetro repetido, sin el alias etiqueta", async () => {
    const pedidos: URLSearchParams[] = [];
    const usuario = await abrirMenu(pedidos);

    await usuario.click(await screen.findByRole("checkbox", { name: "Brasil" }));
    await usuario.click(await screen.findByRole("checkbox", { name: "cruceros" }));

    await waitFor(() => {
      expect(pedidos.at(-1)?.getAll("etiquetas")).toEqual(["Brasil", "cruceros"]);
    });
    expect(pedidos.every((p) => !p.has("etiqueta"))).toBe(true);
  });

  it("RF-031 un cliente aparece solo si tiene todas las etiquetas elegidas", async () => {
    renderPagina("admin");
    const usuario = userEvent.setup();
    await usuario.click(await todaLaAgencia());
    await screen.findByText("Camila Benítez");
    await usuario.click(screen.getByRole("button", { name: /etiquetas/i }));

    await usuario.click(await screen.findByRole("checkbox", { name: "Brasil" }));
    await usuario.click(await screen.findByRole("checkbox", { name: "cruceros" }));
    await waitFor(() => {
      expect(screen.queryByText("Camila Benítez")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Familia Sosa")).toBeInTheDocument();

    await usuario.click(await screen.findByRole("checkbox", { name: "Caribe" }));
    expect(await screen.findByText(/no se encontraron clientes/i)).toBeInTheDocument();
    expect(screen.queryByText("Familia Sosa")).not.toBeInTheDocument();
  });

  it("RF-031 quitar un chip saca esa etiqueta del pedido y conserva las otras", async () => {
    const pedidos: URLSearchParams[] = [];
    const usuario = await abrirMenu(pedidos);
    await usuario.click(await screen.findByRole("checkbox", { name: "Brasil" }));
    await usuario.click(await screen.findByRole("checkbox", { name: "cruceros" }));
    await waitFor(() => {
      expect(pedidos.at(-1)?.getAll("etiquetas")).toEqual(["Brasil", "cruceros"]);
    });

    await usuario.click(screen.getByRole("button", { name: /quitar.*brasil/i }));

    await waitFor(() => {
      expect(pedidos.at(-1)?.getAll("etiquetas")).toEqual(["cruceros"]);
    });
    expect(screen.queryByRole("button", { name: /quitar.*brasil/i })).not.toBeInTheDocument();
  });

  it("RF-031 quitar el último chip deja de filtrar y vuelve a la primera página", async () => {
    const pedidos: URLSearchParams[] = [];
    const usuario = await abrirMenu(pedidos);
    await usuario.click(await screen.findByRole("checkbox", { name: "Brasil" }));
    await screen.findByRole("button", { name: /quitar.*brasil/i });

    await usuario.click(screen.getByRole("button", { name: /quitar.*brasil/i }));

    await waitFor(() => {
      expect(pedidos.at(-1)?.has("etiquetas")).toBe(false);
    });
    expect(pedidos.at(-1)?.get("pagina")).toBe("1");
  });
});

describe("RF-009 vista personal", () => {
  it("RF-009 el empleado arranca en «Mis clientes» y ve solo los asignados a él", async () => {
    renderPagina("empleado");

    expect(await screen.findByText("Camila Benítez")).toBeInTheDocument();
    expect(screen.queryByText("Familia Sosa")).not.toBeInTheDocument();
    expect(screen.queryByText("Joaquín Ramos")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mis clientes/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it.each(["empleado", "admin", "dueno"] as RolMock[])(
    "RF-009 %s puede pasar a «Toda la agencia» y ve todos los clientes",
    async (rol) => {
      renderPagina(rol);
      const usuario = userEvent.setup();

      await usuario.click(await todaLaAgencia());

      expect(await screen.findByText("Familia Sosa")).toBeInTheDocument();
      expect(screen.getByText("Camila Benítez")).toBeInTheDocument();
      expect(screen.getByText("Joaquín Ramos")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /toda la agencia/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    },
  );

  it("RF-009 el freelance no ve el filtro «lo mío» ni «Toda la agencia»", async () => {
    renderPagina("freelance");
    await screen.findByRole("table");

    expect(screen.queryByRole("button", { name: /toda la agencia/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mis clientes/i })).not.toBeInTheDocument();
  });

  it("RF-009 el freelance ve el aviso de que solo ve sus clientes (pantalla 39)", async () => {
    renderPagina("freelance");

    expect(
      await screen.findByText(
        "Estás viendo solo tus clientes: los que tenés como asesor asignado. Los clientes que das de alta quedan a tu nombre.",
      ),
    ).toBeInTheDocument();
  });

  it.each(["empleado", "admin", "dueno"] as RolMock[])(
    "RF-009 %s no ve el aviso de vista restringida del freelance",
    async (rol) => {
      renderPagina(rol);
      await screen.findByRole("table");

      expect(screen.queryByText(/estás viendo solo tus clientes/i)).not.toBeInTheDocument();
    },
  );

  it("RF-009 el freelance ve «Mis clientes» como etiqueta fija y no clickeable", async () => {
    renderPagina("freelance");
    await screen.findByRole("table");

    const etiqueta = screen.getByText("Mis clientes");
    expect(etiqueta.closest("button")).toBeNull();
    expect(etiqueta.closest("a")).toBeNull();
  });

  it("RF-009 el freelance no manda el parámetro mios (lo decide la API)", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(paginaFija(3, pedidos));
    renderPagina("freelance");
    await screen.findByRole("table");

    expect(pedidos.length).toBeGreaterThan(0);
    expect(pedidos.every((p) => !p.has("mios"))).toBe(true);
  });
});
