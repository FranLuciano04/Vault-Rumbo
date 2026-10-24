import { crearCliente } from "@rumbo/shared";
import { crearServidor, manejadoresM1, operadoresMock } from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, type JsonBodyType } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { PestanaOperadores } from "./PestanaOperadores";

const servidor = crearServidor(...manejadoresM1);
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

function renderPestana() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <PestanaOperadores cliente={cliente} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const problema = (status: number, title: string, extra: object = {}) =>
  HttpResponse.json(
    { title, status, ...extra },
    { status, headers: { "content-type": "application/problem+json" } },
  );

const fila = async (texto: RegExp | string) =>
  (await screen.findByText(texto)).closest("tr") as HTMLElement;

const [despegar, solYPlaya, andes] = operadoresMock;

describe("RF-093 operadores", () => {
  it("RF-093 lista los operadores activos con su contacto", async () => {
    renderPestana();

    const filaDespegar = await fila("Despegar Mayorista");
    expect(within(filaDespegar).getByText("ventas@despegar.test")).toBeInTheDocument();
    expect(await fila("Sol y Playa Operadora")).toBeInTheDocument();
  });

  it("RF-093 si falla el GET avisa en lugar de la tabla", async () => {
    servidor.use(http.get("*/api/operadores", () => problema(500, "Error interno")));
    renderPestana();

    expect(await screen.findByText(/no pudimos cargar los operadores/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("RF-093 si no hay operadores lo indica", async () => {
    servidor.use(
      http.get("*/api/operadores", () =>
        HttpResponse.json({ items: [], total: 0, pagina: 1, por_pagina: 20 }),
      ),
    );
    renderPestana();

    expect(await screen.findByText(/no hay operadores para mostrar/i)).toBeInTheDocument();
  });

  it("RF-093 el filtro de inactivos pide activo=false al servidor", async () => {
    const pedidos: (string | null)[] = [];
    servidor.use(
      http.get("*/api/operadores", ({ request }) => {
        const activo = new URL(request.url).searchParams.get("activo");
        pedidos.push(activo);
        const items = activo === "false" ? [andes] : [despegar, solYPlaya];
        return HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 20 });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Despegar Mayorista");
    await usuario.click(screen.getByRole("checkbox", { name: /inactivos/i }));

    expect(await screen.findByText("Andes Travel")).toBeInTheDocument();
    expect(pedidos).toContain("false");
    await waitFor(() => {
      expect(screen.queryByText("Despegar Mayorista")).not.toBeInTheDocument();
    });
  });

  it("RF-093 da de alta un operador con POST /api/operadores", async () => {
    let cuerpo: JsonBodyType;
    servidor.use(
      http.post("*/api/operadores", async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ ...despegar, ...(cuerpo as object) }, { status: 201 });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Despegar Mayorista");
    await usuario.click(screen.getByRole("button", { name: /nuevo operador/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "Mundo Andino");
    await usuario.type(screen.getByLabelText(/contacto/i), "info@mundoandino.test");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(cuerpo).toMatchObject({ nombre: "Mundo Andino", contacto: "info@mundoandino.test" });
    });
  });

  it("RF-093 el contacto es opcional: vacío se envía como null", async () => {
    let cuerpo: JsonBodyType;
    servidor.use(
      http.post("*/api/operadores", async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ ...despegar, ...(cuerpo as object) }, { status: 201 });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Despegar Mayorista");
    await usuario.click(screen.getByRole("button", { name: /nuevo operador/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "Mundo Andino");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(cuerpo).toMatchObject({ nombre: "Mundo Andino", contacto: null });
    });
  });

  it("RF-093 cierra el formulario tras un alta exitosa", async () => {
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Despegar Mayorista");
    await usuario.click(screen.getByRole("button", { name: /nuevo operador/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "Mundo Andino");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.queryByLabelText(/nombre/i)).not.toBeInTheDocument();
    });
  });

  it("RF-093 no envía el alta sin nombre y lo marca inválido", async () => {
    let llamadas = 0;
    servidor.use(
      http.post("*/api/operadores", () => {
        llamadas += 1;
        return HttpResponse.json(despegar, { status: 201 });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Despegar Mayorista");
    await usuario.click(screen.getByRole("button", { name: /nuevo operador/i }));
    const nombre = await screen.findByLabelText(/nombre/i);
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(nombre).toBeInvalid();
    });
    expect(llamadas).toBe(0);
  });

  it("RF-093 un nombre de solo espacios se considera vacío", async () => {
    let llamadas = 0;
    servidor.use(
      http.post("*/api/operadores", () => {
        llamadas += 1;
        return HttpResponse.json(despegar, { status: 201 });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Despegar Mayorista");
    await usuario.click(screen.getByRole("button", { name: /nuevo operador/i }));
    const nombre = await screen.findByLabelText(/nombre/i);
    await usuario.type(nombre, "   ");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(nombre).toBeInvalid();
    });
    expect(llamadas).toBe(0);
  });

  it("RF-093 edita un operador precargado con PATCH /api/operadores/{id}", async () => {
    let ruta = "";
    let cuerpo: JsonBodyType;
    servidor.use(
      http.patch("*/api/operadores/:id", async ({ request }) => {
        ruta = new URL(request.url).pathname;
        cuerpo = await request.json();
        return HttpResponse.json({ ...despegar, ...(cuerpo as object) });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    const filaDespegar = await fila("Despegar Mayorista");
    await usuario.click(within(filaDespegar).getByRole("button", { name: /editar/i }));
    const contacto = await screen.findByLabelText(/contacto/i);
    expect(screen.getByLabelText(/nombre/i)).toHaveValue("Despegar Mayorista");
    expect(contacto).toHaveValue("ventas@despegar.test");
    await usuario.clear(contacto);
    await usuario.type(contacto, "nuevo@despegar.test");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(cuerpo).toMatchObject({ contacto: "nuevo@despegar.test" });
    });
    expect(ruta).toBe(`/api/operadores/${despegar.id}`);
  });

  it("RF-093 da de baja un operador activo con POST /baja", async () => {
    let ruta = "";
    servidor.use(
      http.post("*/api/operadores/:id/baja", ({ request }) => {
        ruta = new URL(request.url).pathname;
        return HttpResponse.json({ ...despegar, activo: false });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    const filaDespegar = await fila("Despegar Mayorista");
    await usuario.click(within(filaDespegar).getByRole("button", { name: /dar de baja/i }));
    const confirmar = screen.queryByRole("button", { name: /confirmar/i });
    if (confirmar) await usuario.click(confirmar);

    await waitFor(() => {
      expect(ruta).toBe(`/api/operadores/${despegar.id}/baja`);
    });
  });

  it("RF-093 avisa si falla la baja del operador", async () => {
    servidor.use(http.post("*/api/operadores/:id/baja", () => problema(500, "Error interno")));
    renderPestana();
    const usuario = userEvent.setup();

    const filaDespegar = await fila("Despegar Mayorista");
    await usuario.click(within(filaDespegar).getByRole("button", { name: /dar de baja/i }));
    const confirmar = screen.queryByRole("button", { name: /confirmar/i });
    if (confirmar) await usuario.click(confirmar);

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos guardar/i);
  });

  it("RF-093 reactiva un operador inactivo con POST /reactivar", async () => {
    let ruta = "";
    servidor.use(
      http.get("*/api/operadores", () =>
        HttpResponse.json({ items: [andes], total: 1, pagina: 1, por_pagina: 20 }),
      ),
      http.post("*/api/operadores/:id/reactivar", ({ request }) => {
        ruta = new URL(request.url).pathname;
        return HttpResponse.json({ ...andes, activo: true });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    const filaAndes = await fila("Andes Travel");
    expect(within(filaAndes).queryByRole("button", { name: /dar de baja/i })).not.toBeInTheDocument();
    await usuario.click(within(filaAndes).getByRole("button", { name: /reactivar/i }));

    await waitFor(() => {
      expect(ruta).toBe(`/api/operadores/${andes.id}/reactivar`);
    });
  });

  it("RF-093 avisa si hay más operadores que los mostrados", async () => {
    servidor.use(
      http.get("*/api/operadores", () =>
        HttpResponse.json({
          items: [despegar, solYPlaya],
          total: 150,
          pagina: 1,
          por_pagina: 100,
        }),
      ),
    );
    renderPestana();

    expect(await screen.findByText(/mostramos 2 de 150 operadores/i)).toBeInTheDocument();
  });
});

describe("RF-094 duplicado", () => {
  it("RF-094 muestra el 409 de nombre duplicado en el formulario y lo deja abierto", async () => {
    servidor.use(
      http.post("*/api/operadores", () =>
        problema(409, "Conflicto", {
          detail: "Ya existe un operador llamado «Despegar Mayorista».",
        }),
      ),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Despegar Mayorista");
    await usuario.click(screen.getByRole("button", { name: /nuevo operador/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "Despegar Mayorista");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/ya existe/i);
    expect(screen.getByLabelText(/nombre/i)).toHaveValue("Despegar Mayorista");
  });

  it("RF-094 muestra el 409 al editar el nombre a uno existente", async () => {
    servidor.use(
      http.patch("*/api/operadores/:id", () =>
        problema(409, "Conflicto", {
          detail: "Ya existe un operador llamado «Sol y Playa Operadora».",
        }),
      ),
    );
    renderPestana();
    const usuario = userEvent.setup();

    const filaDespegar = await fila("Despegar Mayorista");
    await usuario.click(within(filaDespegar).getByRole("button", { name: /editar/i }));
    const nombre = await screen.findByLabelText(/nombre/i);
    await usuario.clear(nombre);
    await usuario.type(nombre, "Sol y Playa Operadora");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/ya existe/i);
    expect(screen.getByLabelText(/nombre/i)).toHaveValue("Sol y Playa Operadora");
  });

  it("RF-094 un 409 sin detalle muestra igual un mensaje de error", async () => {
    servidor.use(http.post("*/api/operadores", () => problema(409, "Conflicto")));
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Despegar Mayorista");
    await usuario.click(screen.getByRole("button", { name: /nuevo operador/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "Despegar Mayorista");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos guardar/i);
  });

  it("RF-094 muestra en su campo el 422 del servidor", async () => {
    servidor.use(
      http.post("*/api/operadores", () =>
        problema(422, "Datos inválidos", {
          errores: [{ campo: "nombre", mensaje: "El nombre es demasiado largo." }],
        }),
      ),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Despegar Mayorista");
    await usuario.click(screen.getByRole("button", { name: /nuevo operador/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "X");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByText("El nombre es demasiado largo.")).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toBeInvalid();
  });
});
