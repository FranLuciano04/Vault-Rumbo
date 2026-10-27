import { crearCliente, type EstadoOportunidad } from "@rumbo/shared";
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

function renderDetalle(id: string) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/oportunidades/${id}`]}>
        <Routes>
          <Route
            path="/oportunidades/:id"
            element={<DetalleOportunidad cliente={cliente} usuario={usuariosPorRol.empleado} />}
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
      http.get("*/api/alertas", ({ request }) => {
        const estado = new URL(request.url).searchParams.get("estado") ?? "pendiente";
        const items =
          estado === "pendiente" ? [pendiente] : estado === "resuelta" ? [atendida] : [];
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
      await screen.findByRole("heading", { name: /./ });

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
      await screen.findByRole("heading", { name: /./ });

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
