import { crearCliente } from "@rumbo/shared";
import {
  crearServidor,
  hotelesMock,
  idHotelMock,
  manejadoresHotelesPara,
  manejadoresM1,
  usuariosPorRol,
  type RolMock,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, type RequestHandler } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { EditarHotel } from "./EditarHotel";

const servidor = crearServidor(...manejadoresHotelesPara("empleado"), ...manejadoresM1);
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
const llao = hotelesMock[0];
if (!llao) throw new Error("faltan hoteles mock");

/** Edición en `/hoteles/:id/editar`; el catálogo es un marcador. */
function renderEdicion(
  rol: RolMock = "empleado",
  hotelId: string = idHotelMock.llaoLlao,
  ...propios: RequestHandler[]
) {
  servidor.use(...propios, ...manejadoresHotelesPara(rol));
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/hoteles/${hotelId}/editar`]}>
        <Routes>
          <Route
            path="/hoteles/:id/editar"
            element={<EditarHotel cliente={cliente} usuario={usuariosPorRol[rol]} />}
          />
          <Route path="/hoteles" element={<p>Catálogo de hoteles</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const nombre = () => screen.findByDisplayValue("Hotel Llao Llao");
const precio = () => screen.getByLabelText(/precio de referencia/i);
const categoria = () => screen.getByRole("combobox", { name: /categoría/i });
const guardar = () => screen.getByRole("button", { name: /guardar cambios/i });
const chip = (servicio: string) =>
  within(screen.getByRole("group", { name: "Servicios" })).getByRole("button", {
    name: new RegExp(`^${servicio}$`, "i"),
  });

/** Registra los cuerpos del PATCH y responde 200 con el hotel actualizado. */
function edicionCapturada(cuerpos: Record<string, unknown>[]) {
  return http.patch("*/api/hoteles/:id", async ({ request }) => {
    const cuerpo = (await request.json()) as Record<string, unknown>;
    cuerpos.push(cuerpo);
    return HttpResponse.json({ ...llao, ...cuerpo });
  });
}

const problema = (status: number, extra: object) =>
  HttpResponse.json(
    { title: "Problema", status, ...extra },
    { status, headers: { "content-type": "application/problem+json" } },
  );

describe("RF-098 edición", () => {
  it("RF-098 precarga nombre, destino, categoría, precio y servicios del hotel", async () => {
    renderEdicion();

    expect(await nombre()).toBeInTheDocument();
    await screen.findByRole("option", { name: "Bariloche" });
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /destino/i })).toHaveDisplayValue("Bariloche");
    });
    expect(categoria()).toHaveDisplayValue("5 estrellas");
    expect(precio()).toHaveValue("150000.00");
    expect(chip("wifi")).toHaveAttribute("aria-pressed", "true");
    expect(chip("pileta")).toHaveAttribute("aria-pressed", "true");
    expect(chip("desayuno incluido")).toHaveAttribute("aria-pressed", "true");
    expect(chip("spa")).toHaveAttribute("aria-pressed", "false");
  });

  it("RF-098 si el hotel no existe avisa que no se pudo cargar", async () => {
    renderEdicion(
      "empleado",
      "00000000-0000-4000-8000-000000000000",
      http.get("*/api/hoteles/:id", () => problema(404, { detail: "El hotel no existe." })),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos cargar el hotel/i);
  });

  it("RF-098 manda solo lo que cambió (PATCH parcial)", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    const usuario = userEvent.setup();
    renderEdicion("empleado", idHotelMock.llaoLlao, edicionCapturada(cuerpos));
    const campoNombre = await nombre();

    await usuario.clear(campoNombre);
    await usuario.type(campoNombre, "Llao Llao Resort");
    await usuario.click(guardar());

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toEqual({ nombre: "Llao Llao Resort" });
  });

  it("RF-098 cambiar la categoría y el precio los manda; el resto no", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    const usuario = userEvent.setup();
    renderEdicion("empleado", idHotelMock.llaoLlao, edicionCapturada(cuerpos));
    await nombre();

    await usuario.selectOptions(categoria(), "4 estrellas");
    await usuario.clear(precio());
    await usuario.type(precio(), "120000");
    await usuario.click(guardar());

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toEqual({ categoria: "4 estrellas", precio_referencia: "120000" });
  });

  it("RF-098 cambiar un servicio manda la lista completa de servicios", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    const usuario = userEvent.setup();
    renderEdicion("empleado", idHotelMock.llaoLlao, edicionCapturada(cuerpos));
    await nombre();

    await usuario.click(chip("spa"));
    await usuario.click(chip("wifi"));
    await usuario.click(guardar());

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect([...(cuerpos[0]?.["servicios"] as string[])].sort()).toEqual([
      "desayuno incluido",
      "pileta",
      "spa",
    ]);
    expect(Object.keys(cuerpos[0] ?? {})).toEqual(["servicios"]);
  });

  it("RF-098 elegir «sin categoría» vacía la categoría con null", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    const usuario = userEvent.setup();
    renderEdicion("empleado", idHotelMock.llaoLlao, edicionCapturada(cuerpos));
    await nombre();

    await usuario.selectOptions(categoria(), "");
    await usuario.click(guardar());

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toEqual({ categoria: null });
  });

  it("RF-098 borrar el precio lo vacía con null", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    const usuario = userEvent.setup();
    renderEdicion("empleado", idHotelMock.llaoLlao, edicionCapturada(cuerpos));
    await nombre();

    await usuario.clear(precio());
    await usuario.click(guardar());

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toEqual({ precio_referencia: null });
  });

  it("RF-098 no se puede dejar el nombre vacío", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    const usuario = userEvent.setup();
    renderEdicion("empleado", idHotelMock.llaoLlao, edicionCapturada(cuerpos));

    await usuario.clear(await nombre());
    await usuario.click(guardar());

    expect(await screen.findByText("Ingresá el nombre.")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-098 tras guardar vuelve al catálogo", async () => {
    const usuario = userEvent.setup();
    renderEdicion("empleado", idHotelMock.llaoLlao, edicionCapturada([]));
    const campoNombre = await nombre();

    await usuario.type(campoNombre, " II");
    await usuario.click(guardar());

    expect(await screen.findByText("Catálogo de hoteles")).toBeInTheDocument();
  });

  it("RF-098 muestra el 422 del servidor en su campo", async () => {
    const usuario = userEvent.setup();
    renderEdicion(
      "empleado",
      idHotelMock.llaoLlao,
      http.patch("*/api/hoteles/:id", () =>
        problema(422, {
          title: "Error de validación",
          errores: [{ campo: "destino_id", mensaje: "El destino no existe." }],
        }),
      ),
    );
    await usuario.type(await nombre(), "!");

    await usuario.click(guardar());

    expect(await screen.findByText("El destino no existe.")).toBeInTheDocument();
    expect(screen.queryByText("Catálogo de hoteles")).not.toBeInTheDocument();
  });

  it("RF-098 editar un hotel cerrado: el 409 del servidor se muestra y no se sale", async () => {
    const usuario = userEvent.setup();
    renderEdicion(
      "empleado",
      idHotelMock.playaDorada,
      http.patch("*/api/hoteles/:id", () =>
        problema(409, {
          title: "Conflicto",
          detail: "El hotel está cerrado y no se puede editar.",
        }),
      ),
    );
    await usuario.type(await screen.findByDisplayValue("Hotel Playa Dorada"), "!");

    await usuario.click(guardar());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El hotel está cerrado y no se puede editar.",
    );
    expect(screen.queryByText("Catálogo de hoteles")).not.toBeInTheDocument();
  });

  it("RF-098 el freelance no entra a la edición: vuelve al catálogo", async () => {
    renderEdicion("freelance");

    expect(await screen.findByText("Catálogo de hoteles")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Hotel Llao Llao")).not.toBeInTheDocument();
  });
});

describe("RF-099 duplicado", () => {
  const conExistente = http.patch("*/api/hoteles/:id", () =>
    problema(409, {
      title: "Conflicto",
      detail: "Ya existe un hotel con ese nombre en el destino.",
      existente: { id: idHotelMock.llaoLlao, nombre: "Hotel Llao Llao" },
    }),
  );

  it("RF-099 renombrar a un hotel que ya existe avisa y ofrece abrir el existente", async () => {
    const usuario = userEvent.setup();
    renderEdicion("empleado", idHotelMock.cabanas, conExistente);
    const campoNombre = await screen.findByDisplayValue("Cabañas del Nahuel");

    await usuario.clear(campoNombre);
    await usuario.type(campoNombre, "Hotel Llao Llao");
    await usuario.click(guardar());

    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent("Ya existe un hotel con ese nombre en el destino.");
    expect(aviso).toHaveTextContent("Hotel Llao Llao");
    expect(screen.queryByText("Catálogo de hoteles")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /guardar igual|confirmar/i })).toBeNull();
  });

  it("RF-099 «Abrir el hotel existente» apunta a la edición del existente", async () => {
    const usuario = userEvent.setup();
    renderEdicion("empleado", idHotelMock.cabanas, conExistente);
    await usuario.type(await screen.findByDisplayValue("Cabañas del Nahuel"), "!");
    await usuario.click(guardar());

    const enlace = await screen.findByRole("link", { name: /abrir el hotel existente/i });

    expect(enlace).toHaveAttribute("href", `/hoteles/${idHotelMock.llaoLlao}/editar`);
  });
});

describe("RF-100 baja", () => {
  const darDeBaja = () => screen.getByRole("button", { name: /dar de baja/i });

  /** Cuenta los POST /baja que llegan, y responde como el mock. */
  function bajaCapturada(pedidos: string[]) {
    return http.post("*/api/hoteles/:id/baja", ({ params }) => {
      pedidos.push(String(params["id"]));
      return HttpResponse.json({ ...llao, estado: "cerrado" });
    });
  }

  it("RF-100 pedir la baja abre una confirmación y todavía no manda nada", async () => {
    const pedidos: string[] = [];
    const usuario = userEvent.setup();
    renderEdicion("empleado", idHotelMock.llaoLlao, bajaCapturada(pedidos));
    await nombre();

    await usuario.click(darDeBaja());

    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo).toHaveTextContent(/hotel llao llao/i);
    expect(pedidos).toHaveLength(0);
  });

  it("RF-100 cancelar la confirmación no da de baja", async () => {
    const pedidos: string[] = [];
    const usuario = userEvent.setup();
    renderEdicion("empleado", idHotelMock.llaoLlao, bajaCapturada(pedidos));
    await nombre();
    await usuario.click(darDeBaja());

    await usuario.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: /cancelar/i }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(pedidos).toHaveLength(0);
  });

  it("RF-100 confirmar manda POST /baja y vuelve al catálogo", async () => {
    const pedidos: string[] = [];
    const usuario = userEvent.setup();
    renderEdicion("empleado", idHotelMock.llaoLlao, bajaCapturada(pedidos));
    await nombre();
    await usuario.click(darDeBaja());

    await usuario.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: /confirmar/i }),
    );

    expect(await screen.findByText("Catálogo de hoteles")).toBeInTheDocument();
    expect(pedidos).toEqual([idHotelMock.llaoLlao]);
  });

  it("RF-100 si el hotel ya estaba cerrado (409) muestra el mensaje del servidor y no sale", async () => {
    const usuario = userEvent.setup();
    renderEdicion(
      "empleado",
      idHotelMock.llaoLlao,
      http.post("*/api/hoteles/:id/baja", () =>
        problema(409, { title: "Conflicto", detail: "El hotel ya está cerrado." }),
      ),
    );
    await nombre();
    await usuario.click(darDeBaja());

    await usuario.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: /confirmar/i }),
    );

    expect(await screen.findByText("El hotel ya está cerrado.")).toBeInTheDocument();
    expect(screen.queryByText("Catálogo de hoteles")).not.toBeInTheDocument();
  });

  it("RF-100 avisa con el mensaje genérico si la baja falla", async () => {
    const usuario = userEvent.setup();
    renderEdicion(
      "empleado",
      idHotelMock.llaoLlao,
      http.post("*/api/hoteles/:id/baja", () => new HttpResponse(null, { status: 500 })),
    );
    await nombre();
    await usuario.click(darDeBaja());

    await usuario.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: /confirmar/i }),
    );

    expect(await screen.findByText(/no pudimos guardar los cambios/i)).toBeInTheDocument();
    expect(screen.queryByText("Catálogo de hoteles")).not.toBeInTheDocument();
  });

  it.each(["empleado", "admin", "dueno"] as RolMock[])(
    "RF-100 %s ve «Dar de baja»",
    async (rol) => {
      renderEdicion(rol);
      await nombre();

      expect(darDeBaja()).toBeInTheDocument();
    },
  );
});
