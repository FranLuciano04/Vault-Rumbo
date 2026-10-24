import { crearCliente } from "@rumbo/shared";
import { MAX_ETIQUETAS, MAX_LARGO_ETIQUETA } from "@rumbo/shared/esquemas";
import {
  clientesMock,
  crearServidor,
  manejadoresClientes,
  manejadoresM1,
  usuariosPorRol,
  type RolMock,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse, type JsonBodyType } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { FichaCliente } from "./FichaCliente";

const ANA_ID = usuariosPorRol.empleado.id;
const TOMAS_ID = "e7b20d94-6a3f-4c15-9d8e-0b5a3f7c2e04";
const BAJA_ID = "c2d9e4f1-7a36-4b58-8e0d-3f1a5c7b9d66";

/** `GET /api/usuarios/asesores`: lo que ve un empleado, id y nombre de los usuarios activos. */
const asesoresActivos = [
  { id: usuariosPorRol.admin.id, nombre: "Lucía Fernández" },
  { id: ANA_ID, nombre: "Ana Pérez" },
  { id: TOMAS_ID, nombre: "Tomás Roldán" },
];
const manejadorAsesores = http.get("*/api/usuarios/asesores", () =>
  HttpResponse.json(asesoresActivos),
);

const servidor = crearServidor(manejadorAsesores, ...manejadoresClientes, ...manejadoresM1);
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

const [camila, sosa] = clientesMock;
if (!camila || !sosa) throw new Error("faltan clientes mock");

const CAMILA_ID = camila.id;

function renderFicha(id: string, rol: RolMock = "empleado") {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/clientes/${id}`]}>
        <Routes>
          <Route
            path="/clientes/:id"
            element={<FichaCliente cliente={cliente} usuario={usuariosPorRol[rol]} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const problema = (status: number, title: string, extra: object = {}) =>
  HttpResponse.json(
    { title, status, ...extra },
    { status, headers: { "content-type": "application/problem+json" } },
  );

async function abrirEdicion(id = CAMILA_ID, rol: RolMock = "empleado") {
  const usuario = userEvent.setup();
  renderFicha(id, rol);
  await usuario.click(await screen.findByRole("button", { name: /editar/i }));
  return usuario;
}

/** Registra el PATCH y responde la ficha con los cambios aplicados. */
function capturarPatch() {
  const registro: { ruta: string; cuerpo: JsonBodyType } = { ruta: "", cuerpo: null };
  servidor.use(
    http.patch("*/api/clientes/:id", async ({ request }) => {
      registro.ruta = new URL(request.url).pathname;
      registro.cuerpo = await request.json();
      return HttpResponse.json({ ...camila, ...(registro.cuerpo as object) });
    }),
  );
  return registro;
}

describe("RF-006 historial", () => {
  it("RF-006 muestra los datos del cliente: nombre, contacto, Instagram, segmento y etiquetas", async () => {
    renderFicha(camila.id);

    expect(await screen.findByRole("heading", { name: "Camila Benítez" })).toBeInTheDocument();
    expect(screen.getByText("+54 9 11 5555-1234")).toBeInTheDocument();
    expect(screen.getByText(/camila\.benitez/)).toBeInTheDocument();
    const encabezado = screen.getByRole("heading", { name: "Camila Benítez" }).parentElement;
    expect(within(encabezado as HTMLElement).getByText("Pareja")).toBeInTheDocument();
    expect(screen.getByText("Caribe")).toBeInTheDocument();
    expect(screen.getByText("luna de miel")).toBeInTheDocument();
    expect(screen.getByText("Hoteles todo incluido, vuelos directos.")).toBeInTheDocument();
  });

  it("RF-006 lista las oportunidades del historial con un enlace a cada una", async () => {
    renderFicha(camila.id);

    const enlace = await screen.findByRole("link", { name: /punta cana/i });
    expect(enlace).toHaveAttribute(
      "href",
      expect.stringContaining("6b2d9f08-7e41-4c5a-8d13-0a9e3c5b7f44"),
    );
  });

  it("RF-006 lista los viajes del historial con un enlace a cada uno", async () => {
    renderFicha(camila.id);

    const enlace = await screen.findByRole("link", { name: /finalizado/i });
    expect(enlace).toHaveAttribute(
      "href",
      expect.stringContaining("f0a7c3d9-2b64-4e18-9c5d-8b1e6a4d2f55"),
    );
  });

  it("RF-006 lista las reseñas del historial con su comentario y un enlace", async () => {
    renderFicha(camila.id);

    const enlace = await screen.findByRole("link", {
      name: /excelente atención y muy buena ubicación/i,
    });
    expect(enlace).toHaveAttribute(
      "href",
      expect.stringContaining("2e9a4c7d-8b13-4d60-b5f2-6c0a8e3d1b77"),
    );
  });

  it("RF-006 sin historial muestra un estado vacío por cada sección", async () => {
    renderFicha(sosa.id);

    expect(await screen.findByRole("heading", { name: "Familia Sosa" })).toBeInTheDocument();
    expect(await screen.findByText(/sin oportunidades/i)).toBeInTheDocument();
    expect(screen.getByText(/sin viajes/i)).toBeInTheDocument();
    expect(screen.getByText(/sin reseñas/i)).toBeInTheDocument();
  });

  it("RF-006 un cliente sin Instagram no muestra ningún usuario", async () => {
    renderFicha(sosa.id);

    await screen.findByRole("heading", { name: "Familia Sosa" });
    expect(screen.queryByText(/^@/)).not.toBeInTheDocument();
    expect(screen.queryByText("Instagram")).not.toBeInTheDocument();
  });

  it("RF-006 muestra un estado de carga mientras llega la ficha", async () => {
    servidor.use(
      http.get("*/api/clientes/:id", async () => {
        await delay("infinite");
        return HttpResponse.json({});
      }),
    );
    renderFicha(camila.id);

    expect(await screen.findByRole("status")).toHaveTextContent(/cargando/i);
  });

  it("RF-006 si falla el historial la ficha sigue visible y avisa del error", async () => {
    servidor.use(http.get("*/api/clientes/:id/historial", () => problema(500, "Error interno")));
    renderFicha(camila.id);

    expect(await screen.findByRole("heading", { name: "Camila Benítez" })).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos cargar el historial/i);
  });

  it("RF-006 un cliente inexistente (404) muestra un estado claro y no la ficha", async () => {
    renderFicha("00000000-0000-4000-8000-000000000000");

    expect(await screen.findByText(/cliente no encontrado/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /volver a clientes/i })).toHaveAttribute(
      "href",
      "/clientes",
    );
    expect(screen.queryByRole("button", { name: /editar/i })).not.toBeInTheDocument();
  });
});

describe("RF-007 edición", () => {
  it("RF-007 «Editar» abre el formulario con los datos actuales", async () => {
    await abrirEdicion();

    expect(await screen.findByLabelText(/nombre/i)).toHaveValue("Camila Benítez");
    expect(screen.getByLabelText(/contacto/i)).toHaveValue("+54 9 11 5555-1234");
    expect(screen.getByLabelText(/instagram/i)).toHaveValue("camila.benitez");
    expect(screen.getByLabelText(/segmento/i)).toHaveValue("pareja");
    expect(screen.getByLabelText(/preferencias/i)).toHaveValue(
      "Hoteles todo incluido, vuelos directos.",
    );
  });

  it("RF-007 el PATCH lleva solo los campos modificados", async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion();

    const nombre = await screen.findByLabelText(/nombre/i);
    await usuario.clear(nombre);
    await usuario.type(nombre, "Camila Benítez Ruiz");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(registro.cuerpo).toEqual({ nombre: "Camila Benítez Ruiz" });
    });
    expect(registro.ruta).toBe(`/api/clientes/${camila.id}`);
  });

  it("RF-007 cambia el segmento y las preferencias sin tocar el resto", async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion();

    await usuario.selectOptions(await screen.findByLabelText(/segmento/i), "familia");
    const preferencias = screen.getByLabelText(/preferencias/i);
    await usuario.clear(preferencias);
    await usuario.type(preferencias, "Viaja con chicos");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(registro.cuerpo).toEqual({ segmento: "familia", preferencias: "Viaja con chicos" });
    });
  });

  it("RF-007 el Instagram es opcional: vaciarlo manda null", async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion();

    await usuario.clear(await screen.findByLabelText(/instagram/i));
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(registro.cuerpo).toEqual({ instagram: null });
    });
  });

  it("RF-007 un Instagram con @ y mayúsculas se acepta y se manda normalizado", async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion(sosa.id);

    await usuario.type(await screen.findByLabelText(/instagram/i), "@Familia.Sosa");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(registro.cuerpo).toEqual({ instagram: "familia.sosa" });
    });
  });

  it("RF-007 un Instagram inválido se marca en el campo y no se manda", async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion();

    const instagram = await screen.findByLabelText(/instagram/i);
    await usuario.clear(instagram);
    await usuario.type(instagram, "con espacios!");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/instagram/i)).toBeInvalid();
    });
    expect(registro.cuerpo).toBeNull();
  });

  it("RF-007 un contacto vacío o inválido no manda el PATCH y marca el campo", async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion();

    const contacto = await screen.findByLabelText(/contacto/i);
    await usuario.clear(contacto);
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));
    await waitFor(() => {
      expect(screen.getByLabelText(/contacto/i)).toBeInvalid();
    });

    await usuario.type(contacto, "no-es-un-contacto");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));
    expect(await screen.findByText(/teléfono o un email válido/i)).toBeInTheDocument();
    expect(registro.cuerpo).toBeNull();
  });

  it("RF-007 sin nombre no manda el PATCH y marca el campo", async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion();

    await usuario.clear(await screen.findByLabelText(/nombre/i));
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/nombre/i)).toBeInvalid();
    });
    expect(registro.cuerpo).toBeNull();
  });

  it("RF-007 muestra en su campo el 422 del servidor", async () => {
    servidor.use(
      http.patch("*/api/clientes/:id", () =>
        problema(422, "Datos inválidos", {
          errores: [{ campo: "contacto", mensaje: "Ese contacto ya pertenece a otro cliente." }],
        }),
      ),
    );
    const usuario = await abrirEdicion();

    const contacto = await screen.findByLabelText(/contacto/i);
    await usuario.clear(contacto);
    await usuario.type(contacto, "otro@mail.test");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByText("Ese contacto ya pertenece a otro cliente."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/contacto/i)).toBeInvalid();
    expect(screen.getByLabelText(/contacto/i)).toHaveValue("otro@mail.test");
  });

  it("RF-007 tras guardar cierra el formulario y muestra los datos nuevos", async () => {
    capturarPatch();
    const usuario = await abrirEdicion();

    const nombre = await screen.findByLabelText(/nombre/i);
    await usuario.clear(nombre);
    await usuario.type(nombre, "Camila B.");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.queryByLabelText(/nombre/i)).not.toBeInTheDocument();
    });
    expect(await screen.findByRole("heading", { name: "Camila B." })).toBeInTheDocument();
  });

  it("RF-007 cancelar descarta los cambios y no llama al servidor", async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion();

    const nombre = await screen.findByLabelText(/nombre/i);
    await usuario.clear(nombre);
    await usuario.type(nombre, "Otro nombre");
    await usuario.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(screen.queryByLabelText(/nombre/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Camila Benítez" })).toBeInTheDocument();
    expect(registro.cuerpo).toBeNull();
  });

  it("RF-150 el admin ve el selector de asesor con el asesor actual y puede cambiarlo", async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion(camila.id, "admin");

    const asesor = await screen.findByLabelText(/asesor/i);
    await waitFor(() => {
      expect(asesor).toHaveValue(camila.asesor_asignado_id);
    });
    await usuario.selectOptions(asesor, TOMAS_ID);
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(registro.cuerpo).toEqual({ asesor_asignado_id: TOMAS_ID });
    });
  });

  it("RF-150 el freelance no ve el selector de asesor y su PATCH no lo manda", async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion(camila.id, "freelance");

    const nombre = await screen.findByLabelText(/nombre/i);
    expect(screen.queryByLabelText(/asesor/i)).not.toBeInTheDocument();
    await usuario.clear(nombre);
    await usuario.type(nombre, "Camila B.");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(registro.cuerpo).toEqual({ nombre: "Camila B." });
    });
  });
});

/** La ficha tal como la devuelve el backend: con el asesor `{id, nombre}` (o `null`). */
function fichaConAsesor(asesor: { id: string; nombre: string } | null, extra: object = {}) {
  servidor.use(
    http.get("*/api/clientes/:id", () =>
      HttpResponse.json({
        ...camila,
        asesor_asignado_id: asesor?.id ?? null,
        asesor,
        ...extra,
      }),
    ),
  );
}

describe("RF-006 tarjeta Perfil (pantallas 10 y 40 del prototipo)", () => {
  it("RF-006 muestra una tarjeta «Perfil» con el segmento y el nombre del asesor", async () => {
    fichaConAsesor({ id: ANA_ID, nombre: "Laura Asesora" });
    renderFicha(camila.id);

    const titulo = await screen.findByRole("heading", { name: "Perfil" });
    const tarjeta = titulo.closest("section");
    expect(tarjeta).not.toBeNull();
    expect(within(tarjeta as HTMLElement).getByText("Pareja")).toBeInTheDocument();
    expect(within(tarjeta as HTMLElement).getByText("Laura Asesora")).toBeInTheDocument();
  });

  it("RF-006 sin asesor la tarjeta «Perfil» dice «Sin asesor»", async () => {
    fichaConAsesor(null);
    renderFicha(camila.id);

    const titulo = await screen.findByRole("heading", { name: "Perfil" });
    expect(
      within(titulo.closest("section") as HTMLElement).getByText("Sin asesor"),
    ).toBeInTheDocument();
  });

  it("RF-006 el asesor de baja se muestra igual por su nombre en la tarjeta", async () => {
    fichaConAsesor({ id: BAJA_ID, nombre: "Beatriz Baja" });
    renderFicha(camila.id);

    const titulo = await screen.findByRole("heading", { name: "Perfil" });
    expect(
      within(titulo.closest("section") as HTMLElement).getByText(/Beatriz Baja/),
    ).toBeInTheDocument();
  });
});

describe("RF-007 / RF-150 selector de asesor", () => {
  it("RF-150 el selector sale de GET /api/usuarios/asesores y no de /api/usuarios", async () => {
    const pedidos: string[] = [];
    servidor.use(
      http.get("*/api/usuarios", ({ request }) => {
        pedidos.push(new URL(request.url).pathname);
        return problema(403, "Prohibido");
      }),
      http.get("*/api/usuarios/asesores", ({ request }) => {
        pedidos.push(new URL(request.url).pathname);
        return HttpResponse.json(asesoresActivos);
      }),
    );
    await abrirEdicion(camila.id, "admin");

    const asesor = await screen.findByLabelText(/asesor/i);
    await within(asesor).findByRole("option", { name: "Tomás Roldán" });
    expect(pedidos).toContain("/api/usuarios/asesores");
    expect(pedidos).not.toContain("/api/usuarios");
  });

  it("RF-007 el empleado ve el selector de asesor y puede reasignar", async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion(camila.id, "empleado");

    const asesor = await screen.findByLabelText(/asesor/i);
    await within(asesor).findByRole("option", { name: "Tomás Roldán" });
    await usuario.selectOptions(asesor, TOMAS_ID);
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(registro.cuerpo).toEqual({ asesor_asignado_id: TOMAS_ID });
    });
  });

  it("RF-150 el dueño ve el selector de asesor con los asesores activos", async () => {
    await abrirEdicion(camila.id, "dueno");

    const asesor = await screen.findByLabelText(/asesor/i);
    expect(await within(asesor).findByRole("option", { name: "Tomás Roldán" })).toBeInTheDocument();
    expect(within(asesor).getByRole("option", { name: "Sin asesor" })).toBeInTheDocument();
  });

  it("RF-150 el freelance no ve el selector ni pide la lista de asesores", async () => {
    let pidio = false;
    servidor.use(
      http.get("*/api/usuarios/asesores", () => {
        pidio = true;
        return problema(403, "Prohibido");
      }),
    );
    await abrirEdicion(camila.id, "freelance");

    await screen.findByLabelText(/nombre/i);
    expect(screen.queryByLabelText(/asesor/i)).not.toBeInTheDocument();
    expect(pidio).toBe(false);
  });

  it("RF-007 si el asesor actual está de baja aparece como «nombre (de baja)» y queda seleccionado", async () => {
    fichaConAsesor({ id: BAJA_ID, nombre: "Beatriz Baja" });
    await abrirEdicion(camila.id, "empleado");

    const asesor = await screen.findByLabelText(/asesor/i);
    const opcion = await within(asesor).findByRole("option", { name: "Beatriz Baja (de baja)" });
    expect(opcion).toHaveValue(BAJA_ID);
    await waitFor(() => {
      expect(asesor).toHaveValue(BAJA_ID);
    });
  });

  it("RF-007 con el asesor de baja, elegir «Sin asesor» manda asesor_asignado_id: null", async () => {
    fichaConAsesor({ id: BAJA_ID, nombre: "Beatriz Baja" });
    const registro = capturarPatch();
    const usuario = await abrirEdicion(camila.id, "empleado");

    const asesor = await screen.findByLabelText(/asesor/i);
    await within(asesor).findByRole("option", { name: "Beatriz Baja (de baja)" });
    await usuario.selectOptions(asesor, "");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(registro.cuerpo).toEqual({ asesor_asignado_id: null });
    });
  });

  it("RF-007 con el asesor de baja y sin tocarlo, el PATCH no lo manda", async () => {
    fichaConAsesor({ id: BAJA_ID, nombre: "Beatriz Baja" });
    const registro = capturarPatch();
    const usuario = await abrirEdicion(camila.id, "empleado");

    const asesor = await screen.findByLabelText(/asesor/i);
    await within(asesor).findByRole("option", { name: "Beatriz Baja (de baja)" });
    const nombre = screen.getByLabelText(/nombre/i);
    await usuario.clear(nombre);
    await usuario.type(nombre, "Camila B.");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(registro.cuerpo).toEqual({ nombre: "Camila B." });
    });
  });
});

describe("RF-007 guardar", () => {
  it("RF-007 guardar sin cambios no llama al servidor y cierra el formulario", async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion(camila.id, "admin");

    const asesor = await screen.findByLabelText(/asesor/i);
    await within(asesor).findByRole("option", { name: "Tomás Roldán" });
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.queryByLabelText(/nombre/i)).not.toBeInTheDocument();
    });
    expect(registro.cuerpo).toBeNull();
    expect(registro.ruta).toBe("");
  });

  it("RF-007 al guardar aparece un aviso role=status «Ficha actualizada»", async () => {
    capturarPatch();
    const usuario = await abrirEdicion();

    const nombre = await screen.findByLabelText(/nombre/i);
    await usuario.clear(nombre);
    await usuario.type(nombre, "Camila B.");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    const aviso = await screen.findByRole("status");
    expect(aviso).toHaveTextContent("Ficha actualizada");
  });
});

describe("RF-031 etiquetas en el formulario de edición", () => {
  const quitar = (etiqueta: string) =>
    screen.queryByRole("button", { name: new RegExp(`quitar.*${etiqueta}`, "i") });

  async function agregar(usuario: ReturnType<typeof userEvent.setup>, texto: string) {
    await usuario.type(await screen.findByLabelText(/nueva etiqueta/i), texto);
    await usuario.click(screen.getByRole("button", { name: /agregar etiqueta/i }));
  }

  it("RF-031 el formulario lista las etiquetas actuales, cada una con su botón para quitarla", async () => {
    await abrirEdicion();

    await screen.findByLabelText(/nombre/i);
    expect(quitar("Caribe")).toBeInTheDocument();
    expect(quitar("luna de miel")).toBeInTheDocument();
  });

  it("RF-031 agregar una etiqueta manda la lista completa nueva", async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion();

    await agregar(usuario, "aventura");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(registro.cuerpo).toEqual({ etiquetas: ["Caribe", "luna de miel", "aventura"] });
    });
  });

  it("RF-031 la etiqueta agregada se recorta y el campo queda vacío para la siguiente", async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion();

    await agregar(usuario, "  playa  ");
    expect(screen.getByLabelText(/nueva etiqueta/i)).toHaveValue("");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(registro.cuerpo).toEqual({ etiquetas: ["Caribe", "luna de miel", "playa"] });
    });
  });

  it("RF-031 quitar una etiqueta manda la lista completa sin ella", async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion();

    await screen.findByLabelText(/nombre/i);
    await usuario.click(quitar("Caribe") as HTMLElement);
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(registro.cuerpo).toEqual({ etiquetas: ["luna de miel"] });
    });
  });

  it("RF-031 quitar todas las etiquetas manda la lista vacía", async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion();

    await screen.findByLabelText(/nombre/i);
    await usuario.click(quitar("Caribe") as HTMLElement);
    await usuario.click(quitar("luna de miel") as HTMLElement);
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(registro.cuerpo).toEqual({ etiquetas: [] });
    });
  });

  it("RF-031 agregar y quitar la misma etiqueta no cambia nada: no hay PATCH", async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion();

    await agregar(usuario, "aventura");
    await usuario.click(quitar("aventura") as HTMLElement);
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.queryByLabelText(/nombre/i)).not.toBeInTheDocument();
    });
    expect(registro.cuerpo).toBeNull();
  });

  it("RF-031 no agrega una etiqueta repetida", async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion();

    await agregar(usuario, "Caribe");
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.queryByLabelText(/nombre/i)).not.toBeInTheDocument();
    });
    expect(registro.cuerpo).toBeNull();
  });

  it(`RF-031 no deja agregar más de ${String(MAX_ETIQUETAS)} etiquetas ni las manda`, async () => {
    const llenas = Array.from({ length: MAX_ETIQUETAS }, (_, i) => `etiqueta ${String(i + 1)}`);
    fichaConAsesor(null, { etiquetas: llenas });
    const registro = capturarPatch();
    const usuario = await abrirEdicion();

    await screen.findByLabelText(/nombre/i);
    await usuario.type(screen.getByLabelText(/nueva etiqueta/i), "una de más");
    await usuario.click(screen.getByRole("button", { name: /agregar etiqueta/i }));
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    expect(quitar("una de más")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByLabelText(/nombre/i)).not.toBeInTheDocument();
    });
    expect(registro.cuerpo).toBeNull();
  });

  it(`RF-031 no deja agregar una etiqueta de más de ${String(MAX_LARGO_ETIQUETA)} caracteres`, async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion();

    await agregar(usuario, "x".repeat(MAX_LARGO_ETIQUETA + 1));
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    expect(screen.queryByRole("button", { name: /quitar.*xxxx/i })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByLabelText(/nombre/i)).not.toBeInTheDocument();
    });
    expect(registro.cuerpo).toBeNull();
  });

  it(`RF-031 acepta una etiqueta de exactamente ${String(MAX_LARGO_ETIQUETA)} caracteres`, async () => {
    const registro = capturarPatch();
    const usuario = await abrirEdicion();
    const justa = "y".repeat(MAX_LARGO_ETIQUETA);

    await agregar(usuario, justa);
    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(registro.cuerpo).toEqual({ etiquetas: ["Caribe", "luna de miel", justa] });
    });
  });
});
