import { crearCliente } from "@rumbo/shared";
import {
  clientesMock,
  crearServidor,
  manejadoresClientes,
  usuariosPorRol,
  type RolMock,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes, useParams } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { NuevoCliente } from "./NuevoCliente";

const asesoresActivos = [
  { id: usuariosPorRol.admin.id, nombre: "Lucía Fernández" },
  { id: usuariosPorRol.empleado.id, nombre: "Ana Pérez" },
];
const manejadorAsesores = http.get("*/api/usuarios/asesores", () =>
  HttpResponse.json(asesoresActivos),
);

const servidor = crearServidor(manejadorAsesores, ...manejadoresClientes);
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

const sosa = clientesMock[1];
if (!sosa) throw new Error("faltan clientes mock");

const NUEVO_ID = "11111111-2222-4333-8444-555555555555";

const conflicto = (extra: object) =>
  HttpResponse.json(
    { title: "Conflicto", status: 409, ...extra },
    { status: 409, headers: { "content-type": "application/problem+json" } },
  );

function Ficha() {
  const { id } = useParams();
  return <p>{`Ficha del cliente ${id ?? ""}`}</p>;
}

function renderAlta(rol: RolMock = "empleado") {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/clientes/nuevo"]}>
        <Routes>
          <Route
            path="/clientes/nuevo"
            element={<NuevoCliente cliente={cliente} usuario={usuariosPorRol[rol]} />}
          />
          <Route path="/clientes/:id" element={<Ficha />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const campo = (nombre: RegExp) => screen.findByRole("textbox", { name: nombre });
const registrar = () => screen.getByRole("button", { name: /registrar cliente/i });

/** Registra los cuerpos que llegan al POST y responde 201 con un id fijo. */
function altaCapturada(cuerpos: Record<string, unknown>[]) {
  return http.post("*/api/clientes", async ({ request }) => {
    const cuerpo = (await request.json()) as Record<string, unknown>;
    cuerpos.push(cuerpo);
    return HttpResponse.json({ ...sosa, ...cuerpo, id: NUEVO_ID }, { status: 201 });
  });
}

/** Responde 409 hasta que llega `confirmar_duplicado`; entonces crea el cliente. */
function altaConAviso(cuerpos: Record<string, unknown>[], duplicados: unknown[], detail: string) {
  return http.post("*/api/clientes", async ({ request }) => {
    const cuerpo = (await request.json()) as Record<string, unknown>;
    cuerpos.push(cuerpo);
    if (!cuerpo["confirmar_duplicado"]) return conflicto({ detail, duplicados });
    return HttpResponse.json({ ...sosa, ...cuerpo, id: NUEVO_ID }, { status: 201 });
  });
}

async function completar(
  usuario: ReturnType<typeof userEvent.setup>,
  nombre: string,
  contacto: string,
) {
  await usuario.type(await campo(/^nombre/i), nombre);
  await usuario.type(await campo(/^contacto/i), contacto);
}

describe("RF-002 datos mínimos", () => {
  it("RF-002 muestra nombre, contacto, Instagram opcional y segmento", async () => {
    renderAlta();

    expect(await campo(/^nombre/i)).toBeInTheDocument();
    expect(await campo(/^contacto/i)).toBeInTheDocument();
    expect(await campo(/instagram \(opcional\)/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /segmento/i })).toBeInTheDocument();
  });

  it("RF-002 sin nombre no manda el alta y marca el campo", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderAlta();
    await usuario.type(await campo(/^contacto/i), "ana@mail.test");

    await usuario.click(registrar());

    expect(await screen.findByText("Ingresá el nombre.")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-002 sin contacto no manda el alta y marca el campo", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderAlta();
    await usuario.type(await campo(/^nombre/i), "Ana Gómez");

    await usuario.click(registrar());

    expect(await screen.findByText("Ingresá un teléfono o un email válido.")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-002 un contacto que no es teléfono ni email se rechaza", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderAlta();
    await completar(usuario, "Ana Gómez", "no-es-un-contacto");

    await usuario.click(registrar());

    expect(await screen.findByText("Ingresá un teléfono o un email válido.")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-002 el Instagram no cuenta como contacto mínimo", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderAlta();
    await usuario.type(await campo(/^nombre/i), "Ana Gómez");
    await usuario.type(await campo(/instagram \(opcional\)/i), "ana.gomez");

    await usuario.click(registrar());

    expect(await screen.findByText("Ingresá un teléfono o un email válido.")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-002 el Instagram es opcional: sin él el alta sale igual", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderAlta();
    await completar(usuario, "Ana Gómez", "ana@mail.test");

    await usuario.click(registrar());

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({ nombre: "Ana Gómez", contacto: "ana@mail.test" });
    expect(cuerpos[0]?.["instagram"] ?? null).toBeNull();
  });

  it("RF-002 manda el Instagram cuando se completa", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderAlta();
    await completar(usuario, "Ana Gómez", "ana@mail.test");
    await usuario.type(await campo(/instagram \(opcional\)/i), "ana.gomez");

    await usuario.click(registrar());

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["instagram"]).toBe("ana.gomez");
  });

  it("RF-002 un Instagram con formato inválido se rechaza", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderAlta();
    await completar(usuario, "Ana Gómez", "ana@mail.test");
    await usuario.type(await campo(/instagram \(opcional\)/i), "ana gomez!!");

    await usuario.click(registrar());

    expect(
      await screen.findByText("Usá letras, números, puntos o guiones bajos (hasta 30)."),
    ).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-002 tras el alta se abre la ficha del cliente nuevo", async () => {
    servidor.use(altaCapturada([]));
    const usuario = userEvent.setup();
    renderAlta();
    await completar(usuario, "Ana Gómez", "ana@mail.test");

    await usuario.click(registrar());

    expect(await screen.findByText(`Ficha del cliente ${NUEVO_ID}`)).toBeInTheDocument();
  });

  it("RF-002 muestra los errores 422 del servidor en su campo", async () => {
    servidor.use(
      http.post("*/api/clientes", () =>
        HttpResponse.json(
          {
            title: "Error de validación",
            status: 422,
            errores: [{ campo: "nombre", mensaje: "El nombre ya está en uso." }],
          },
          { status: 422, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    );
    const usuario = userEvent.setup();
    renderAlta();
    await completar(usuario, "Ana Gómez", "ana@mail.test");

    await usuario.click(registrar());

    expect(await screen.findByText("El nombre ya está en uso.")).toBeInTheDocument();
    expect(screen.queryByText(/^Ficha del cliente/)).not.toBeInTheDocument();
  });

  it("RF-002 muestra el 422 del asesor asignado en su campo", async () => {
    servidor.use(
      http.post("*/api/clientes", () =>
        HttpResponse.json(
          {
            title: "Error de validación",
            status: 422,
            errores: [{ campo: "asesor_asignado_id", mensaje: "El asesor está dado de baja." }],
          },
          { status: 422, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    );
    const usuario = userEvent.setup();
    renderAlta();
    await completar(usuario, "Ana Gómez", "ana@mail.test");

    await usuario.click(registrar());

    expect(await screen.findByText("El asesor está dado de baja.")).toBeInTheDocument();
  });

  it.each(["admin", "dueno", "empleado"] as RolMock[])(
    "RF-002 %s ve el selector de asesor y manda el elegido",
    async (rol) => {
      const cuerpos: Record<string, unknown>[] = [];
      servidor.use(altaCapturada(cuerpos));
      const usuario = userEvent.setup();
      renderAlta(rol);
      await completar(usuario, "Ana Gómez", "ana@mail.test");
      const selector = await screen.findByRole("combobox", { name: /asesor asignado/i });
      await screen.findByRole("option", { name: "Ana Pérez" });

      await usuario.selectOptions(selector, "Ana Pérez");
      await usuario.click(registrar());

      await waitFor(() => {
        expect(cuerpos).toHaveLength(1);
      });
      expect(cuerpos[0]?.["asesor_asignado_id"]).toBe(usuariosPorRol.empleado.id);
    },
  );

  it("RF-002 el freelance no ve el selector de asesor y no manda asesor_asignado_id", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderAlta("freelance");
    await completar(usuario, "Ana Gómez", "ana@mail.test");

    expect(screen.queryByRole("combobox", { name: /asesor asignado/i })).not.toBeInTheDocument();
    await usuario.click(registrar());

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["asesor_asignado_id"] ?? null).toBeNull();
  });
});

describe("RF-003 posible duplicado", () => {
  async function altaDuplicada(rol: RolMock = "empleado") {
    const usuario = userEvent.setup();
    renderAlta(rol);
    await completar(usuario, "Familia Sosa Nueva", sosa?.contacto ?? "");
    await usuario.click(registrar());
    return usuario;
  }

  it("RF-003 si el servidor avisa un duplicado, lista los candidatos con nombre y contacto", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaConAviso(cuerpos, [sosa], "Ya existe un cliente con ese contacto."));
    await altaDuplicada();

    expect(await screen.findByRole("alert")).toHaveTextContent(/duplicado|ya existe/i);
    expect(screen.getByText("Familia Sosa")).toBeInTheDocument();
    expect(screen.getAllByText("sosa.familia@mail.test").length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Ficha del cliente/)).not.toBeInTheDocument();
    expect(cuerpos).toHaveLength(1);
  });

  it("RF-003 «Ir al cliente existente» abre la ficha del candidato sin crear otro", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaConAviso(cuerpos, [sosa], "Ya existe un cliente con ese contacto."));
    const usuario = await altaDuplicada();

    await usuario.click(await screen.findByRole("link", { name: /ir al cliente existente/i }));

    expect(await screen.findByText(`Ficha del cliente ${sosa.id}`)).toBeInTheDocument();
    expect(cuerpos).toHaveLength(1);
  });

  it("RF-003 «Confirmar alta» reenvía el alta con confirmar_duplicado y abre la ficha nueva", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaConAviso(cuerpos, [sosa], "Ya existe un cliente con ese contacto."));
    const usuario = await altaDuplicada();

    await usuario.click(await screen.findByRole("button", { name: /confirmar alta/i }));

    expect(await screen.findByText(`Ficha del cliente ${NUEVO_ID}`)).toBeInTheDocument();
    expect(cuerpos).toHaveLength(2);
    expect(cuerpos[0]?.["confirmar_duplicado"] ?? false).toBe(false);
    expect(cuerpos[1]).toMatchObject({
      nombre: "Familia Sosa Nueva",
      contacto: sosa.contacto,
      confirmar_duplicado: true,
    });
  });

  it("RF-003 el freelance, sin candidatos, ve el aviso de cliente ajeno y puede confirmar", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaConAviso(cuerpos, [], "Ya hay un cliente con ese contacto en la agencia."));
    const usuario = await altaDuplicada("freelance");

    expect(
      await screen.findByText(
        "Ya hay un cliente con ese contacto en la agencia. Consultalo con un admin",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /ir al cliente existente/i }),
    ).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: /confirmar alta/i }));

    expect(await screen.findByText(`Ficha del cliente ${NUEVO_ID}`)).toBeInTheDocument();
    expect(cuerpos[1]?.["confirmar_duplicado"]).toBe(true);
    expect(cuerpos[1]?.["asesor_asignado_id"] ?? null).toBeNull();
  });

  it("RF-003 con candidatos no se muestra el aviso del freelance", async () => {
    servidor.use(altaConAviso([], [sosa], "Ya existe un cliente con ese contacto."));
    await altaDuplicada("admin");

    await screen.findByText("Familia Sosa");
    expect(screen.queryByText(/consultalo con un admin/i)).not.toBeInTheDocument();
  });

  it("RF-003 editar el contacto tras el aviso oculta el aviso y el botón «Confirmar alta»", async () => {
    servidor.use(altaConAviso([], [sosa], "Ya existe un cliente con ese contacto."));
    const usuario = await altaDuplicada();
    await screen.findByRole("button", { name: /confirmar alta/i });

    await usuario.type(await campo(/^contacto/i), "x");

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /confirmar alta/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Familia Sosa")).not.toBeInTheDocument();
  });

  it("RF-003 editar el nombre tras el aviso también oculta el aviso", async () => {
    servidor.use(altaConAviso([], [sosa], "Ya existe un cliente con ese contacto."));
    const usuario = await altaDuplicada();
    await screen.findByRole("button", { name: /confirmar alta/i });

    await usuario.type(await campo(/^nombre/i), "!");

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /confirmar alta/i })).not.toBeInTheDocument();
    });
  });

  it("RF-003 editar el Instagram tras el aviso también oculta el aviso", async () => {
    servidor.use(altaConAviso([], [sosa], "Ya existe un cliente con ese contacto."));
    const usuario = await altaDuplicada();
    await screen.findByRole("button", { name: /confirmar alta/i });

    await usuario.type(await campo(/instagram \(opcional\)/i), "sosa.nueva");

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /confirmar alta/i })).not.toBeInTheDocument();
    });
  });

  it("RF-003 cambiar el asesor tras el aviso también oculta el aviso", async () => {
    servidor.use(altaConAviso([], [sosa], "Ya existe un cliente con ese contacto."));
    const usuario = await altaDuplicada();
    await screen.findByRole("button", { name: /confirmar alta/i });
    await screen.findByRole("option", { name: "Lucía Fernández" });

    await usuario.selectOptions(
      screen.getByRole("combobox", { name: /asesor asignado/i }),
      "Lucía Fernández",
    );

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /confirmar alta/i })).not.toBeInTheDocument();
    });
  });

  it("RF-003 tras editar, volver a «Registrar cliente» hace un POST nuevo sin confirmar_duplicado", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaConAviso(cuerpos, [sosa], "Ya existe un cliente con ese contacto."));
    const usuario = await altaDuplicada();
    await screen.findByRole("button", { name: /confirmar alta/i });

    const contacto = await campo(/^contacto/i);
    await usuario.clear(contacto);
    await usuario.type(contacto, "otro@mail.test");
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /confirmar alta/i })).not.toBeInTheDocument();
    });
    await usuario.click(registrar());

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(2);
    expect(cuerpos[1]).toMatchObject({ contacto: "otro@mail.test" });
    expect(cuerpos[1]?.["confirmar_duplicado"] ?? false).toBe(false);
  });

  it("RF-003 editar el segmento tras el aviso también oculta el aviso", async () => {
    servidor.use(altaConAviso([], [sosa], "Ya existe un cliente con ese contacto."));
    const usuario = await altaDuplicada();
    await screen.findByRole("button", { name: /confirmar alta/i });

    await usuario.selectOptions(screen.getByRole("combobox", { name: /segmento/i }), "familia");

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /confirmar alta/i })).not.toBeInTheDocument();
    });
  });

  it("RF-003 si se edita mientras el alta está en vuelo, el 409 tardío no muestra el aviso", async () => {
    let soltar = () => {};
    const respuestaTardia = new Promise<void>((resolver) => {
      soltar = resolver;
    });
    let respondido = false;
    servidor.use(
      http.post("*/api/clientes", async () => {
        await respuestaTardia;
        respondido = true;
        return conflicto({ detail: "Ya existe un cliente con ese contacto.", duplicados: [sosa] });
      }),
    );
    const usuario = await altaDuplicada();

    await usuario.type(await campo(/^contacto/i), "x");
    soltar();

    await waitFor(() => {
      expect(respondido).toBe(true);
    });
    await new Promise((resolver) => setTimeout(resolver, 50));
    expect(screen.queryByRole("button", { name: /confirmar alta/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Familia Sosa")).not.toBeInTheDocument();
  });
});
