import { crearCliente } from "@rumbo/shared";
import {
  alertasMock,
  crearServidor,
  manejadoresAlertas,
  usuariosPorRol,
  type RolMock,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { PaginaAgenda } from "./PaginaAgenda";

const servidor = crearServidor(...manejadoresAlertas);
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
// El «hoy» de los mocks (HOY_MOCK), para que los grupos de la agenda no dependan del día real.
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

const asesores = [
  { id: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03", nombre: "Ana Pérez" },
  { id: "e7b20d94-6a3f-4c15-9d8e-0b5a3f7c2e04", nombre: "Tomás Roldán" },
];

function renderAgenda(rol: RolMock = "empleado") {
  if (rol === "admin" || rol === "dueno") {
    servidor.use(http.get("*/api/usuarios/asesores", () => HttpResponse.json(asesores)));
  }
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/agenda"]}>
        <PaginaAgenda cliente={cliente} usuario={usuariosPorRol[rol]} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const PAGO = "Cobrar la cuota 2 de 3 de Camila Benítez (Punta Cana).";
const FORMULARIO = "Pedir el pasaporte vigente: Roma exige 6 meses de validez.";
const INSISTENCIA = "Insistir con la cotización a Joaquín Ramos (Europa).";
const VIAJE = "Hoy sale el viaje de la Familia Sosa: pasalo a «en curso».";
const SALIDA_VISTA = "Sale en 7 días el viaje de la Familia Sosa a Brasil.";
const MANUAL_PROXIMA = "Llamar a Ana por la cotización.";
const RECONTACTO_PROXIMA = "Hace un año que Joaquín Ramos no viaja: ofrecele una escapada.";
const AJENA = "Insistir con la cotización a la Familia Sosa (Brasil).";
const ID_FORMULARIO = "c0a1f5d2-6e37-4b81-9a4c-1f2e3d4c5b02";

const fila = async (descripcion: string) => {
  const texto = await screen.findByText(descripcion);
  const li = texto.closest("li");
  if (!li) throw new Error(`La alerta «${descripcion}» no está en un elemento de lista`);
  return li;
};

interface Pedido {
  id: string;
  cuerpo: unknown;
}

/** Handler de un POST de la alerta que registra el pedido (con su cuerpo, `null` si no hay). */
function registrarPost(accion: "resolver" | "posponer", pedidos: Pedido[]) {
  return http.post(`*/api/alertas/:id/${accion}`, async ({ params, request }) => {
    const texto = await request.text();
    pedidos.push({ id: String(params["id"]), cuerpo: texto ? JSON.parse(texto) : null });
    const alerta = alertasMock.find((a) => a.id === params["id"]);
    return HttpResponse.json({ ...alerta, estado: "resuelta" });
  });
}

function problema(status: number, titulo: string, detalle: string) {
  return HttpResponse.json(
    { type: "about:blank", title: titulo, status, detail: detalle },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );
}

const sinAlertas = () => HttpResponse.json({ items: [], total: 0, pagina: 1, por_pagina: 20 });

describe("RF-074 agenda", () => {
  it("RF-074 lista las alertas pendientes hasta hoy con su descripción", async () => {
    renderAgenda("empleado");

    for (const d of [PAGO, FORMULARIO, INSISTENCIA, VIAJE]) {
      expect(await screen.findByText(d)).toBeInTheDocument();
    }
  });

  it("RF-074 no muestra las vistas ni las próximas por defecto", async () => {
    renderAgenda("empleado");
    await screen.findByText(PAGO);

    for (const d of [SALIDA_VISTA, MANUAL_PROXIMA, RECONTACTO_PROXIMA]) {
      expect(screen.queryByText(d)).not.toBeInTheDocument();
    }
  });

  it("RF-074 cada alerta muestra su tipo y el contexto (cliente y viaje)", async () => {
    renderAgenda("empleado");
    const pago = await fila(PAGO);

    expect(within(pago).getByText(/pago/i)).toBeInTheDocument();
    const contexto = within(pago).getByText(/^Viaje: Punta Cana/);
    expect(contexto).toHaveTextContent(/Camila Benítez/);
    expect(contexto).toHaveTextContent(/\$ 450\.000,00 · vence 23\/10\/26/);
  });

  it("RF-074 ordena por fecha: la más atrasada primero", async () => {
    renderAgenda("empleado");
    await screen.findByText(PAGO);

    const textos = screen.getAllByRole("listitem").map((li) => li.textContent);
    const posicion = (d: string) => textos.findIndex((t) => t.includes(d));
    expect(posicion(PAGO)).toBeGreaterThanOrEqual(0);
    expect(posicion(PAGO)).toBeLessThan(posicion(INSISTENCIA));
    expect(posicion(INSISTENCIA)).toBeLessThan(posicion(FORMULARIO));
  });

  it("RF-074 separa las atrasadas de las de hoy", async () => {
    renderAgenda("empleado");
    await screen.findByText(PAGO);

    const atrasadas = screen.getByRole("heading", { name: /^atrasadas · \d+/i });
    const deHoy = screen.getByRole("heading", { name: /^hoy · \d+/i });
    expect(atrasadas).toHaveTextContent("Atrasadas · 2");
    expect(deHoy).toHaveTextContent("Hoy · 2");
    const seccion = (encabezado: HTMLElement) => encabezado.closest("section") as HTMLElement;
    expect(within(seccion(atrasadas)).getByText(PAGO)).toBeInTheDocument();
    expect(within(seccion(atrasadas)).getByText(INSISTENCIA)).toBeInTheDocument();
    expect(within(seccion(deHoy)).getByText(FORMULARIO)).toBeInTheDocument();
    expect(within(seccion(deHoy)).getByText(VIAJE)).toBeInTheDocument();
  });

  it("RF-155 muestra el progreso del día: resueltas sobre el total", async () => {
    renderAgenda("empleado");

    expect(await screen.findByText(/llevás 1 de 6 alertas resueltas/i)).toBeInTheDocument();
    const barra = screen.getByRole("progressbar");
    expect(barra).toHaveAttribute("aria-valuenow", "1");
    expect(barra).toHaveAttribute("aria-valuemax", "6");
  });

  it("RF-074 A3: sin alertas muestra el día sin pendientes y las acciones para adelantar", async () => {
    servidor.use(
      http.get("*/api/alertas", sinAlertas),
      http.get("*/api/alertas/progreso-del-dia", () =>
        HttpResponse.json({ resueltas_hoy: 0, total_del_dia: 0 }),
      ),
    );
    renderAgenda("empleado");

    expect(await screen.findByText(/estás al día/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /adelantar próximas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear recordatorio/i })).toBeInTheDocument();
  });

  it("RF-154 A5: la pestaña Próximas lista las pendientes posteriores a hoy", async () => {
    const usuario = userEvent.setup();
    renderAgenda("empleado");
    await screen.findByText(PAGO);

    await usuario.click(screen.getByRole("tab", { name: /próximas/i }));

    expect(await screen.findByText(MANUAL_PROXIMA)).toBeInTheDocument();
    expect(screen.getByText(RECONTACTO_PROXIMA)).toBeInTheDocument();
    expect(screen.queryByText(PAGO)).not.toBeInTheDocument();
  });

  it("RF-154 A5: pide al servidor las alertas con proximas=true", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(
      http.get("*/api/alertas", ({ request }) => {
        pedidos.push(new URL(request.url).searchParams);
        return sinAlertas();
      }),
      http.get("*/api/alertas/progreso-del-dia", () =>
        HttpResponse.json({ resueltas_hoy: 0, total_del_dia: 0 }),
      ),
    );
    const usuario = userEvent.setup();
    renderAgenda("empleado");

    await usuario.click(await screen.findByRole("tab", { name: /próximas/i }));

    await waitFor(() => {
      expect(pedidos.some((p) => p.get("proximas") === "true")).toBe(true);
    });
  });

  it("RF-154 el estado vacío permite adelantar las próximas", async () => {
    servidor.use(
      http.get("*/api/alertas", ({ request }) => {
        const proximas = new URL(request.url).searchParams.get("proximas") === "true";
        const items = proximas ? alertasMock.filter((a) => a.fecha > "2026-10-25") : [];
        return HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 20 });
      }),
    );
    const usuario = userEvent.setup();
    renderAgenda("empleado");

    await usuario.click(await screen.findByRole("button", { name: /adelantar próximas/i }));

    expect(await screen.findByText(MANUAL_PROXIMA)).toBeInTheDocument();
  });

  it("RF-074 «Mostrar vistas» agrega las alertas vistas", async () => {
    const usuario = userEvent.setup();
    renderAgenda("empleado");
    await screen.findByText(PAGO);

    await usuario.click(screen.getByRole("switch", { name: /mostrar vistas/i }));

    expect(await screen.findByText(SALIDA_VISTA)).toBeInTheDocument();
  });

  it("RF-074 A2: la alerta de pago no se resuelve a mano y remite al cobro", async () => {
    renderAgenda("empleado");
    const pago = await fila(PAGO);

    expect(within(pago).queryByRole("button", { name: /resolver/i })).not.toBeInTheDocument();
    expect(within(pago).getByText(/registrar el cobro/i)).toBeInTheDocument();
  });

  it("RF-074 A3: si falla la consulta de vistas igual muestra el estado vacío", async () => {
    servidor.use(
      http.get("*/api/alertas", ({ request }) =>
        new URL(request.url).searchParams.get("estado") === "vista"
          ? problema(500, "Error", "Falla.")
          : sinAlertas(),
      ),
    );
    renderAgenda("empleado");

    expect(await screen.findByText(/estás al día/i)).toBeInTheDocument();
  });

  it("RF-074 al cambiar de filtro estando en la página 2 vuelve a la 1; las vistas piden siempre la 1", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(
      http.get("*/api/alertas", ({ request }) => {
        const parametros = new URL(request.url).searchParams;
        pedidos.push(parametros);
        const pagina = Number(parametros.get("pagina") ?? 1);
        const items = parametros.get("estado") === "vista" ? [] : [alertasMock[1]];
        return HttpResponse.json({ items, total: 150, pagina, por_pagina: 100 });
      }),
    );
    const usuario = userEvent.setup();
    renderAgenda("empleado");
    await usuario.click(await screen.findByRole("button", { name: /siguiente/i }));
    await waitFor(() => {
      expect(pedidos.some((p) => p.get("pagina") === "2")).toBe(true);
    });

    await usuario.selectOptions(screen.getByRole("combobox", { name: /tipo/i }), "Formulario");

    await waitFor(() => {
      const conTipo = pedidos.filter((p) => p.get("tipo") === "formulario");
      expect(conTipo.length).toBeGreaterThan(0);
      expect(conTipo.every((p) => p.get("pagina") === "1")).toBe(true);
    });
    expect(
      pedidos.filter((p) => p.get("estado") === "vista").every((p) => p.get("pagina") === "1"),
    ).toBe(true);
  });

  it("RF-074 si el total baja y la página queda fuera de rango, vuelve a la última", async () => {
    servidor.use(
      http.get("*/api/alertas", ({ request }) => {
        const parametros = new URL(request.url).searchParams;
        const pagina = Number(parametros.get("pagina") ?? 1);
        const vistas = parametros.get("estado") === "vista";
        const items = vistas || pagina > 1 ? [] : [alertasMock[1]];
        const total = vistas ? 0 : pagina > 1 ? 100 : 101;
        return HttpResponse.json({ items, total, pagina, por_pagina: 100 });
      }),
    );
    const usuario = userEvent.setup();
    renderAgenda("empleado");
    await usuario.click(await screen.findByRole("button", { name: /siguiente/i }));

    expect(await screen.findByText(FORMULARIO)).toBeInTheDocument();
    expect(screen.queryByText(/página 2/i)).not.toBeInTheDocument();
  });

  it("RF-074 una alerta de pago en dólares muestra el monto en US$", async () => {
    const pago = alertasMock[0];
    if (!pago?.contexto.pago) throw new Error("falta el pago del mock");
    const enDolares = {
      ...pago,
      contexto: {
        ...pago.contexto,
        pago: { ...pago.contexto.pago, moneda: "USD", monto: "1500.00" },
      },
    };
    servidor.use(
      http.get("*/api/alertas", ({ request }) =>
        HttpResponse.json(
          new URL(request.url).searchParams.get("estado") === "vista"
            ? { items: [], total: 0, pagina: 1, por_pagina: 100 }
            : { items: [enDolares], total: 1, pagina: 1, por_pagina: 100 },
        ),
      ),
    );
    renderAgenda("empleado");
    const f = await fila(PAGO);

    expect(within(f).getByText(/^Viaje: Punta Cana/)).toHaveTextContent(/US\$ 1\.500,00/);
  });

  it("RF-074 una alerta vista no ofrece posponer pero sí resolver", async () => {
    const usuario = userEvent.setup();
    renderAgenda("empleado");
    await screen.findByText(PAGO);
    await usuario.click(screen.getByRole("switch", { name: /mostrar vistas/i }));
    const vista = await fila(SALIDA_VISTA);

    expect(within(vista).queryByRole("button", { name: /posponer/i })).not.toBeInTheDocument();
    expect(within(vista).getByRole("button", { name: /resolver/i })).toBeInTheDocument();
  });

  it("RF-074 si hay más alertas que las de la página, ofrece pasar a la siguiente", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(
      http.get("*/api/alertas", ({ request }) => {
        const parametros = new URL(request.url).searchParams;
        pedidos.push(parametros);
        const pagina = Number(parametros.get("pagina") ?? 1);
        const items =
          parametros.get("estado") === "vista" ? [] : alertasMock.slice(pagina - 1, pagina);
        return HttpResponse.json({ items, total: 150, pagina, por_pagina: 100 });
      }),
    );
    const usuario = userEvent.setup();
    renderAgenda("empleado");

    expect(await screen.findByText(/mostrando 1 de 150 alertas/i)).toBeInTheDocument();
    expect(pedidos[0]?.get("por_pagina")).toBe("100");
    await usuario.click(screen.getByRole("button", { name: /siguiente/i }));
    await waitFor(() => {
      expect(pedidos.some((p) => p.get("pagina") === "2")).toBe(true);
    });
  });

  it("RF-074 A3: con alertas vistas sin resolver no dice que está al día y permite verlas", async () => {
    servidor.use(
      http.get("*/api/alertas", ({ request }) => {
        const vistas = new URL(request.url).searchParams.get("estado") === "vista";
        const items = vistas ? alertasMock.filter((a) => a.estado === "vista") : [];
        return HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 100 });
      }),
    );
    const usuario = userEvent.setup();
    renderAgenda("empleado");

    expect(await screen.findByText(/tenés 1 alerta vista sin resolver/i)).toBeInTheDocument();
    expect(screen.queryByText(/estás al día/i)).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: /ver las vistas/i }));
    expect(await screen.findByText(SALIDA_VISTA)).toBeInTheDocument();
  });

  it("RF-078 A3: la agenda vacía de la agencia lo dice con un texto de agencia", async () => {
    servidor.use(http.get("*/api/alertas", sinAlertas));
    renderAgenda("admin");

    expect(
      await screen.findByText(/la agencia no tiene alertas pendientes para hoy/i),
    ).toBeInTheDocument();
  });

  it("RF-074 las acciones se nombran con la descripción de la alerta", async () => {
    renderAgenda("empleado");
    const f = await fila(FORMULARIO);

    for (const accion of ["Resolver", "Posponer", "Marcar como vista"]) {
      expect(
        within(f).getByRole("button", { name: `${accion}: ${FORMULARIO}` }),
      ).toBeInTheDocument();
    }
    expect(screen.getByRole("tab", { name: /pendientes/i })).toHaveAttribute(
      "aria-controls",
      screen.getByRole("tabpanel").id,
    );
  });

  it("RF-074 si falla la consulta de vistas con el switch activo, lo avisa", async () => {
    servidor.use(
      http.get("*/api/alertas", ({ request }) =>
        new URL(request.url).searchParams.get("estado") === "vista"
          ? problema(500, "Error", "Falla.")
          : HttpResponse.json({ items: [alertasMock[1]], total: 1, pagina: 1, por_pagina: 100 }),
      ),
    );
    const usuario = userEvent.setup();
    renderAgenda("empleado");
    await screen.findByText(FORMULARIO);
    await usuario.click(screen.getByRole("switch", { name: /mostrar vistas/i }));

    expect(await screen.findByText(/no pudimos cargar las alertas vistas/i)).toBeInTheDocument();
  });

  it("RF-074 A2: si el servidor rechaza resolver con 409, muestra el motivo y conserva la alerta", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: HOY });
    servidor.use(
      http.post("*/api/alertas/:id/resolver", () =>
        problema(409, "Conflicto", "Motivo del conflicto."),
      ),
    );
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAgenda("empleado");
    const f = await fila(FORMULARIO);

    await usuario.click(within(f).getByRole("button", { name: /resolver/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(await screen.findByText(/motivo del conflicto/i)).toBeInTheDocument();
    expect(screen.getByText(FORMULARIO)).toBeInTheDocument();
  });
});

describe("RF-076 resolver con deshacer", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: HOY });
  });

  it("RF-076 al resolver avisa «Alerta resuelta» con «Deshacer» y todavía no envía", async () => {
    const pedidos: Pedido[] = [];
    servidor.use(registrarPost("resolver", pedidos));
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAgenda("empleado");
    const f = await fila(FORMULARIO);

    await usuario.click(within(f).getByRole("button", { name: /resolver/i }));

    expect(await screen.findByText(/alerta resuelta/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /deshacer/i })).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(pedidos).toHaveLength(0);
  });

  it("RF-076 pasado el tiempo de gracia envía la resolución de esa alerta", async () => {
    const pedidos: Pedido[] = [];
    servidor.use(registrarPost("resolver", pedidos));
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAgenda("empleado");
    const f = await fila(FORMULARIO);

    await usuario.click(within(f).getByRole("button", { name: /resolver/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    await waitFor(() => {
      expect(pedidos).toEqual([{ id: ID_FORMULARIO, cuerpo: null }]);
    });
  });

  it("RF-076 «Deshacer» cancela el envío y la alerta sigue en la agenda", async () => {
    const pedidos: Pedido[] = [];
    servidor.use(registrarPost("resolver", pedidos));
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAgenda("empleado");
    const f = await fila(FORMULARIO);

    await usuario.click(within(f).getByRole("button", { name: /resolver/i }));
    await usuario.click(await screen.findByRole("button", { name: /deshacer/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(pedidos).toHaveLength(0);
    expect(screen.getByText(FORMULARIO)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /deshacer/i })).not.toBeInTheDocument();
  });
});

describe("RF-077 posponer", () => {
  it("RF-077 la nueva fecha no puede ser anterior al día siguiente a hoy", async () => {
    const usuario = userEvent.setup();
    renderAgenda("empleado");
    const f = await fila(FORMULARIO);

    await usuario.click(within(f).getByRole("button", { name: /posponer/i }));

    expect(await screen.findByLabelText(/nueva fecha/i)).toHaveAttribute("min", "2026-10-26");
  });

  it("RF-077 pide la nueva fecha y envía la reprogramación", async () => {
    const pedidos: Pedido[] = [];
    servidor.use(registrarPost("posponer", pedidos));
    const usuario = userEvent.setup();
    renderAgenda("empleado");
    const f = await fila(FORMULARIO);

    await usuario.click(within(f).getByRole("button", { name: /posponer/i }));
    await usuario.type(await screen.findByLabelText(/nueva fecha/i), "2026-10-30");
    await usuario.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => {
      expect(pedidos).toEqual([{ id: ID_FORMULARIO, cuerpo: { fecha: "2026-10-30" } }]);
    });
  });

  it("RF-077 si el servidor rechaza la fecha (422) muestra el motivo y conserva la alerta", async () => {
    servidor.use(
      http.post("*/api/alertas/:id/posponer", () =>
        problema(422, "Datos inválidos", "Fecha no válida del servidor."),
      ),
    );
    const usuario = userEvent.setup();
    renderAgenda("empleado");
    const f = await fila(FORMULARIO);

    await usuario.click(within(f).getByRole("button", { name: /posponer/i }));
    await usuario.type(await screen.findByLabelText(/nueva fecha/i), "2026-10-30");
    await usuario.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(await screen.findByText(/fecha no válida del servidor/i)).toBeInTheDocument();
    expect(screen.getByText(FORMULARIO)).toBeInTheDocument();
  });
});

describe("RF-078 agenda de la agencia", () => {
  it("RF-078 el filtro «Responsable» pide la agenda de ese asesor", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(
      http.get("*/api/alertas", ({ request }) => {
        pedidos.push(new URL(request.url).searchParams);
        return sinAlertas();
      }),
    );
    const usuario = userEvent.setup();
    renderAgenda("admin");
    await screen.findByRole("option", { name: "Tomás Roldán" });

    await usuario.selectOptions(
      screen.getByRole("combobox", { name: /responsable/i }),
      "Tomás Roldán",
    );

    await waitFor(() => {
      expect(pedidos.some((p) => p.get("propietario_id") === asesores[1]?.id)).toBe(true);
    });
  });

  it("RF-078 el empleado no tiene el filtro «Responsable»", async () => {
    renderAgenda("empleado");
    await screen.findByText(PAGO);

    expect(screen.queryByRole("combobox", { name: /responsable/i })).not.toBeInTheDocument();
  });

  it.each<RolMock>(["admin", "dueno"])(
    "RF-078 %s ve el responsable de cada alerta y el progreso de la agencia",
    async (rol) => {
      renderAgenda(rol);
      const f = await fila(FORMULARIO);

      expect(within(f).getByText(/Ana Pérez/)).toBeInTheDocument();
      expect(
        await screen.findByText(/la agencia lleva 1 de 6 alertas resueltas/i),
      ).toBeInTheDocument();
    },
  );

  it("RF-078 admin ve las alertas de otro responsable que devuelve el servidor", async () => {
    servidor.use(
      http.get("*/api/alertas", () => {
        const propias = alertasMock.filter(
          (a) => a.estado === "pendiente" && a.fecha <= "2026-10-25",
        );
        const items = [
          ...propias,
          {
            ...propias[0],
            id: "d1b2a6e3-7f48-4c92-8b5d-2a3f4e5d6c01",
            tipo: "insistencia",
            descripcion: AJENA,
            responsable: { id: "e7b20d94-6a3f-4c15-9d8e-0b5a3f7c2e04", nombre: "Tomás Roldán" },
          },
        ];
        return HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 20 });
      }),
    );
    renderAgenda("admin");
    const f = await fila(AJENA);

    expect(within(f).getByText(/Tomás Roldán/)).toBeInTheDocument();
  });

  it("RF-078 el empleado no ve el responsable ni la leyenda de la agencia", async () => {
    renderAgenda("empleado");
    const f = await fila(FORMULARIO);

    expect(within(f).queryByText(/Ana Pérez/)).not.toBeInTheDocument();
    expect(screen.queryByText(/la agencia lleva/i)).not.toBeInTheDocument();
    expect(screen.getByText(/llevás 1 de 6/i)).toBeInTheDocument();
  });

  it("RF-078 el freelance tampoco ve el responsable", async () => {
    renderAgenda("freelance");
    const f = await fila(FORMULARIO);

    expect(within(f).queryByText(/Ana Pérez/)).not.toBeInTheDocument();
  });
});
