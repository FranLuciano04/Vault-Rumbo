import { crearCliente, SERVICIOS_HOTEL } from "@rumbo/shared";
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
import { http, HttpResponse, type RequestHandler } from "msw";
import { MemoryRouter, Route, Routes, useParams } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { NuevoHotel } from "./NuevoHotel";

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
const bariloche = destinosMock[0].id;
const llao = hotelesMock[0];
if (!llao) throw new Error("faltan hoteles mock");
const NUEVO_ID = "11111111-2222-4333-8444-555555555555";

function Edicion() {
  const { id } = useParams();
  return <p>{`Edición del hotel ${id ?? ""}`}</p>;
}

/** Alta en `/hoteles/nuevo`; el catálogo y la edición son marcadores. */
function renderAlta(rol: RolMock = "empleado", ...propios: RequestHandler[]) {
  servidor.use(...propios, ...manejadoresHotelesPara(rol));
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/hoteles/nuevo"]}>
        <Routes>
          <Route
            path="/hoteles/nuevo"
            element={<NuevoHotel cliente={cliente} usuario={usuariosPorRol[rol]} />}
          />
          <Route path="/hoteles" element={<p>Catálogo de hoteles</p>} />
          <Route path="/hoteles/:id/editar" element={<Edicion />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const nombre = () => screen.findByLabelText(/^nombre/i);
const precio = () => screen.getByLabelText(/precio de referencia/i);
const categoria = () => screen.getByRole("combobox", { name: /categoría/i });
const destino = () => screen.getByRole("combobox", { name: /destino/i });
const registrar = () => screen.getByRole("button", { name: /registrar hotel/i });
const chip = (servicio: string) =>
  within(screen.getByRole("group", { name: "Servicios" })).getByRole("button", {
    name: new RegExp(`^${servicio}$`, "i"),
  });

/** Registra los cuerpos del POST y responde 201 con un id fijo. */
function altaCapturada(cuerpos: Record<string, unknown>[]) {
  return http.post("*/api/hoteles", async ({ request }) => {
    const cuerpo = (await request.json()) as Record<string, unknown>;
    cuerpos.push(cuerpo);
    return HttpResponse.json({ ...llao, ...cuerpo, id: NUEVO_ID }, { status: 201 });
  });
}

async function completarMinimo(usuario: ReturnType<typeof userEvent.setup>, texto: string) {
  await usuario.type(await nombre(), texto);
  await screen.findByRole("option", { name: "Bariloche" });
  await usuario.selectOptions(destino(), "Bariloche");
}

describe("RF-097 alta de hotel", () => {
  it("RF-097 pide nombre y destino, y ofrece categoría y precio como opcionales", async () => {
    renderAlta();

    expect(await nombre()).toBeInTheDocument();
    expect(destino()).toBeInTheDocument();
    expect(screen.getByLabelText(/categoría \(opcional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/precio de referencia \(opcional\)/i)).toBeInTheDocument();
  });

  it("RF-097 los destinos del select son los activos del catálogo de destinos", async () => {
    renderAlta();

    expect(await screen.findByRole("option", { name: "Bariloche" })).toBeInTheDocument();
  });

  it("RF-097 la categoría ofrece las de CATEGORIAS_HOTEL más «sin categoría»", async () => {
    renderAlta();
    await nombre();

    const opciones = within(categoria())
      .getAllByRole("option")
      .map((o) => o.textContent.trim());
    expect(opciones).toEqual(expect.arrayContaining(["1 estrella", "3 estrellas", "5 estrellas"]));
    expect(opciones).toHaveLength(6);
  });

  it("RF-097 los servicios son un chip por cada uno de SERVICIOS_HOTEL, todos sin marcar", async () => {
    renderAlta();
    await nombre();

    const grupo = screen.getByRole("group", { name: "Servicios" });
    const chips = within(grupo).getAllByRole("button");
    expect(chips).toHaveLength(SERVICIOS_HOTEL.length);
    for (const c of chips) expect(c).toHaveAttribute("aria-pressed", "false");
  });

  it("RF-097 sin nombre no manda el alta y marca el campo", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    const usuario = userEvent.setup();
    renderAlta("empleado", altaCapturada(cuerpos));
    await screen.findByRole("option", { name: "Bariloche" });
    await usuario.selectOptions(destino(), "Bariloche");

    await usuario.click(registrar());

    expect(await screen.findByText("Ingresá el nombre.")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-097 sin destino no manda el alta y marca el campo", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    const usuario = userEvent.setup();
    renderAlta("empleado", altaCapturada(cuerpos));
    await usuario.type(await nombre(), "Hotel Nuevo");

    await usuario.click(registrar());

    expect(await screen.findByText("Elegí un destino.")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-097 un precio con formato inválido se rechaza", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    const usuario = userEvent.setup();
    renderAlta("empleado", altaCapturada(cuerpos));
    await completarMinimo(usuario, "Hotel Nuevo");
    await usuario.type(precio(), "1.234");

    await usuario.click(registrar());

    expect(await screen.findByText(/ingresá un importe válido/i)).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-097 con solo nombre y destino el alta sale, sin categoría ni precio", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    const usuario = userEvent.setup();
    renderAlta("empleado", altaCapturada(cuerpos));
    await completarMinimo(usuario, "Hotel Nuevo");

    await usuario.click(registrar());

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({ nombre: "Hotel Nuevo", destino_id: bariloche });
    expect(cuerpos[0]?.["categoria"] ?? null).toBeNull();
    expect(cuerpos[0]?.["precio_referencia"] ?? null).toBeNull();
    expect(cuerpos[0]?.["servicios"] ?? []).toEqual([]);
  });

  it("RF-097 manda categoría, precio y los servicios marcados", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    const usuario = userEvent.setup();
    renderAlta("empleado", altaCapturada(cuerpos));
    await completarMinimo(usuario, "Hotel Nuevo");
    await usuario.selectOptions(categoria(), "4 estrellas");
    await usuario.type(precio(), "95000");
    await usuario.click(chip("spa"));
    await usuario.click(chip("wifi"));
    expect(chip("spa")).toHaveAttribute("aria-pressed", "true");

    await usuario.click(registrar());

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({
      nombre: "Hotel Nuevo",
      destino_id: bariloche,
      categoria: "4 estrellas",
      precio_referencia: "95000",
    });
    expect([...(cuerpos[0]?.["servicios"] as string[])].sort()).toEqual(["spa", "wifi"]);
  });

  it("RF-097 volver a tocar un chip lo desmarca", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    const usuario = userEvent.setup();
    renderAlta("empleado", altaCapturada(cuerpos));
    await completarMinimo(usuario, "Hotel Nuevo");
    await usuario.click(chip("spa"));
    await usuario.click(chip("spa"));

    await usuario.click(registrar());

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["servicios"] ?? []).toEqual([]);
  });

  it("RF-097 tras el alta vuelve al catálogo", async () => {
    const usuario = userEvent.setup();
    renderAlta("empleado", altaCapturada([]));
    await completarMinimo(usuario, "Hotel Nuevo");

    await usuario.click(registrar());

    expect(await screen.findByText("Catálogo de hoteles")).toBeInTheDocument();
  });

  it("RF-097 «Cancelar» vuelve al catálogo sin mandar nada", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    const usuario = userEvent.setup();
    renderAlta("empleado", altaCapturada(cuerpos));
    await nombre();

    await usuario.click(screen.getByRole("link", { name: /cancelar/i }));

    expect(await screen.findByText("Catálogo de hoteles")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-097 muestra el 422 del destino en su campo", async () => {
    const usuario = userEvent.setup();
    renderAlta(
      "empleado",
      http.post("*/api/hoteles", () =>
        HttpResponse.json(
          {
            title: "Error de validación",
            status: 422,
            errores: [{ campo: "destino_id", mensaje: "El destino no existe." }],
          },
          { status: 422, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    );
    await completarMinimo(usuario, "Hotel Nuevo");

    await usuario.click(registrar());

    expect(await screen.findByText("El destino no existe.")).toBeInTheDocument();
    expect(screen.queryByText("Catálogo de hoteles")).not.toBeInTheDocument();
  });

  it.each(["empleado", "admin", "dueno"] as RolMock[])(
    "RF-097 %s puede entrar al alta",
    async (rol) => {
      renderAlta(rol);

      expect(await nombre()).toBeInTheDocument();
    },
  );

  it("RF-097 el freelance no entra al alta: vuelve al catálogo", async () => {
    renderAlta("freelance");

    expect(await screen.findByText("Catálogo de hoteles")).toBeInTheDocument();
    expect(screen.queryByLabelText(/^nombre/i)).not.toBeInTheDocument();
  });
});

describe("RF-099 duplicado", () => {
  async function altaRepetida() {
    const usuario = userEvent.setup();
    renderAlta();
    await completarMinimo(usuario, llao?.nombre ?? "");
    await usuario.click(registrar());
    return usuario;
  }

  it("RF-099 un hotel con el mismo nombre y destino avisa que ya existe, con el existente", async () => {
    await altaRepetida();

    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent("Ya existe un hotel con ese nombre en el destino.");
    expect(aviso).toHaveTextContent("Hotel Llao Llao");
    expect(screen.queryByText("Catálogo de hoteles")).not.toBeInTheDocument();
  });

  it("RF-099 «Abrir el hotel existente» lleva a su edición", async () => {
    const usuario = await altaRepetida();

    await usuario.click(await screen.findByRole("link", { name: /abrir el hotel existente/i }));

    expect(await screen.findByText(`Edición del hotel ${llao.id}`)).toBeInTheDocument();
  });

  it("RF-099 no hay «guardar igual»: el alta no se puede forzar", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    const usuario = userEvent.setup();
    renderAlta(
      "empleado",
      http.post("*/api/hoteles", async ({ request }) => {
        cuerpos.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          {
            title: "Conflicto",
            status: 409,
            detail: "Ya existe un hotel con ese nombre en el destino.",
            existente: { id: llao.id, nombre: llao.nombre },
          },
          { status: 409, headers: { "content-type": "application/problem+json" } },
        );
      }),
    );
    await completarMinimo(usuario, llao.nombre);
    await usuario.click(registrar());
    await screen.findByRole("alert");

    expect(
      screen.queryByRole("button", { name: /guardar igual|confirmar|crear igual/i }),
    ).toBeNull();
    expect(cuerpos).toHaveLength(1);
    expect(cuerpos[0]).not.toHaveProperty("confirmar_duplicado");
  });
});
