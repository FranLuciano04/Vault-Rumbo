import { crearCliente } from "@rumbo/shared";
import {
  clientesMock,
  crearServidor,
  idHotelMock,
  idViajeMock,
  manejadoresClientes,
  manejadoresHotelesPara,
  manejadoresM1,
  manejadoresViajes,
  usuariosPorRol,
  type RolMock,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, type RequestHandler } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { DetalleHotel } from "./DetalleHotel";

const servidor = crearServidor(
  ...manejadoresHotelesPara("empleado"),
  ...manejadoresM1,
  ...manejadoresClientes,
  ...manejadoresViajes,
);
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
const camila = clientesMock[0];
if (!camila) throw new Error("faltan clientes en los mocks");
const RESENA_1 = "Muy bueno, el desayuno flojo.";
const ID_RESENA_1 = "e1a2b3c4-d5e6-4f70-8a9b-0c1d2e3f4a02";
const RESENA_2 = "Las vistas al lago valen cada peso.";

type Escritura = { metodo: string; ruta: string; cuerpo: Record<string, unknown> | null };

// Supuesto: el registro y la edición se hacen desde el detalle del hotel (la entrada desde un viaje
// queda fuera: M6 no existe en la web todavía).
function renderDetalle(rol: RolMock, ...propios: RequestHandler[]) {
  servidor.use(...propios, ...manejadoresHotelesPara(rol));
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <DetalleHotel
          cliente={cliente}
          usuario={usuariosPorRol[rol]}
          hotelId={idHotelMock.llaoLlao}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function espiarEscrituras(pedidos: Escritura[]) {
  servidor.events.on("request:start", async ({ request }) => {
    if (request.method === "GET") return;
    const texto = await request.clone().text();
    pedidos.push({
      metodo: request.method,
      ruta: new URL(request.url).pathname,
      cuerpo: texto ? (JSON.parse(texto) as Record<string, unknown>) : null,
    });
  });
}

const botonNueva = () => screen.queryByRole("button", { name: /nueva reseña/i });
const botonesEditar = () => screen.queryAllByRole("button", { name: /editar reseña/i });

/** Abre el formulario de alta y devuelve el buscador de cliente. */
async function abrirAlta(usuario: ReturnType<typeof userEvent.setup>) {
  await screen.findByText(RESENA_1);
  await usuario.click(screen.getByRole("button", { name: /nueva reseña/i }));
  return screen.findByLabelText(/cliente/i);
}

/** Busca al cliente en el servidor por su nombre y lo elige de los resultados. */
async function elegirCliente(usuario: ReturnType<typeof userEvent.setup>, id: string) {
  const elegido = clientesMock.find((c) => c.id === id);
  if (!elegido) throw new Error("cliente inexistente en los mocks");
  await usuario.type(screen.getByLabelText(/cliente/i), elegido.nombre.split(" ")[0] ?? "");
  await usuario.click(await screen.findByRole("button", { name: new RegExp(elegido.nombre) }));
}

// Supuesto: el cliente se busca por nombre (buscador con label «Buscar cliente»), el puntaje es
// un número (label «Puntaje»), y la fecha un input date (label «Fecha»).
async function completar(
  usuario: ReturnType<typeof userEvent.setup>,
  datos: { cliente?: string; puntaje?: string; comentario?: string; fecha?: string },
) {
  if (datos.cliente) await elegirCliente(usuario, datos.cliente);
  if (datos.puntaje !== undefined) {
    const puntaje = screen.getByLabelText(/puntaje/i);
    await usuario.clear(puntaje);
    if (datos.puntaje) await usuario.type(puntaje, datos.puntaje);
  }
  if (datos.comentario) await usuario.type(screen.getByLabelText(/comentario/i), datos.comentario);
  if (datos.fecha)
    fireEvent.change(screen.getByLabelText(/fecha/i), { target: { value: datos.fecha } });
}

describe("RF-101 reseña", () => {
  it.each<RolMock>(["empleado", "admin", "dueno"])(
    "%s ve el botón «Nueva reseña» en el detalle del hotel",
    async (rol) => {
      renderDetalle(rol);
      await screen.findByText(RESENA_1);
      expect(botonNueva()).toBeInTheDocument();
    },
  );

  it("el freelance solo consulta: no ve «Nueva reseña» ni «Editar reseña» (CU-17)", async () => {
    renderDetalle("freelance");
    await screen.findByText(RESENA_1);
    expect(botonNueva()).not.toBeInTheDocument();
    expect(botonesEditar()).toHaveLength(0);
  });

  it("el formulario pide cliente, viaje opcional, puntaje, comentario y fecha", async () => {
    const usuario = userEvent.setup();
    renderDetalle("empleado");
    await abrirAlta(usuario);
    expect(screen.getByLabelText(/puntaje/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/comentario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/viaje/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cliente/i)).toBeRequired();
  });

  it("registra la reseña sin viaje (A2): POST al hotel con cliente, puntaje, comentario y fecha", async () => {
    const pedidos: Escritura[] = [];
    espiarEscrituras(pedidos);
    const usuario = userEvent.setup();
    renderDetalle("empleado");
    await abrirAlta(usuario);
    await completar(usuario, {
      cliente: camila.id,
      puntaje: "4",
      comentario: "Todo muy prolijo.",
      fecha: "2026-10-20",
    });
    await usuario.click(screen.getByRole("button", { name: /guardar reseña/i }));
    await waitFor(() => {
      expect(pedidos).toHaveLength(1);
    });
    expect(pedidos[0]?.metodo).toBe("POST");
    expect(pedidos[0]?.ruta).toBe(`/api/hoteles/${idHotelMock.llaoLlao}/resenas`);
    expect(pedidos[0]?.cuerpo).toMatchObject({
      cliente_id: camila.id,
      puntaje: 4,
      comentario: "Todo muy prolijo.",
      fecha: "2026-10-20",
    });
    // El viaje es opcional: sin viaje no se manda un id inventado.
    expect(pedidos[0]?.cuerpo?.["viaje_id"] ?? null).toBeNull();
  });

  it("tras registrar, cierra el formulario y refresca las reseñas del hotel", async () => {
    const usuario = userEvent.setup();
    let lecturas = 0;
    renderDetalle(
      "empleado",
      http.get("*/api/hoteles/:id/resenas", () => {
        lecturas += 1;
        return HttpResponse.json({ items: [], total: 0, pagina: 1, por_pagina: 20 });
      }),
    );
    await screen.findByText(/todavía no hay reseñas/i);
    await usuario.click(screen.getByRole("button", { name: /nueva reseña/i }));
    await screen.findByLabelText(/cliente/i);
    await completar(usuario, { cliente: camila.id, puntaje: "5", fecha: "2026-10-20" });
    const antes = lecturas;
    await usuario.click(screen.getByRole("button", { name: /guardar reseña/i }));
    await waitFor(() => {
      expect(screen.queryByLabelText(/puntaje/i)).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(lecturas).toBeGreaterThan(antes);
    });
  });

  it.each(["0", "6"])(
    "A3: un puntaje fuera de 1 a 5 (%s) no se envía y pide corregir",
    async (puntaje) => {
      const pedidos: Escritura[] = [];
      espiarEscrituras(pedidos);
      const usuario = userEvent.setup();
      renderDetalle("empleado");
      await abrirAlta(usuario);
      await completar(usuario, { cliente: camila.id, puntaje, fecha: "2026-10-20" });
      await usuario.click(screen.getByRole("button", { name: /guardar reseña/i }));
      expect(await screen.findByText(/1 (a|y) 5/i)).toBeInTheDocument();
      expect(pedidos).toHaveLength(0);
    },
  );

  it("A3: sin cliente no se envía y avisa que falta elegirlo", async () => {
    const pedidos: Escritura[] = [];
    espiarEscrituras(pedidos);
    const usuario = userEvent.setup();
    renderDetalle("empleado");
    await abrirAlta(usuario);
    await completar(usuario, { puntaje: "4", fecha: "2026-10-20" });
    await usuario.click(screen.getByRole("button", { name: /guardar reseña/i }));
    expect(
      await screen.findByText(/cliente/i, { selector: "[role=alert], p" }),
    ).toBeInTheDocument();
    expect(pedidos).toHaveLength(0);
  });

  it("muestra el error 422 del servidor y deja el formulario abierto con lo cargado", async () => {
    const usuario = userEvent.setup();
    renderDetalle(
      "empleado",
      http.post("*/api/hoteles/:id/resenas", () =>
        HttpResponse.json(
          {
            title: "Datos inválidos",
            status: 422,
            detail: "La fecha no puede ser futura.",
            errores: [
              { campo: "fecha", mensaje: "La fecha no puede ser futura." },
              { campo: "body", mensaje: "Revisá los datos de la reseña." },
            ],
          },
          { status: 422, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    );
    await abrirAlta(usuario);
    await completar(usuario, {
      cliente: camila.id,
      puntaje: "4",
      comentario: "Lindo",
      fecha: "2026-10-20",
    });
    await usuario.click(screen.getByRole("button", { name: /guardar reseña/i }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha/i)).toHaveAccessibleDescription(/no puede ser futura/i);
    expect(screen.getByLabelText(/comentario/i)).toHaveValue("Lindo");
  });

  it("busca al cliente en el servidor con lo que se escribe", async () => {
    const buscados: (string | null)[] = [];
    const usuario = userEvent.setup();
    renderDetalle(
      "empleado",
      http.get("*/api/clientes", ({ request }) => {
        buscados.push(new URL(request.url).searchParams.get("buscar"));
        return HttpResponse.json({
          items: [camila],
          total: 1,
          pagina: 1,
          por_pagina: 5,
        });
      }),
    );
    await abrirAlta(usuario);
    await usuario.type(screen.getByLabelText(/cliente/i), "Cami");
    expect(
      await screen.findByRole("button", { name: new RegExp(camila.nombre) }),
    ).toBeInTheDocument();
    expect(buscados).toContain("Cami");
  });

  it("A1: ofrece los viajes del cliente y manda el elegido como viaje_id", async () => {
    const pedidos: Escritura[] = [];
    espiarEscrituras(pedidos);
    const usuario = userEvent.setup();
    renderDetalle("empleado");
    await abrirAlta(usuario);
    expect(screen.getByLabelText(/viaje/i)).toBeDisabled();
    await completar(usuario, { cliente: camila.id, puntaje: "5", fecha: "2026-10-20" });
    const viajes = screen.getByLabelText(/viaje/i);
    await waitFor(() => {
      expect(viajes).toBeEnabled();
    });
    await usuario.selectOptions(viajes, idViajeMock.en_curso);
    await usuario.click(screen.getByRole("button", { name: /guardar reseña/i }));
    await waitFor(() => {
      expect(pedidos).toHaveLength(1);
    });
    expect(pedidos[0]?.cuerpo).toMatchObject({
      cliente_id: camila.id,
      viaje_id: idViajeMock.en_curso,
    });
  });

  it("muestra el aviso si no se pueden cargar los viajes del cliente", async () => {
    const usuario = userEvent.setup();
    renderDetalle(
      "empleado",
      http.get("*/api/viajes", () => HttpResponse.error()),
    );
    await abrirAlta(usuario);
    await completar(usuario, { cliente: camila.id });
    expect(await screen.findByRole("alert")).toHaveTextContent(/viajes del cliente/i);
  });

  it("muestra el aviso cuando el servidor rechaza por permisos (403)", async () => {
    const usuario = userEvent.setup();
    renderDetalle(
      "empleado",
      http.post("*/api/hoteles/:id/resenas", () =>
        HttpResponse.json(
          { title: "Sin permiso", status: 403, detail: "Tu rol no permite esta acción." },
          { status: 403, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    );
    await abrirAlta(usuario);
    await completar(usuario, { cliente: camila.id, puntaje: "4", fecha: "2026-10-20" });
    await usuario.click(screen.getByRole("button", { name: /guardar reseña/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/tu rol no permite/i);
  });
});

describe("RF-105 edición", () => {
  it.each<RolMock>(["empleado", "admin", "dueno"])(
    "%s ve «Editar reseña» en cada reseña publicada",
    async (rol) => {
      renderDetalle(rol);
      await screen.findByText(RESENA_1);
      expect(botonesEditar()).toHaveLength(2);
    },
  );

  it("abre el formulario con el puntaje, el comentario y la fecha actuales", async () => {
    const usuario = userEvent.setup();
    renderDetalle("empleado");
    const fila = (await screen.findByText(RESENA_1)).closest("li") as HTMLElement;
    await usuario.click(within(fila).getByRole("button", { name: /editar reseña/i }));
    expect(await within(fila).findByLabelText(/puntaje/i)).toHaveValue(4);
    expect(within(fila).getByLabelText(/comentario/i)).toHaveValue(RESENA_1);
    expect(within(fila).getByLabelText(/fecha/i)).toHaveValue("2026-08-14");
  });

  it("guarda los cambios con PATCH a la reseña, sin tocar cliente, hotel ni viaje", async () => {
    const pedidos: Escritura[] = [];
    espiarEscrituras(pedidos);
    const usuario = userEvent.setup();
    renderDetalle("empleado");
    const fila = (await screen.findByText(RESENA_1)).closest("li") as HTMLElement;
    await usuario.click(within(fila).getByRole("button", { name: /editar reseña/i }));
    const puntaje = await within(fila).findByLabelText(/puntaje/i);
    await usuario.clear(puntaje);
    await usuario.type(puntaje, "5");
    const comentario = within(fila).getByLabelText(/comentario/i);
    await usuario.clear(comentario);
    await usuario.type(comentario, "Corregida: el desayuno mejoró.");
    await usuario.click(within(fila).getByRole("button", { name: /guardar cambios/i }));
    await waitFor(() => {
      expect(pedidos).toHaveLength(1);
    });
    expect(pedidos[0]?.metodo).toBe("PATCH");
    expect(pedidos[0]?.ruta).toBe(`/api/resenas/${ID_RESENA_1}`);
    expect(pedidos[0]?.cuerpo).toMatchObject({
      puntaje: 5,
      comentario: "Corregida: el desayuno mejoró.",
    });
    for (const inmutable of ["cliente_id", "hotel_id", "viaje_id"]) {
      expect(pedidos[0]?.cuerpo).not.toHaveProperty(inmutable);
    }
  });

  it("al guardar cierra la edición y refresca la lista", async () => {
    const usuario = userEvent.setup();
    renderDetalle("empleado");
    const fila = (await screen.findByText(RESENA_2)).closest("li") as HTMLElement;
    await usuario.click(within(fila).getByRole("button", { name: /editar reseña/i }));
    await within(fila).findByLabelText(/puntaje/i);
    await usuario.click(within(fila).getByRole("button", { name: /guardar cambios/i }));
    await waitFor(() => {
      expect(screen.queryByLabelText(/puntaje/i)).not.toBeInTheDocument();
    });
  });

  it("un puntaje fuera de 1 a 5 no se envía", async () => {
    const pedidos: Escritura[] = [];
    espiarEscrituras(pedidos);
    const usuario = userEvent.setup();
    renderDetalle("empleado");
    const fila = (await screen.findByText(RESENA_1)).closest("li") as HTMLElement;
    await usuario.click(within(fila).getByRole("button", { name: /editar reseña/i }));
    const puntaje = await within(fila).findByLabelText(/puntaje/i);
    await usuario.clear(puntaje);
    await usuario.type(puntaje, "9");
    await usuario.click(within(fila).getByRole("button", { name: /guardar cambios/i }));
    expect(await within(fila).findByText(/1 (a|y) 5/i)).toBeInTheDocument();
    expect(pedidos).toHaveLength(0);
  });

  it("muestra el error del servidor (409: reseña oculta) y conserva el formulario", async () => {
    const usuario = userEvent.setup();
    renderDetalle(
      "empleado",
      http.patch("*/api/resenas/:id", () =>
        HttpResponse.json(
          { title: "Conflicto", status: 409, detail: "Restaurá la reseña antes de editarla." },
          { status: 409, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    );
    const fila = (await screen.findByText(RESENA_1)).closest("li") as HTMLElement;
    await usuario.click(within(fila).getByRole("button", { name: /editar reseña/i }));
    await within(fila).findByLabelText(/puntaje/i);
    await usuario.click(within(fila).getByRole("button", { name: /guardar cambios/i }));
    expect(await within(fila).findByRole("alert")).toHaveTextContent(/restaurá la reseña/i);
    expect(within(fila).getByLabelText(/puntaje/i)).toBeInTheDocument();
  });

  it("cancelar descarta la edición sin enviar nada", async () => {
    const pedidos: Escritura[] = [];
    espiarEscrituras(pedidos);
    const usuario = userEvent.setup();
    renderDetalle("empleado");
    const fila = (await screen.findByText(RESENA_1)).closest("li") as HTMLElement;
    await usuario.click(within(fila).getByRole("button", { name: /editar reseña/i }));
    await within(fila).findByLabelText(/puntaje/i);
    await usuario.click(within(fila).getByRole("button", { name: /cancelar/i }));
    expect(screen.queryByLabelText(/puntaje/i)).not.toBeInTheDocument();
    expect(screen.getByText(RESENA_1)).toBeInTheDocument();
    expect(pedidos).toHaveLength(0);
  });
});
