import { crearCliente } from "@rumbo/shared";
import {
  clientesMock,
  crearServidor,
  idOportunidadMock,
  manejadoresClientes,
  manejadoresOportunidades,
  oportunidadesMock,
  usuariosPorRol,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes, useParams } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { NuevaConsulta } from "./NuevaConsulta";

const servidor = crearServidor(...manejadoresClientes, ...manejadoresOportunidades);
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

const camila = clientesMock[0]; // tiene una oportunidad abierta (Cusco, nueva)
const sosa = clientesMock[1];
if (!camila || !sosa) throw new Error("faltan clientes mock");
const NUEVA_ID = "99999999-2222-4333-8444-555555555555";
const CLIENTE_NUEVO_ID = "77777777-2222-4333-8444-555555555555";

/** Todas las oportunidades del cliente (abiertas, ganadas y perdidas): la pantalla filtra las abiertas. */
const oportunidadesDe = (clienteId: string) =>
  http.get("*/api/oportunidades", ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get("cliente_id") !== clienteId) return undefined;
    const items = oportunidadesMock.filter((o) => o.cliente_id === clienteId);
    return HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 20 });
  });

/** El cliente solo tiene oportunidades cerradas. */
const soloCerradas = (clienteId: string) =>
  http.get("*/api/oportunidades", ({ request }) => {
    if (new URL(request.url).searchParams.get("cliente_id") !== clienteId) return undefined;
    const items = oportunidadesMock.filter(
      (o) => o.cliente_id === clienteId && (o.estado === "ganada" || o.estado === "perdida"),
    );
    return HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 20 });
  });

const sinOportunidades = http.get("*/api/oportunidades", () =>
  HttpResponse.json({ items: [], total: 0, pagina: 1, por_pagina: 20 }),
);

function Detalle() {
  const { id } = useParams();
  return <p>{`Detalle de la oportunidad ${id ?? ""}`}</p>;
}

function renderConsulta() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/oportunidades/nueva"]}>
        <Routes>
          <Route
            path="/oportunidades/nueva"
            element={<NuevaConsulta cliente={cliente} usuario={usuariosPorRol.empleado} />}
          />
          <Route path="/oportunidades/:id" element={<Detalle />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Registra los cuerpos del POST y responde 201. */
function altaCapturada(cuerpos: Record<string, unknown>[]) {
  return http.post("*/api/oportunidades", async ({ request }) => {
    const cuerpo = (await request.json()) as Record<string, unknown>;
    cuerpos.push(cuerpo);
    const base = oportunidadesMock[0];
    return HttpResponse.json(
      { ...base, ...cuerpo, id: NUEVA_ID, estado: "nueva" },
      { status: 201 },
    );
  });
}

type Usuario = ReturnType<typeof userEvent.setup>;

const registrar = () => screen.getByRole("button", { name: /registrar consulta/i });

/** Busca un cliente por texto y lo elige de los resultados. */
async function elegirCliente(usuario: Usuario, buscar: string, nombre: string) {
  await usuario.type(await screen.findByRole("searchbox", { name: /buscar cliente/i }), buscar);
  await usuario.click(await screen.findByRole("button", { name: new RegExp(nombre, "i") }));
}

async function completarConsulta(usuario: Usuario) {
  await usuario.selectOptions(screen.getByRole("combobox", { name: /canal/i }), "whatsapp");
  await usuario.type(screen.getByRole("textbox", { name: /destino/i }), "Bariloche");
  await usuario.clear(screen.getByRole("spinbutton", { name: /pasajeros/i }));
  await usuario.type(screen.getByRole("spinbutton", { name: /pasajeros/i }), "3");
}

describe("RF-010 registrar consulta", () => {
  it("RF-010 muestra buscador de cliente, canal, destino, fechas, pasajeros y notas", async () => {
    renderConsulta();

    expect(await screen.findByRole("searchbox", { name: /buscar cliente/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /canal/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /destino/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha desde/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha hasta/i)).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /pasajeros/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /notas/i })).toBeInTheDocument();
  });

  it("RF-010 el buscador pide al servidor los clientes que coinciden y los lista", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(
      http.get("*/api/clientes", ({ request }) => {
        pedidos.push(new URL(request.url).searchParams);
        return undefined;
      }),
    );
    const usuario = userEvent.setup();
    renderConsulta();

    await usuario.type(await screen.findByRole("searchbox", { name: /buscar cliente/i }), "sosa");

    expect(await screen.findByRole("button", { name: /familia sosa/i })).toBeInTheDocument();
    expect(pedidos.some((p) => p.get("buscar") === "sosa")).toBe(true);
    expect(screen.queryByRole("button", { name: /camila benítez/i })).not.toBeInTheDocument();
  });

  it("RF-010 registra la consulta con los datos cargados y abre la oportunidad nueva", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(sinOportunidades, altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderConsulta();
    await elegirCliente(usuario, "sosa", "familia sosa");
    await completarConsulta(usuario);
    await usuario.type(screen.getByLabelText(/fecha desde/i), "2027-02-01");
    await usuario.type(screen.getByLabelText(/fecha hasta/i), "2027-02-10");
    await usuario.type(screen.getByRole("textbox", { name: /notas/i }), "Prefiere hotel céntrico");

    await usuario.click(registrar());

    expect(await screen.findByText(`Detalle de la oportunidad ${NUEVA_ID}`)).toBeInTheDocument();
    expect(cuerpos).toHaveLength(1);
    expect(cuerpos[0]).toMatchObject({
      cliente_id: sosa.id,
      canal: "whatsapp",
      destino_consultado: "Bariloche",
      pasajeros: 3,
      fecha_desde_tentativa: "2027-02-01",
      fecha_hasta_tentativa: "2027-02-10",
      notas: "Prefiere hotel céntrico",
    });
  });

  it("RF-010 las fechas y las notas son opcionales y no viajan vacías", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(sinOportunidades, altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderConsulta();
    await elegirCliente(usuario, "sosa", "familia sosa");
    await completarConsulta(usuario);

    await usuario.click(registrar());

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["fecha_desde_tentativa"] ?? null).toBeNull();
    expect(cuerpos[0]?.["fecha_hasta_tentativa"] ?? null).toBeNull();
    expect(cuerpos[0]?.["notas"] ?? null).toBeNull();
  });

  it("RF-010 una fecha hasta anterior a la fecha desde no manda la consulta", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(sinOportunidades, altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderConsulta();
    await elegirCliente(usuario, "sosa", "familia sosa");
    await completarConsulta(usuario);
    await usuario.type(screen.getByLabelText(/fecha desde/i), "2027-02-10");
    await usuario.type(screen.getByLabelText(/fecha hasta/i), "2027-02-01");

    await usuario.click(registrar());

    expect(
      await screen.findByText("La fecha hasta no puede ser anterior a la fecha desde."),
    ).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-010 muestra los errores 422 del servidor en su campo", async () => {
    servidor.use(
      sinOportunidades,
      http.post("*/api/oportunidades", () =>
        HttpResponse.json(
          {
            title: "Error de validación",
            status: 422,
            errores: [{ campo: "destino_consultado", mensaje: "El destino es demasiado largo." }],
          },
          { status: 422, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    );
    const usuario = userEvent.setup();
    renderConsulta();
    await elegirCliente(usuario, "sosa", "familia sosa");
    await completarConsulta(usuario);

    await usuario.click(registrar());

    expect(await screen.findByText("El destino es demasiado largo.")).toBeInTheDocument();
    expect(screen.queryByText(/^Detalle de la oportunidad/)).not.toBeInTheDocument();
  });
});

describe("RF-004 alta rápida de cliente (A1)", () => {
  const abrirAltaRapida = async (usuario: Usuario) => {
    await usuario.click(
      await screen.findByRole("button", { name: /cliente nuevo|crear cliente nuevo/i }),
    );
  };
  const guardarCliente = () => screen.getByRole("button", { name: /guardar cliente/i });

  it("RF-004 permite dar de alta al cliente en el momento y lo deja elegido para la consulta", async () => {
    const clientes: Record<string, unknown>[] = [];
    const consultas: Record<string, unknown>[] = [];
    servidor.use(
      sinOportunidades,
      altaCapturada(consultas),
      http.post("*/api/clientes", async ({ request }) => {
        const cuerpo = (await request.json()) as Record<string, unknown>;
        clientes.push(cuerpo);
        return HttpResponse.json({ ...sosa, ...cuerpo, id: CLIENTE_NUEVO_ID }, { status: 201 });
      }),
    );
    const usuario = userEvent.setup();
    renderConsulta();
    await abrirAltaRapida(usuario);
    await usuario.type(await screen.findByRole("textbox", { name: /^nombre/i }), "Marta Ruiz");
    await usuario.type(screen.getByRole("textbox", { name: /^contacto/i }), "marta@mail.test");

    await usuario.click(guardarCliente());

    await waitFor(() => {
      expect(clientes).toHaveLength(1);
    });
    expect(clientes[0]).toMatchObject({ nombre: "Marta Ruiz", contacto: "marta@mail.test" });
    expect(await screen.findByText("Marta Ruiz")).toBeInTheDocument();
    await completarConsulta(usuario);
    await usuario.click(registrar());
    await waitFor(() => {
      expect(consultas).toHaveLength(1);
    });
    expect(consultas[0]?.["cliente_id"]).toBe(CLIENTE_NUEVO_ID);
  });

  it("RF-004 el alta rápida pide nombre y un contacto válido", async () => {
    const clientes: unknown[] = [];
    servidor.use(
      http.post("*/api/clientes", async ({ request }) => {
        clientes.push(await request.json());
        return HttpResponse.json({ ...sosa, id: CLIENTE_NUEVO_ID }, { status: 201 });
      }),
    );
    const usuario = userEvent.setup();
    renderConsulta();
    await abrirAltaRapida(usuario);
    await screen.findByRole("textbox", { name: /^nombre/i });

    await usuario.click(guardarCliente());

    expect(await screen.findByText("Ingresá el nombre.")).toBeInTheDocument();
    expect(screen.getByText("Ingresá un teléfono o un email válido.")).toBeInTheDocument();
    expect(clientes).toHaveLength(0);
  });

  it("RF-004 si el servidor avisa un posible duplicado, ofrece usar el existente o confirmar", async () => {
    servidor.use(
      http.post("*/api/clientes", async ({ request }) => {
        const cuerpo = (await request.json()) as Record<string, unknown>;
        if (!cuerpo["confirmar_duplicado"]) {
          return HttpResponse.json(
            {
              title: "Conflicto",
              status: 409,
              detail: "Ya existe un cliente con ese contacto.",
              duplicados: [sosa],
            },
            { status: 409, headers: { "content-type": "application/problem+json" } },
          );
        }
        return HttpResponse.json({ ...sosa, ...cuerpo, id: CLIENTE_NUEVO_ID }, { status: 201 });
      }),
    );
    const usuario = userEvent.setup();
    renderConsulta();
    await abrirAltaRapida(usuario);
    await usuario.type(
      await screen.findByRole("textbox", { name: /^nombre/i }),
      "Familia Sosa Nueva",
    );
    await usuario.type(screen.getByRole("textbox", { name: /^contacto/i }), sosa.contacto);

    await usuario.click(guardarCliente());

    expect(await screen.findByRole("alert")).toHaveTextContent(/duplicado|ya existe/i);
    expect(screen.getByText("Familia Sosa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar alta/i })).toBeInTheDocument();
  });
});

describe("RF-012 oportunidad abierta", () => {
  it("RF-012 al elegir un cliente con oportunidad abierta avisa y la lista", async () => {
    servidor.use(oportunidadesDe(camila.id));
    const usuario = userEvent.setup();
    renderConsulta();

    await elegirCliente(usuario, "camila", "camila benítez");

    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent(/oportunidad abierta/i);
    expect(aviso).toHaveTextContent("Cusco");
    // La perdida (Miami) y la ganada (Punta Cana) no cuentan como abiertas.
    expect(aviso).not.toHaveTextContent("Miami");
    expect(aviso).not.toHaveTextContent("Punta Cana");
  });

  it("RF-012 «Ir a la oportunidad» abre la oportunidad abierta sin crear otra", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(oportunidadesDe(camila.id), altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderConsulta();
    await elegirCliente(usuario, "camila", "camila benítez");

    await usuario.click(await screen.findByRole("link", { name: /ir a la oportunidad/i }));

    expect(
      await screen.findByText(`Detalle de la oportunidad ${idOportunidadMock.nueva}`),
    ).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-012 mientras el aviso no se confirma, la consulta no se registra", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(oportunidadesDe(camila.id), altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderConsulta();
    await elegirCliente(usuario, "camila", "camila benítez");
    await screen.findByRole("alert");
    await completarConsulta(usuario);

    await usuario.click(registrar());

    expect(cuerpos).toHaveLength(0);
    expect(screen.queryByText(/^Detalle de la oportunidad/)).not.toBeInTheDocument();
  });

  it("RF-012 «Registrar igual» confirma el aviso y crea la consulta nueva", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(oportunidadesDe(camila.id), altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderConsulta();
    await elegirCliente(usuario, "camila", "camila benítez");
    await screen.findByRole("alert");
    await completarConsulta(usuario);

    await usuario.click(screen.getByRole("button", { name: /registrar igual/i }));

    expect(await screen.findByText(`Detalle de la oportunidad ${NUEVA_ID}`)).toBeInTheDocument();
    expect(cuerpos).toHaveLength(1);
    expect(cuerpos[0]).toMatchObject({ cliente_id: camila.id, destino_consultado: "Bariloche" });
  });

  it("RF-012 un cliente con oportunidades solo cerradas no muestra el aviso", async () => {
    servidor.use(soloCerradas(camila.id));
    const usuario = userEvent.setup();
    renderConsulta();

    await elegirCliente(usuario, "camila", "camila benítez");

    await screen.findByRole("textbox", { name: /destino/i });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("RF-012 cambiar de cliente descarta el aviso del anterior", async () => {
    servidor.use(oportunidadesDe(camila.id), sinOportunidades);
    const usuario = userEvent.setup();
    renderConsulta();
    await elegirCliente(usuario, "camila", "camila benítez");
    await screen.findByRole("alert");

    await usuario.click(screen.getByRole("button", { name: /cambiar cliente/i }));
    await elegirCliente(usuario, "sosa", "familia sosa");

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});

describe("RF-013 datos mínimos (A3)", () => {
  it("RF-013 sin cliente no manda la consulta y marca el campo", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderConsulta();
    await usuario.selectOptions(
      await screen.findByRole("combobox", { name: /canal/i }),
      "presencial",
    );
    await usuario.type(screen.getByRole("textbox", { name: /destino/i }), "Salta");

    await usuario.click(registrar());

    expect(await screen.findByText("Elegí un cliente.")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-013 sin canal no manda la consulta y marca el campo", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(sinOportunidades, altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderConsulta();
    await elegirCliente(usuario, "sosa", "familia sosa");
    await usuario.type(screen.getByRole("textbox", { name: /destino/i }), "Salta");

    await usuario.click(registrar());

    expect(await screen.findByText("Elegí el canal.")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-013 sin destino no manda la consulta y marca el campo", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(sinOportunidades, altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderConsulta();
    await elegirCliente(usuario, "sosa", "familia sosa");
    await usuario.selectOptions(screen.getByRole("combobox", { name: /canal/i }), "instagram");

    await usuario.click(registrar());

    expect(await screen.findByText("Ingresá el destino.")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-013 los pasajeros tienen que ser al menos uno", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(sinOportunidades, altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderConsulta();
    await elegirCliente(usuario, "sosa", "familia sosa");
    await completarConsulta(usuario);
    await usuario.clear(screen.getByRole("spinbutton", { name: /pasajeros/i }));
    await usuario.type(screen.getByRole("spinbutton", { name: /pasajeros/i }), "0");

    await usuario.click(registrar());

    expect(await screen.findByText("Ingresá al menos un pasajero.")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });
});
