import {
  crearCliente,
  DESTINO_A_DEFINIR,
  type EstadoOportunidad,
  type UsuarioActual,
} from "@rumbo/shared";
import {
  alertasMock,
  crearServidor,
  idOportunidadMock,
  manejadoresAlertas,
  manejadoresOportunidades,
  oportunidadesMock,
  usuariosPorRol,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { DetalleOportunidad } from "./DetalleOportunidad";

const servidor = crearServidor(...manejadoresOportunidades, ...manejadoresAlertas);
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
// El «hoy» de los mocks (25/10/26, hora argentina), para fijar la fecha de las interacciones.
const HOY = new Date("2026-10-25T12:00:00-03:00");
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: HOY });
});
afterEach(() => {
  servidor.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => {
  servidor.close();
});

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });

function renderDetalle(id: string, usuarioActual: UsuarioActual = usuariosPorRol.empleado) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/oportunidades/${id}`]}>
        <Routes>
          <Route
            path="/oportunidades/:id"
            element={<DetalleOportunidad cliente={cliente} usuario={usuarioActual} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const problema = (status: number, detail: string) =>
  HttpResponse.json(
    { type: "about:blank", title: "Error", status, detail },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );

const porId = (id: string) => {
  const o = oportunidadesMock.find((x) => x.id === id);
  if (!o) throw new Error("Falta la oportunidad en el mock");
  return o;
};

/** Registra los cuerpos JSON de un POST/PATCH y deja seguir con el handler del mock. */
function registrar(metodo: "post" | "patch", ruta: string, cuerpos: Record<string, unknown>[]) {
  return http[metodo](ruta, async ({ request }) => {
    cuerpos.push(
      (await request
        .clone()
        .json()
        .catch(() => ({}))) as Record<string, unknown>,
    );
    return undefined;
  });
}

/** El GET del detalle cambia de estado cuando responde el POST de la transición: simula el refetch tras invalidar. */
function detalleQueCambiaA(id: string, estado: EstadoOportunidad) {
  let cambio = false;
  return [
    http.get(`*/api/oportunidades/${id}`, () =>
      HttpResponse.json({ ...porId(id), estado: cambio ? estado : porId(id).estado }),
    ),
    http.post(`*/api/oportunidades/${id}/*`, () => {
      cambio = true;
      return HttpResponse.json({ ...porId(id), estado });
    }),
  ];
}

const abierta = idOportunidadMock.en_gestion;

describe("RF-014 interacciones: contexto y línea de tiempo", () => {
  it("RF-014 muestra el destino, el cliente, los pasajeros y el estado de la oportunidad", async () => {
    renderDetalle(idOportunidadMock.en_gestion);

    expect(await screen.findByRole("heading", { name: /mendoza/i })).toBeInTheDocument();
    expect(screen.getByText("Familia Sosa")).toBeInTheDocument();
    expect(screen.getByText(/4 pasajeros/)).toBeInTheDocument();
    expect(screen.getByText(/en gestión/i)).toBeInTheDocument();
  });

  it("RF-014 la línea de tiempo muestra las notas de seguimiento de la oportunidad", async () => {
    renderDetalle(idOportunidadMock.en_gestion);

    expect(
      await screen.findByText("Familia con dos chicos; pide opciones con bodegas."),
    ).toBeInTheDocument();
  });

  it("RF-014 si la oportunidad no existe lo avisa", async () => {
    servidor.use(http.get("*/api/oportunidades/:id", () => problema(404, "No existe.")));
    renderDetalle(abierta);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no existe|no la podés ver|no pudimos/i,
    );
  });
});

const ENTRADA_PREVIA = "Familia con dos chicos; pide opciones con bodegas.";

describe("RF-014 interacciones: registrar", () => {
  it("RF-014 agrega la interacción al final de las notas con fecha y nombre del usuario", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("patch", `*/api/oportunidades/${abierta}`, cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await screen.findByRole("heading", { name: /mendoza/i });

    await usuario.type(
      screen.getByRole("textbox", { name: /interacción/i }),
      "Llamé y pidió cotizar con bodegas",
    );
    await usuario.click(screen.getByRole("button", { name: /registrar interacción/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["notas"]).toBe(
      `${ENTRADA_PREVIA}\n25/10/26 — Ana Pérez: Llamé y pidió cotizar con bodegas`,
    );
  });

  it("RF-014 sin notas previas, las notas son solo la entrada nueva", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(
      http.get(`*/api/oportunidades/${abierta}`, () =>
        HttpResponse.json({ ...porId(abierta), notas: null }),
      ),
      registrar("patch", `*/api/oportunidades/${abierta}`, cuerpos),
    );
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await screen.findByRole("heading", { name: /mendoza/i });

    await usuario.type(screen.getByRole("textbox", { name: /interacción/i }), "Primer contacto");
    await usuario.click(screen.getByRole("button", { name: /registrar interacción/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["notas"]).toBe("25/10/26 — Ana Pérez: Primer contacto");
  });

  it("RF-014 no registra una interacción vacía", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("patch", `*/api/oportunidades/${abierta}`, cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await screen.findByRole("heading", { name: /mendoza/i });

    await usuario.click(screen.getByRole("button", { name: /registrar interacción/i }));

    expect(await screen.findByText(/escribí|obligatori|requerid/i)).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-014 tras registrar, la entrada nueva aparece como ítem aparte en la línea de tiempo", async () => {
    let notas = porId(abierta).notas;
    servidor.use(
      http.get(`*/api/oportunidades/${abierta}`, () =>
        HttpResponse.json({ ...porId(abierta), notas }),
      ),
      http.patch(`*/api/oportunidades/${abierta}`, async ({ request }) => {
        notas = ((await request.json()) as { notas: string }).notas;
        return HttpResponse.json({ ...porId(abierta), notas });
      }),
    );
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await screen.findByText(ENTRADA_PREVIA);

    await usuario.type(screen.getByRole("textbox", { name: /interacción/i }), "Mandé el programa");
    await usuario.click(screen.getByRole("button", { name: /registrar interacción/i }));

    const nueva = await screen.findByText(/Mandé el programa/);
    expect(nueva.closest("li")).toHaveTextContent("25/10/26 — Ana Pérez: Mandé el programa");
    expect(screen.getByText(ENTRADA_PREVIA).closest("li")).not.toBe(nueva.closest("li"));
  });
});

describe("RF-014 interacciones: línea de tiempo de las notas", () => {
  it("RF-014 cada línea de las notas es un ítem separado", async () => {
    servidor.use(
      http.get(`*/api/oportunidades/${abierta}`, () =>
        HttpResponse.json({
          ...porId(abierta),
          notas: "20/10/26 — Ana Pérez: Primera llamada\n22/10/26 — Tomás Roldán: Mandé opciones",
        }),
      ),
    );
    renderDetalle(abierta);

    const primera = await screen.findByText(/Primera llamada/);
    const segunda = screen.getByText(/Mandé opciones/);
    expect(primera.closest("li")).not.toBe(segunda.closest("li"));
    expect(primera.closest("li")).toHaveTextContent("20/10/26 — Ana Pérez: Primera llamada");
    expect(segunda.closest("li")).toHaveTextContent("22/10/26 — Tomás Roldán: Mandé opciones");
  });
});

describe("RF-015 línea de tiempo: insistencias de la oportunidad", () => {
  const base = alertasMock[0];
  if (!base) throw new Error("Falta una alerta en el mock");
  const insistencia = (parcial: Partial<typeof base>) => ({
    ...base,
    tipo: "insistencia" as const,
    oportunidad_id: abierta,
    ...parcial,
  });

  it("RF-015 pide las alertas de insistencia de esa oportunidad", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(
      http.get("*/api/alertas", ({ request }) => {
        pedidos.push(new URL(request.url).searchParams);
        return HttpResponse.json({ items: [], total: 0, pagina: 1, por_pagina: 20 });
      }),
    );
    renderDetalle(abierta);
    await screen.findByRole("heading", { name: /mendoza/i });

    await waitFor(() => {
      expect(pedidos.length).toBeGreaterThan(0);
    });
    expect(
      pedidos.every((p) => p.get("oportunidad_id") === abierta && p.get("tipo") === "insistencia"),
    ).toBe(true);
  });

  it("RF-015 muestra cada insistencia con su fecha y descripción, y si sigue pendiente o ya se atendió", async () => {
    const pendiente = insistencia({
      id: "11111111-1111-4111-8111-111111111111",
      fecha: "2026-10-30",
      descripcion: "Llamar por el presupuesto",
      estado: "pendiente",
    });
    const atendida = insistencia({
      id: "22222222-2222-4222-8222-222222222222",
      fecha: "2026-10-20",
      descripcion: "Primer intento de contacto",
      estado: "resuelta",
    });
    servidor.use(
      // Contrato de `GET /alertas` con `oportunidad_id`: todas las del estado pedido, futuras incluidas.
      http.get("*/api/alertas", ({ request }) => {
        const buscado = new URL(request.url).searchParams.get("estado");
        const items = [pendiente, atendida].filter((a) => a.estado === buscado);
        return HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 20 });
      }),
    );
    renderDetalle(abierta);

    const filaPendiente = (await screen.findByText(/Llamar por el presupuesto/)).closest("li");
    expect(filaPendiente).toHaveTextContent("30/10/26");
    expect(filaPendiente).toHaveTextContent(/pendiente/i);
    const filaAtendida = (await screen.findByText(/Primer intento de contacto/)).closest("li");
    expect(filaAtendida).toHaveTextContent("20/10/26");
    expect(filaAtendida).toHaveTextContent(/atendida|resuelta/i);
  });
});

describe("RF-015 insistencias", () => {
  it("RF-015 agenda una insistencia con fecha y descripción", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("post", `*/api/oportunidades/${abierta}/insistencias`, cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await screen.findByRole("heading", { name: /mendoza/i });

    await usuario.click(screen.getByRole("button", { name: /agendar insistencia/i }));
    await usuario.type(screen.getByLabelText(/fecha/i), "2026-11-05");
    await usuario.type(screen.getByLabelText(/descripción/i), "Volver a llamar por el presupuesto");
    await usuario.click(screen.getByRole("button", { name: /guardar|agendar$/i }));

    await waitFor(() => {
      expect(cuerpos).toEqual([
        { fecha: "2026-11-05", descripcion: "Volver a llamar por el presupuesto" },
      ]);
    });
    expect(await screen.findByText(/insistencia agendada/i)).toBeInTheDocument();
  });

  it("RF-015 no agenda sin descripción ni fecha", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("post", `*/api/oportunidades/${abierta}/insistencias`, cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await screen.findByRole("heading", { name: /mendoza/i });

    await usuario.click(screen.getByRole("button", { name: /agendar insistencia/i }));
    await usuario.click(screen.getByRole("button", { name: /guardar|agendar$/i }));

    expect(
      (await screen.findAllByText(/obligatori|requerid|ingresá|elegí/i)).length,
    ).toBeGreaterThan(0);
    expect(cuerpos).toHaveLength(0);
  });

  it.each<EstadoOportunidad>(["ganada", "perdida"])(
    "RF-015 no se agenda insistencia en una oportunidad %s",
    async (estado) => {
      renderDetalle(idOportunidadMock[estado]);
      await screen.findByRole("heading", { level: 1 });

      expect(
        screen.queryByRole("button", { name: /agendar insistencia/i }),
      ).not.toBeInTheDocument();
    },
  );
});

describe("RF-016 y RF-017 acciones de estado según EST-Oportunidad", () => {
  const botones = {
    enGestion: /pasar a en gestión/i,
    ganar: /^ganar/i,
    perder: /^perder/i,
    reactivar: /^reactivar/i,
  };
  // [estado, enGestion, ganar, perder, reactivar]
  it.each<[EstadoOportunidad, boolean, boolean, boolean, boolean]>([
    ["nueva", true, true, true, false],
    ["en_gestion", false, true, true, false],
    ["cotizada", false, true, true, false],
    ["ganada", false, false, false, false],
    ["perdida", false, false, false, true],
  ])(
    "RF-016 en %s ofrece: en gestión=%s, ganar=%s, perder=%s, reactivar=%s",
    async (estado, eg, g, p, r) => {
      renderDetalle(idOportunidadMock[estado]);
      await screen.findByRole("heading", { level: 1 });

      const hay = (n: RegExp) => screen.queryByRole("button", { name: n }) !== null;
      expect([
        hay(botones.enGestion),
        hay(botones.ganar),
        hay(botones.perder),
        hay(botones.reactivar),
      ]).toEqual([eg, g, p, r]);
    },
  );

  it("RF-017 ganar sin cotización manda POST /ganar y muestra la oportunidad ganada", async () => {
    servidor.use(...detalleQueCambiaA(abierta, "ganada"));
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await screen.findByRole("heading", { name: /mendoza/i });

    await usuario.click(screen.getByRole("button", { name: botones.ganar }));
    await usuario.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(await screen.findByText(/ganada/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: botones.perder })).not.toBeInTheDocument();
  });

  it("RF-016 pasar a en gestión manda POST /en-gestion y la oportunidad queda en gestión", async () => {
    servidor.use(...detalleQueCambiaA(idOportunidadMock.nueva, "en_gestion"));
    const usuario = userEvent.setup();
    renderDetalle(idOportunidadMock.nueva);
    await screen.findByRole("heading", { name: /cusco/i });

    await usuario.click(screen.getByRole("button", { name: botones.enGestion }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: botones.enGestion })).not.toBeInTheDocument();
    });
    expect(screen.getByText(/en gestión/i)).toBeInTheDocument();
  });

  it("RF-016 un 409 de la transición se explica en un aviso con el detalle del servidor", async () => {
    servidor.use(
      http.post(`*/api/oportunidades/${abierta}/ganar`, () =>
        problema(409, "No se puede ganar una oportunidad perdida."),
      ),
    );
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await screen.findByRole("heading", { name: /mendoza/i });

    await usuario.click(screen.getByRole("button", { name: botones.ganar }));
    await usuario.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se puede ganar una oportunidad perdida.",
    );
  });
});

describe("RF-017 perder", () => {
  it("RF-017 perder pide el motivo de la lista fija antes de enviar", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("post", `*/api/oportunidades/${abierta}/perder`, cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await screen.findByRole("heading", { name: /mendoza/i });

    await usuario.click(screen.getByRole("button", { name: /^perder/i }));
    const motivo = screen.getByRole("combobox", { name: /motivo/i });
    for (const etiqueta of [
      "Precio",
      "Fechas o disponibilidad",
      "Desistió",
      "Otra agencia",
      "Sin respuesta",
      "Otro",
    ]) {
      expect(screen.getByRole("option", { name: etiqueta })).toBeInTheDocument();
    }
    await usuario.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(motivo).toBeInvalid();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-017 con un motivo manda POST /perder con motivo_perdida", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("post", `*/api/oportunidades/${abierta}/perder`, cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await screen.findByRole("heading", { name: /mendoza/i });

    await usuario.click(screen.getByRole("button", { name: /^perder/i }));
    await usuario.selectOptions(screen.getByRole("combobox", { name: /motivo/i }), "Precio");
    await usuario.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({ motivo_perdida: "precio" });
  });

  it("RF-017 con «Otro» exige el detalle y lo envía", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("post", `*/api/oportunidades/${abierta}/perder`, cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await screen.findByRole("heading", { name: /mendoza/i });

    await usuario.click(screen.getByRole("button", { name: /^perder/i }));
    await usuario.selectOptions(screen.getByRole("combobox", { name: /motivo/i }), "Otro");
    await usuario.click(screen.getByRole("button", { name: /confirmar/i }));
    expect(cuerpos).toHaveLength(0);

    await usuario.type(screen.getByRole("textbox", { name: /detalle/i }), "Se mudó de país");
    await usuario.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({
      motivo_perdida: "otro",
      motivo_perdida_detalle: "Se mudó de país",
    });
  });

  it("RF-017 tras perder, la oportunidad muestra el motivo y ofrece reactivar", async () => {
    let perdida = false;
    servidor.use(
      http.get(`*/api/oportunidades/${abierta}`, () =>
        HttpResponse.json(
          perdida
            ? { ...porId(abierta), estado: "perdida", motivo_perdida: "precio" }
            : porId(abierta),
        ),
      ),
      http.post(`*/api/oportunidades/${abierta}/perder`, () => {
        perdida = true;
        return HttpResponse.json({
          ...porId(abierta),
          estado: "perdida",
          motivo_perdida: "precio",
        });
      }),
    );
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await screen.findByRole("heading", { name: /mendoza/i });

    await usuario.click(screen.getByRole("button", { name: /^perder/i }));
    await usuario.selectOptions(screen.getByRole("combobox", { name: /motivo/i }), "Precio");
    await usuario.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(await screen.findByText(/motivo: precio/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^reactivar/i })).toBeInTheDocument();
  });

  it("RF-017 un 409 al perder se explica en un aviso", async () => {
    servidor.use(
      http.post(`*/api/oportunidades/${abierta}/perder`, () =>
        problema(409, "No se puede perder una oportunidad ganada."),
      ),
    );
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await screen.findByRole("heading", { name: /mendoza/i });

    await usuario.click(screen.getByRole("button", { name: /^perder/i }));
    await usuario.selectOptions(screen.getByRole("combobox", { name: /motivo/i }), "Precio");
    await usuario.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se puede perder una oportunidad ganada.",
    );
  });
});

describe("RF-020 reactivar", () => {
  const perdida = idOportunidadMock.perdida;

  it("RF-020 reactivar manda POST /reactivar y la oportunidad vuelve a en gestión", async () => {
    let reactivada = false;
    servidor.use(
      http.get(`*/api/oportunidades/${perdida}`, () =>
        HttpResponse.json(
          reactivada
            ? { ...porId(perdida), estado: "en_gestion", motivo_perdida: null }
            : porId(perdida),
        ),
      ),
      http.post(`*/api/oportunidades/${perdida}/reactivar`, () => {
        reactivada = true;
        return HttpResponse.json({
          ...porId(perdida),
          estado: "en_gestion",
          motivo_perdida: null,
        });
      }),
    );
    const usuario = userEvent.setup();
    renderDetalle(perdida);
    await screen.findByRole("heading", { name: /miami/i });

    await usuario.click(screen.getByRole("button", { name: /^reactivar/i }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /^reactivar/i })).not.toBeInTheDocument();
    });
    expect(screen.getByText(/en gestión/i)).toBeInTheDocument();
    expect(screen.queryByText(/motivo: precio/i)).not.toBeInTheDocument();
  });

  it("RF-020 un 409 al reactivar se explica en un aviso", async () => {
    servidor.use(
      http.post(`*/api/oportunidades/${perdida}/reactivar`, () =>
        problema(409, "No se puede reactivar una oportunidad en_gestion."),
      ),
    );
    const usuario = userEvent.setup();
    renderDetalle(perdida);
    await screen.findByRole("heading", { name: /miami/i });

    await usuario.click(screen.getByRole("button", { name: /^reactivar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se puede reactivar una oportunidad en_gestion.",
    );
  });
});

describe("RF-014 interacciones: notas intactas y entrada de una línea", () => {
  it("RF-014 conserva tal cual las notas previas, líneas en blanco incluidas", async () => {
    const previas = "20/10/26 — Ana Pérez: Uno\n\n22/10/26 — Tomás Roldán: Dos\n";
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(
      http.get(`*/api/oportunidades/${abierta}`, () =>
        HttpResponse.json({ ...porId(abierta), notas: previas }),
      ),
      registrar("patch", `*/api/oportunidades/${abierta}`, cuerpos),
    );
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await screen.findByText(/Uno/);

    await usuario.type(screen.getByRole("textbox", { name: /interacción/i }), "Tres");
    await usuario.click(screen.getByRole("button", { name: /registrar interacción/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["notas"]).toBe(`${previas}\n25/10/26 — Ana Pérez: Tres`);
  });

  it("RF-014 un texto de varias líneas queda en una sola entrada", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("patch", `*/api/oportunidades/${abierta}`, cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await screen.findByRole("heading", { name: /mendoza/i });

    await usuario.type(
      screen.getByRole("textbox", { name: /interacción/i }),
      "Primero{Enter}{Enter}segundo",
    );
    await usuario.click(screen.getByRole("button", { name: /registrar interacción/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["notas"]).toBe(`${ENTRADA_PREVIA}\n25/10/26 — Ana Pérez: Primero segundo`);
  });
});

describe("RF-017 ganar pide confirmación", () => {
  it("RF-017 cancelar no manda el POST /ganar", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("post", `*/api/oportunidades/${abierta}/ganar`, cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await screen.findByRole("heading", { name: /mendoza/i });

    await usuario.click(screen.getByRole("button", { name: /^ganar/i }));
    expect(screen.getByText(/no se puede deshacer/i)).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(screen.queryByText(/no se puede deshacer/i)).not.toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });
});

describe("Permisos de escritura sobre la oportunidad", () => {
  const ajeno = { ...usuariosPorRol.empleado, id: "99999999-9999-4999-8999-999999999999" };

  it("un empleado que no es el responsable la ve sin acciones ni formularios", async () => {
    renderDetalle(abierta, ajeno);
    await screen.findByRole("heading", { name: /mendoza/i });

    expect(screen.queryByRole("button", { name: /^ganar|^perder/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /interacción/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /agendar insistencia/i })).not.toBeInTheDocument();
  });

  it("el dueño puede escribir aunque no sea el responsable", async () => {
    renderDetalle(abierta, usuariosPorRol.dueno);
    await screen.findByRole("heading", { name: /mendoza/i });

    expect(screen.getByRole("button", { name: /^ganar/i })).toBeInTheDocument();
  });
});

describe("RF-013 consulta sin destino", () => {
  const sinDatos = (id: string) =>
    http.get(`*/api/oportunidades/${id}`, () =>
      HttpResponse.json({ ...porId(id), destino_consultado: null, pasajeros: null }),
    );

  it("RF-013 el detalle muestra «Destino a definir» cuando falta el destino", async () => {
    servidor.use(sinDatos(abierta));
    renderDetalle(abierta);

    expect(await screen.findByRole("heading", { name: DESTINO_A_DEFINIR })).toBeInTheDocument();
  });

  it("RF-013 el detalle muestra «—» cuando faltan los pasajeros", async () => {
    servidor.use(sinDatos(abierta));
    renderDetalle(abierta);

    await screen.findByRole("heading", { name: DESTINO_A_DEFINIR });
    expect(screen.getByText(/—/)).toBeInTheDocument();
    expect(screen.queryByText(/null|undefined|NaN/)).not.toBeInTheDocument();
  });

  it("RF-013 el «—» de pasajeros del detalle tiene el nombre accesible «Pasajeros sin definir»", async () => {
    servidor.use(sinDatos(abierta));
    renderDetalle(abierta);

    expect(await screen.findByLabelText("Pasajeros sin definir")).toHaveTextContent("—");
  });
});

describe("RF-013 completar destino y pasajeros", () => {
  const sinDatos = (id: string) => ({ ...porId(id), destino_consultado: null, pasajeros: null });

  /** GET que devuelve `inicial` hasta que el PATCH la actualiza; captura los cuerpos del PATCH. */
  function oportunidadEditable(id: string, inicial: object, cuerpos: Record<string, unknown>[]) {
    let actual: object = inicial;
    return [
      http.get(`*/api/oportunidades/${id}`, () => HttpResponse.json(actual)),
      http.patch(`*/api/oportunidades/${id}`, async ({ request }) => {
        const cuerpo = (await request.json()) as Record<string, unknown>;
        cuerpos.push(cuerpo);
        actual = { ...actual, ...cuerpo };
        return HttpResponse.json(actual);
      }),
    ];
  }

  const abrirEdicion = async (usuario: ReturnType<typeof userEvent.setup>) => {
    await usuario.click(await screen.findByRole("button", { name: /completar|editar/i }));
  };
  const guardar = () => screen.getByRole("button", { name: /guardar/i });

  it("RF-013 una oportunidad sin destino ni pasajeros permite completarlos y muestra los datos nuevos", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(...oportunidadEditable(abierta, sinDatos(abierta), cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await abrirEdicion(usuario);

    await usuario.type(screen.getByRole("textbox", { name: /destino/i }), "Bariloche");
    await usuario.type(screen.getByRole("spinbutton", { name: /pasajeros/i }), "3");
    await usuario.click(guardar());

    expect(await screen.findByRole("heading", { name: "Bariloche" })).toBeInTheDocument();
    expect(screen.getByText(/3 pasajeros/)).toBeInTheDocument();
    expect(cuerpos).toHaveLength(1);
    expect(cuerpos[0]).toMatchObject({ destino_consultado: "Bariloche", pasajeros: 3 });
  });

  it("RF-013 un destino vacío muestra «Ingresá el destino.» y no manda el PATCH", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(...oportunidadEditable(abierta, sinDatos(abierta), cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await abrirEdicion(usuario);
    await usuario.type(screen.getByRole("spinbutton", { name: /pasajeros/i }), "2");

    await usuario.click(guardar());

    expect(await screen.findByText("Ingresá el destino.")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-013 unos pasajeros en 0 muestran «Ingresá al menos un pasajero.» y no mandan el PATCH", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(...oportunidadEditable(abierta, sinDatos(abierta), cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await abrirEdicion(usuario);
    await usuario.type(screen.getByRole("textbox", { name: /destino/i }), "Salta");
    await usuario.type(screen.getByRole("spinbutton", { name: /pasajeros/i }), "0");

    await usuario.click(guardar());

    expect(await screen.findByText("Ingresá al menos un pasajero.")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-013 con los datos ya cargados, el formulario no deja guardar el destino vacío", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(...oportunidadEditable(abierta, porId(abierta), cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await abrirEdicion(usuario);

    expect(screen.getByRole("textbox", { name: /destino/i })).toHaveValue("Mendoza");
    await usuario.clear(screen.getByRole("textbox", { name: /destino/i }));
    await usuario.click(guardar());

    expect(await screen.findByText("Ingresá el destino.")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-013 con los datos ya cargados, el formulario no deja guardar los pasajeros vacíos", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(...oportunidadEditable(abierta, porId(abierta), cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(abierta);
    await abrirEdicion(usuario);

    expect(screen.getByRole("spinbutton", { name: /pasajeros/i })).toHaveValue(4);
    await usuario.clear(screen.getByRole("spinbutton", { name: /pasajeros/i }));
    await usuario.click(guardar());

    expect(await screen.findByText("Ingresá los pasajeros.")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });
});
