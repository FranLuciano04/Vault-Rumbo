import { crearCliente } from "@rumbo/shared";
import { crearServidor, destinosMock, manejadoresM1, requisitosMock } from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, type JsonBodyType } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { PestanaDestinos } from "./PestanaDestinos";

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
        <PestanaDestinos cliente={cliente} />
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

describe("RF-089 destinos", () => {
  it("RF-089 lista los destinos con país y región", async () => {
    renderPestana();

    const bariloche = await fila("Bariloche");
    expect(within(bariloche).getByText("Argentina")).toBeInTheDocument();
    expect(within(bariloche).getByText("Patagonia")).toBeInTheDocument();
    expect(await fila("Cancún")).toBeInTheDocument();
  });

  it("RF-089 si falla el GET avisa en lugar de la tabla", async () => {
    servidor.use(http.get("*/api/destinos", () => problema(500, "Error interno")));
    renderPestana();

    expect(await screen.findByText(/no pudimos cargar los destinos/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("RF-089 el filtro de inactivos pide activo=false al servidor", async () => {
    const pedidos: (string | null)[] = [];
    servidor.use(
      http.get("*/api/destinos", ({ request }) => {
        const activo = new URL(request.url).searchParams.get("activo");
        pedidos.push(activo);
        const items = activo === "false" ? [destinosMock[2]] : [destinosMock[0], destinosMock[1]];
        return HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 20 });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Bariloche");
    await usuario.click(screen.getByRole("checkbox", { name: /inactivos/i }));

    expect(await screen.findByText("Roma")).toBeInTheDocument();
    expect(pedidos).toContain("false");
    await waitFor(() => {
      expect(screen.queryByText("Bariloche")).not.toBeInTheDocument();
    });
  });

  it("RF-089 da de alta un destino con POST /api/destinos", async () => {
    let cuerpo: JsonBodyType;
    servidor.use(
      http.post("*/api/destinos", async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ ...destinosMock[0], ...(cuerpo as object) }, { status: 201 });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Bariloche");
    await usuario.click(screen.getByRole("button", { name: /nuevo destino/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "Mendoza");
    await usuario.type(screen.getByLabelText(/país/i), "Argentina");
    await usuario.type(screen.getByLabelText(/región/i), "Cuyo");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(cuerpo).toMatchObject({ nombre: "Mendoza", pais: "Argentina", region: "Cuyo" });
    });
  });

  it("RF-089 no envía el alta si faltan nombre y país y los marca inválidos", async () => {
    let llamadas = 0;
    servidor.use(
      http.post("*/api/destinos", () => {
        llamadas += 1;
        return HttpResponse.json(destinosMock[0], { status: 201 });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Bariloche");
    await usuario.click(screen.getByRole("button", { name: /nuevo destino/i }));
    const nombre = await screen.findByLabelText(/nombre/i);
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(nombre).toBeInvalid();
    });
    expect(screen.getByLabelText(/país/i)).toBeInvalid();
    expect(llamadas).toBe(0);
  });

  it("RF-089 edita un destino precargado con PATCH /api/destinos/{id}", async () => {
    let ruta = "";
    let cuerpo: JsonBodyType;
    servidor.use(
      http.patch("*/api/destinos/:id", async ({ request }) => {
        ruta = new URL(request.url).pathname;
        cuerpo = await request.json();
        return HttpResponse.json({ ...destinosMock[0], ...(cuerpo as object) });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    const bariloche = await fila("Bariloche");
    await usuario.click(within(bariloche).getByRole("button", { name: /editar/i }));
    const region = await screen.findByLabelText(/región/i);
    expect(region).toHaveValue("Patagonia");
    await usuario.clear(region);
    await usuario.type(region, "Lagos del Sur");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(cuerpo).toMatchObject({ region: "Lagos del Sur" });
    });
    expect(ruta).toBe(`/api/destinos/${destinosMock[0].id}`);
  });

  it("RF-089 da de baja un destino activo con POST /baja", async () => {
    let ruta = "";
    servidor.use(
      http.post("*/api/destinos/:id/baja", ({ request }) => {
        ruta = new URL(request.url).pathname;
        return HttpResponse.json({ ...destinosMock[0], activo: false });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    const bariloche = await fila("Bariloche");
    await usuario.click(within(bariloche).getByRole("button", { name: /dar de baja/i }));
    const confirmar = screen.queryByRole("button", { name: /confirmar/i });
    if (confirmar) await usuario.click(confirmar);

    await waitFor(() => {
      expect(ruta).toBe(`/api/destinos/${destinosMock[0].id}/baja`);
    });
  });

  it("RF-089 avisa si falla la baja del destino", async () => {
    servidor.use(http.post("*/api/destinos/:id/baja", () => problema(500, "Error interno")));
    renderPestana();
    const usuario = userEvent.setup();

    const bariloche = await fila("Bariloche");
    await usuario.click(within(bariloche).getByRole("button", { name: /dar de baja/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos guardar/i);
  });

  it("RF-089 avisa si hay más destinos que los mostrados", async () => {
    servidor.use(
      http.get("*/api/destinos", () =>
        HttpResponse.json({
          items: [destinosMock[0], destinosMock[1]],
          total: 150,
          pagina: 1,
          por_pagina: 100,
        }),
      ),
    );
    renderPestana();

    expect(await screen.findByText(/mostramos 2 de 150 destinos/i)).toBeInTheDocument();
  });

  it("RF-089 reactiva un destino inactivo con POST /reactivar", async () => {
    let ruta = "";
    servidor.use(
      http.get("*/api/destinos", () =>
        HttpResponse.json({ items: [destinosMock[2]], total: 1, pagina: 1, por_pagina: 20 }),
      ),
      http.post("*/api/destinos/:id/reactivar", ({ request }) => {
        ruta = new URL(request.url).pathname;
        return HttpResponse.json({ ...destinosMock[2], activo: true });
      }),
    );
    renderPestana();
    const usuario = userEvent.setup();

    const roma = await fila("Roma");
    await usuario.click(within(roma).getByRole("button", { name: /reactivar/i }));

    await waitFor(() => {
      expect(ruta).toBe(`/api/destinos/${destinosMock[2].id}/reactivar`);
    });
  });
});

describe("RF-090 duplicado", () => {
  it("RF-090 muestra el 409 de nombre duplicado en el formulario y lo deja abierto", async () => {
    servidor.use(
      http.post("*/api/destinos", () =>
        problema(409, "Conflicto", { detail: "Ya existe un destino llamado «Bariloche»." }),
      ),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Bariloche");
    await usuario.click(screen.getByRole("button", { name: /nuevo destino/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "Bariloche");
    await usuario.type(screen.getByLabelText(/país/i), "Argentina");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/ya existe/i);
    expect(screen.getByLabelText(/nombre/i)).toHaveValue("Bariloche");
  });

  it("RF-090 muestra en su campo el 422 del servidor", async () => {
    servidor.use(
      http.post("*/api/destinos", () =>
        problema(422, "Datos inválidos", {
          errores: [{ campo: "nombre", mensaje: "El nombre es demasiado largo." }],
        }),
      ),
    );
    renderPestana();
    const usuario = userEvent.setup();

    await screen.findByText("Bariloche");
    await usuario.click(screen.getByRole("button", { name: /nuevo destino/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "X");
    await usuario.type(screen.getByLabelText(/país/i), "Y");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByText("El nombre es demasiado largo.")).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toBeInvalid();
  });
});

describe("RF-086 requisitos", () => {
  async function abrirRequisitos() {
    const usuario = userEvent.setup();
    const cancun = await fila("Cancún");
    await usuario.click(within(cancun).getByRole("button", { name: /requisitos/i }));
    await screen.findByText("Pasaporte vigente");
    return usuario;
  }

  it("RF-086 lista los requisitos del destino elegido", async () => {
    let pedido = "";
    servidor.use(
      http.get("*/api/destinos/:id/requisitos", ({ request }) => {
        pedido = new URL(request.url).pathname;
        return HttpResponse.json({
          items: requisitosMock,
          total: 2,
          pagina: 1,
          por_pagina: 20,
        });
      }),
    );
    renderPestana();

    await abrirRequisitos();

    expect(pedido).toBe(`/api/destinos/${destinosMock[1].id}/requisitos`);
    expect(screen.getByText("Seguro de asistencia al viajero")).toBeInTheDocument();
  });

  it("RF-086 agrega un requisito con POST /api/destinos/{id}/requisitos", async () => {
    let cuerpo: JsonBodyType;
    servidor.use(
      http.post("*/api/destinos/:id/requisitos", async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ ...requisitosMock[0], ...(cuerpo as object) }, { status: 201 });
      }),
    );
    renderPestana();
    const usuario = await abrirRequisitos();

    await usuario.click(screen.getByRole("button", { name: /agregar requisito/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "Visa de turista");
    await usuario.selectOptions(screen.getByLabelText(/tipo/i), "visa");
    await usuario.click(screen.getByLabelText(/obligatorio/i));
    await usuario.type(screen.getByLabelText(/anticipación/i), "45");
    await usuario.click(screen.getByRole("button", { name: /guardar requisito/i }));

    await waitFor(() => {
      expect(cuerpo).toMatchObject({
        nombre: "Visa de turista",
        tipo: "visa",
        obligatorio: true,
        anticipacion_dias: 45,
      });
    });
  });

  it("RF-086 rechaza una anticipación negativa sin llamar al servidor", async () => {
    let llamadas = 0;
    servidor.use(
      http.post("*/api/destinos/:id/requisitos", () => {
        llamadas += 1;
        return HttpResponse.json(requisitosMock[0], { status: 201 });
      }),
    );
    renderPestana();
    const usuario = await abrirRequisitos();

    await usuario.click(screen.getByRole("button", { name: /agregar requisito/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "Visa");
    await usuario.type(screen.getByLabelText(/anticipación/i), "-3");
    await usuario.click(screen.getByRole("button", { name: /guardar requisito/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/anticipación/i)).toBeInvalid();
    });
    expect(llamadas).toBe(0);
  });

  it("RF-086 edita un requisito con PATCH /api/requisitos-destino/{id}", async () => {
    let ruta = "";
    let cuerpo: JsonBodyType;
    servidor.use(
      http.patch("*/api/requisitos-destino/:id", async ({ request }) => {
        ruta = new URL(request.url).pathname;
        cuerpo = await request.json();
        return HttpResponse.json({ ...requisitosMock[0], ...(cuerpo as object) });
      }),
    );
    renderPestana();
    const usuario = await abrirRequisitos();

    const pasaporte = await fila("Pasaporte vigente");
    await usuario.click(within(pasaporte).getByRole("button", { name: /editar/i }));
    const anticipacion = await screen.findByLabelText(/anticipación/i);
    expect(anticipacion).toHaveValue(30);
    await usuario.clear(anticipacion);
    await usuario.type(anticipacion, "60");
    await usuario.click(screen.getByRole("button", { name: /guardar requisito/i }));

    await waitFor(() => {
      expect(cuerpo).toMatchObject({ anticipacion_dias: 60 });
    });
    expect(ruta).toBe(`/api/requisitos-destino/${requisitosMock[0].id}`);
  });

  it("RF-086 quita un requisito con POST /api/requisitos-destino/{id}/baja", async () => {
    let ruta = "";
    let llamadas = 0;
    servidor.use(
      http.post("*/api/requisitos-destino/:id/baja", ({ request }) => {
        llamadas += 1;
        ruta = new URL(request.url).pathname;
        return HttpResponse.json({ ...requisitosMock[0], activo: false });
      }),
    );
    renderPestana();
    const usuario = await abrirRequisitos();

    const pasaporte = await fila("Pasaporte vigente");
    await usuario.click(within(pasaporte).getByRole("button", { name: /quitar/i }));
    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo).toHaveTextContent(/baja lógica/i);
    expect(llamadas).toBe(0);

    await usuario.click(within(dialogo).getByRole("button", { name: /confirmar/i }));

    await waitFor(() => {
      expect(ruta).toBe(`/api/requisitos-destino/${requisitosMock[0].id}/baja`);
    });
  });

  it("RF-086 no quita el requisito si se cancela la confirmación", async () => {
    let llamadas = 0;
    servidor.use(
      http.post("*/api/requisitos-destino/:id/baja", () => {
        llamadas += 1;
        return HttpResponse.json({ ...requisitosMock[0], activo: false });
      }),
    );
    renderPestana();
    const usuario = await abrirRequisitos();

    const pasaporte = await fila("Pasaporte vigente");
    await usuario.click(within(pasaporte).getByRole("button", { name: /quitar/i }));
    await usuario.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: /cancelar/i }),
    );

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(llamadas).toBe(0);
  });

  it("RF-086 avisa si falla la baja del requisito", async () => {
    servidor.use(
      http.post("*/api/requisitos-destino/:id/baja", () => problema(500, "Error interno")),
    );
    renderPestana();
    const usuario = await abrirRequisitos();

    const pasaporte = await fila("Pasaporte vigente");
    await usuario.click(within(pasaporte).getByRole("button", { name: /quitar/i }));
    await usuario.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: /confirmar/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos guardar/i);
  });

  it("RF-086 cierra los requisitos al dar de baja ese destino", async () => {
    servidor.use(
      http.post("*/api/destinos/:id/baja", () => HttpResponse.json({ ...destinosMock[1] })),
    );
    renderPestana();
    const usuario = await abrirRequisitos();

    const cancun = await fila("Cancún");
    await usuario.click(within(cancun).getByRole("button", { name: /dar de baja/i }));

    await waitFor(() => {
      expect(screen.queryByText("Pasaporte vigente")).not.toBeInTheDocument();
    });
  });

  it("RF-086 avisa si hay más requisitos que los mostrados", async () => {
    servidor.use(
      http.get("*/api/destinos/:id/requisitos", () =>
        HttpResponse.json({ items: requisitosMock, total: 25, pagina: 1, por_pagina: 2 }),
      ),
    );
    renderPestana();
    await abrirRequisitos();

    expect(screen.getByText(/mostramos 2 de 25 requisitos/i)).toBeInTheDocument();
  });

  it("RF-086 muestra el 422 del servidor en el campo del requisito", async () => {
    servidor.use(
      http.post("*/api/destinos/:id/requisitos", () =>
        problema(422, "Datos inválidos", {
          errores: [{ campo: "nombre", mensaje: "Ya hay un requisito con ese nombre." }],
        }),
      ),
    );
    renderPestana();
    const usuario = await abrirRequisitos();

    await usuario.click(screen.getByRole("button", { name: /agregar requisito/i }));
    await usuario.type(await screen.findByLabelText(/nombre/i), "Pasaporte vigente");
    await usuario.type(screen.getByLabelText(/anticipación/i), "10");
    await usuario.click(screen.getByRole("button", { name: /guardar requisito/i }));

    expect(await screen.findByText("Ya hay un requisito con ese nombre.")).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toBeInvalid();
  });
});

describe("RF-086 cambiar de destino con los requisitos abiertos (H-01)", () => {
  const requisitoDeB = {
    ...requisitosMock[0],
    id: "9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
    destino_id: destinosMock[0].id,
    nombre: "DNI vigente",
  };

  function responderPorDestino() {
    servidor.use(
      http.get("*/api/destinos/:id/requisitos", ({ params }) => {
        const items = params["id"] === destinosMock[1].id ? requisitosMock : [requisitoDeB];
        return HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 20 });
      }),
    );
  }

  async function abrirCancunYCambiarABariloche() {
    const usuario = userEvent.setup();
    const cancun = await fila("Cancún");
    await usuario.click(within(cancun).getByRole("button", { name: /requisitos/i }));
    await screen.findByText("Pasaporte vigente");
    return {
      usuario,
      cambiarABariloche: async () => {
        const bariloche = await fila("Bariloche");
        await usuario.click(within(bariloche).getByRole("button", { name: /requisitos/i }));
        await screen.findByText("DNI vigente");
      },
    };
  }

  it("RF-088 la confirmación de baja del requisito de A no sigue abierta al abrir B", async () => {
    let bajas: string[] = [];
    responderPorDestino();
    servidor.use(
      http.post("*/api/requisitos-destino/:id/baja", ({ request }) => {
        bajas = [...bajas, new URL(request.url).pathname];
        return HttpResponse.json({ ...requisitosMock[0], activo: false });
      }),
    );
    renderPestana();
    const { usuario, cambiarABariloche } = await abrirCancunYCambiarABariloche();

    const pasaporte = await fila("Pasaporte vigente");
    await usuario.click(within(pasaporte).getByRole("button", { name: /quitar/i }));
    await screen.findByRole("alertdialog");
    await cambiarABariloche();

    expect(screen.getByRole("heading", { name: /requisitos de bariloche/i })).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(bajas).toEqual([]);
  });

  it("RF-087 el formulario de edición del requisito de A no sigue abierto al abrir B", async () => {
    responderPorDestino();
    renderPestana();
    const { usuario, cambiarABariloche } = await abrirCancunYCambiarABariloche();

    const pasaporte = await fila("Pasaporte vigente");
    await usuario.click(within(pasaporte).getByRole("button", { name: /editar/i }));
    await screen.findByRole("button", { name: /guardar requisito/i });
    await cambiarABariloche();

    expect(screen.getByRole("heading", { name: /requisitos de bariloche/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /guardar requisito/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/anticipación/i)).not.toBeInTheDocument();
  });
});
