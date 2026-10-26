import { crearCliente } from "@rumbo/shared";
import {
  alertasMock,
  crearServidor,
  manejadoresAlertas,
  requisitosMock,
  usuariosPorRol,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { PaginaAgenda } from "./PaginaAgenda";

// T-166 (CU-14 paso 3, pantalla 49): panel lateral con el detalle de la alerta.
const servidor = crearServidor(...manejadoresAlertas);
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
const HOY = new Date("2026-10-25T12:00:00-03:00");
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, now: HOY });
});
afterEach(() => {
  servidor.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => {
  servidor.close();
});

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });

const PAGO = "Cobrar la cuota 2 de 3 de Camila Benítez (Punta Cana).";
const FORMULARIO = "Pedir el pasaporte vigente: Roma exige 6 meses de validez.";
const INSISTENCIA = "Insistir con la cotización a Joaquín Ramos (Europa).";
const SALIDA_VISTA = "Sale en 7 días el viaje de la Familia Sosa a Brasil.";
const ID_FORMULARIO = "c0a1f5d2-6e37-4b81-9a4c-1f2e3d4c5b02";
const DESTINO_ID = "9c2d4e61-1a7f-4b38-8d05-6e3f1a2b4c22";

function renderAgenda() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/agenda"]}>
        <PaginaAgenda cliente={cliente} usuario={usuariosPorRol.empleado} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const pagina = <T,>(items: T[]) => ({ items, total: items.length, pagina: 1, por_pagina: 20 });

/** Pedidos a `GET /api/viajes/{id}`: el panel no debe hacerlos, el destino viene en la alerta. */
let viajesPedidos: string[] = [];
beforeEach(() => {
  viajesPedidos = [];
});

/** La alerta como la devuelve el contrato nuevo: `contexto.viaje` trae `destino_id`. */
function conDestino<T extends { contexto: { viaje: object | null } }>(alerta: T): T {
  if (!alerta.contexto.viaje) return alerta;
  return {
    ...alerta,
    contexto: { ...alerta.contexto, viaje: { ...alerta.contexto.viaje, destino_id: DESTINO_ID } },
  };
}

/**
 * El panel toma el destino de `alerta.contexto.viaje.destino_id` (T-166) y pide sus requisitos sin
 * pasar por la ficha del viaje. Hay que llamarla antes de cualquier otro `servidor.use` de alertas.
 */
function servirRequisitos(pedidosRequisitos: string[] = [], items = requisitosMock as unknown[]) {
  servidor.use(
    http.get("*/api/alertas", ({ request }) => {
      const url = new URL(request.url);
      const estado = url.searchParams.get("estado") ?? "pendiente";
      const filtradas = alertasMock.filter(
        (a) =>
          a.estado === estado &&
          a.fecha <= "2026-10-25" &&
          url.searchParams.get("proximas") !== "true",
      );
      return HttpResponse.json(pagina(filtradas.map(conDestino)));
    }),
    http.get("*/api/alertas/:id", ({ params }) => {
      const alerta = alertasMock.find((a) => a.id === params["id"]);
      return alerta
        ? HttpResponse.json(conDestino(alerta))
        : HttpResponse.json({}, { status: 404 });
    }),
    http.get("*/api/viajes/:viaje_id", ({ params }) => {
      viajesPedidos.push(String(params["viaje_id"]));
      return HttpResponse.json({ id: params["viaje_id"], destino_id: DESTINO_ID });
    }),
    http.get("*/api/destinos/:destino_id/requisitos", ({ params }) => {
      pedidosRequisitos.push(String(params["destino_id"]));
      return HttpResponse.json(pagina(items));
    }),
  );
}

/** Abre el panel de la alerta con el botón «Ver detalle» de su fila. */
async function abrirDetalle(descripcion: string) {
  const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const texto = await screen.findByText(descripcion);
  const li = texto.closest("li");
  if (!li) throw new Error(`La alerta «${descripcion}» no está en un elemento de lista`);
  const abrir = within(li).getByRole("button", { name: `Ver detalle: ${descripcion}` });
  await usuario.click(abrir);
  const panel = await screen.findByRole("dialog", { name: /detalle de la alerta/i });
  return { usuario, panel, abrir };
}

describe("RF-075 detalle de la alerta", () => {
  it("RF-075 al elegir la alerta abre el panel y pide su detalle a GET /api/alertas/{id}", async () => {
    const pedidos: string[] = [];
    servirRequisitos();
    servidor.use(
      http.get("*/api/alertas/:id", ({ params }) => {
        pedidos.push(String(params["id"]));
        return HttpResponse.json(alertasMock.find((a) => a.id === params["id"]));
      }),
    );
    renderAgenda();

    const { panel } = await abrirDetalle(FORMULARIO);

    expect(await within(panel).findByText(FORMULARIO)).toBeInTheDocument();
    expect(pedidos).toContain(ID_FORMULARIO);
  });

  it("RF-075 muestra tipo, fecha, estado y descripción de la alerta", async () => {
    servirRequisitos();
    renderAgenda();

    const { panel } = await abrirDetalle(FORMULARIO);

    expect(await within(panel).findByText(FORMULARIO)).toBeInTheDocument();
    expect(within(panel).getByText("Formulario")).toBeInTheDocument();
    expect(within(panel).getByText("25/10/26")).toBeInTheDocument();
    expect(within(panel).getByText(/pendiente/i)).toBeInTheDocument();
  });

  it("RF-075 muestra el viaje (destino, fechas y estado) y el cliente de origen", async () => {
    servirRequisitos();
    renderAgenda();

    const { panel } = await abrirDetalle(FORMULARIO);

    expect(await within(panel).findByText(/Punta Cana/)).toBeInTheDocument();
    expect(within(panel).getByText(/01\/09\/26/)).toBeInTheDocument();
    expect(within(panel).getByText(/15\/09\/26/)).toBeInTheDocument();
    expect(within(panel).getByText(/finalizado/i)).toBeInTheDocument();
    expect(within(panel).getByText(/Camila Benítez/)).toBeInTheDocument();
  });

  it("RF-075 la alerta de un pago muestra el importe con su moneda y el vencimiento", async () => {
    servirRequisitos();
    renderAgenda();

    const { panel } = await abrirDetalle(PAGO);

    expect(await within(panel).findByText(/\$ 450\.000,00/)).toBeInTheDocument();
    expect(within(panel).getByText(/vence 23\/10\/26/)).toBeInTheDocument();
  });

  it("RF-075 un pago en dólares muestra el importe en US$", async () => {
    const pago = alertasMock[0];
    if (!pago?.contexto.pago) throw new Error("falta el pago del mock");
    const enDolares = conDestino({
      ...pago,
      contexto: {
        ...pago.contexto,
        pago: { ...pago.contexto.pago, moneda: "USD", monto: "1500.00" },
      },
    });
    servirRequisitos();
    servidor.use(
      http.get("*/api/alertas", ({ request }) =>
        HttpResponse.json(
          new URL(request.url).searchParams.get("estado") === "vista"
            ? pagina([])
            : pagina([enDolares]),
        ),
      ),
      http.get("*/api/alertas/:id", () => HttpResponse.json(enDolares)),
    );
    renderAgenda();

    const { panel } = await abrirDetalle(PAGO);

    expect(await within(panel).findByText(/US\$ 1\.500,00/)).toBeInTheDocument();
  });

  it("RF-075 lista los requisitos del destino del viaje de la alerta", async () => {
    const destinosPedidos: string[] = [];
    servirRequisitos(destinosPedidos);
    renderAgenda();

    const { panel } = await abrirDetalle(FORMULARIO);

    expect(await within(panel).findByText("Pasaporte vigente")).toBeInTheDocument();
    expect(within(panel).getByText("Seguro de asistencia al viajero")).toBeInTheDocument();
    expect(destinosPedidos).toContain(DESTINO_ID);
    expect(viajesPedidos).toHaveLength(0);
  });

  it("RF-075 los requisitos distinguen los obligatorios de los opcionales", async () => {
    servirRequisitos();
    renderAgenda();

    const { panel } = await abrirDetalle(FORMULARIO);

    const pasaporte = (await within(panel).findByText("Pasaporte vigente")).closest("li");
    const seguro = within(panel).getByText("Seguro de asistencia al viajero").closest("li");
    expect(pasaporte).toHaveTextContent(/obligatorio/i);
    expect(seguro).not.toHaveTextContent(/obligatorio/i);
  });

  it("RF-075 una alerta sin viaje no pide ni muestra requisitos", async () => {
    const destinosPedidos: string[] = [];
    servirRequisitos(destinosPedidos);
    renderAgenda();

    const { panel } = await abrirDetalle(INSISTENCIA);

    expect(await within(panel).findByText(INSISTENCIA)).toBeInTheDocument();
    expect(within(panel).queryByText(/requisitos/i)).not.toBeInTheDocument();
    expect(destinosPedidos).toHaveLength(0);
  });

  it("RF-075 si el destino no tiene requisitos lo dice", async () => {
    servirRequisitos([], []);
    renderAgenda();

    const { panel } = await abrirDetalle(FORMULARIO);

    expect(await within(panel).findByText(/no tiene requisitos/i)).toBeInTheDocument();
  });

  it("RF-075 si falla la carga de los requisitos lo avisa y el resto del detalle sigue visible", async () => {
    servirRequisitos();
    servidor.use(
      http.get("*/api/destinos/:destino_id/requisitos", () =>
        HttpResponse.json(
          { type: "about:blank", title: "Error", status: 500, detail: "Falla." },
          { status: 500, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );
    renderAgenda();

    const { panel } = await abrirDetalle(FORMULARIO);

    expect(await within(panel).findByText(/no pudimos cargar los requisitos/i)).toBeInTheDocument();
    expect(within(panel).getByText(FORMULARIO)).toBeInTheDocument();
  });

  it("RF-075 si falla el detalle de la alerta muestra el error en el panel", async () => {
    servirRequisitos();
    servidor.use(
      http.get("*/api/alertas/:id", () =>
        HttpResponse.json(
          { type: "about:blank", title: "No encontrado", status: 404, detail: "No existe." },
          { status: 404, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );
    renderAgenda();

    const { panel } = await abrirDetalle(FORMULARIO);

    expect(await within(panel).findByRole("alert")).toBeInTheDocument();
  });

  it("RF-075 «Cerrar» cierra el panel y el foco vuelve a la fila", async () => {
    servirRequisitos();
    renderAgenda();
    const { usuario, panel, abrir } = await abrirDetalle(FORMULARIO);

    await usuario.click(within(panel).getByRole("button", { name: /cerrar/i }));

    expect(screen.queryByRole("dialog", { name: /detalle de la alerta/i })).not.toBeInTheDocument();
    expect(abrir).toHaveFocus();
  });

  it("RF-075 Escape cierra el panel", async () => {
    servirRequisitos();
    renderAgenda();
    const { usuario } = await abrirDetalle(FORMULARIO);

    await usuario.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: /detalle de la alerta/i })).not.toBeInTheDocument();
  });
});

describe("RF-076 acciones desde el detalle", () => {
  function registrarPost(accion: "resolver" | "posponer" | "vista", pedidos: unknown[]) {
    return http.post(`*/api/alertas/:id/${accion}`, async ({ params, request }) => {
      const texto = await request.text();
      pedidos.push({
        id: String(params["id"]),
        cuerpo: texto ? (JSON.parse(texto) as unknown) : null,
      });
      const alerta = alertasMock.find((a) => a.id === params["id"]);
      return HttpResponse.json({ ...alerta, estado: accion === "vista" ? "vista" : "resuelta" });
    });
  }

  it("RF-076 resolver desde el panel avisa «Alerta resuelta» con «Deshacer» y todavía no envía", async () => {
    const pedidos: unknown[] = [];
    servidor.use(registrarPost("resolver", pedidos));
    servirRequisitos();
    renderAgenda();
    const { usuario, panel } = await abrirDetalle(FORMULARIO);

    await usuario.click(await within(panel).findByRole("button", { name: /^resolver/i }));

    expect(await screen.findByText(/alerta resuelta/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /deshacer/i })).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(pedidos).toHaveLength(0);
  });

  it("RF-076 pasado el tiempo de gracia envía la resolución de esa alerta", async () => {
    const pedidos: unknown[] = [];
    servidor.use(registrarPost("resolver", pedidos));
    servirRequisitos();
    renderAgenda();
    const { usuario, panel } = await abrirDetalle(FORMULARIO);

    await usuario.click(await within(panel).findByRole("button", { name: /^resolver/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    await waitFor(() => {
      expect(pedidos).toEqual([{ id: ID_FORMULARIO, cuerpo: null }]);
    });
  });

  it("RF-076 «Deshacer» cancela el envío y la alerta sigue en la agenda", async () => {
    const pedidos: unknown[] = [];
    servidor.use(registrarPost("resolver", pedidos));
    servirRequisitos();
    renderAgenda();
    const { usuario, panel } = await abrirDetalle(FORMULARIO);

    await usuario.click(await within(panel).findByRole("button", { name: /^resolver/i }));
    await usuario.click(await screen.findByRole("button", { name: /deshacer/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(pedidos).toHaveLength(0);
    expect(screen.getByText(FORMULARIO)).toBeInTheDocument();
  });

  it("RF-076 la alerta de pago no se resuelve a mano: el panel no ofrece «Resolver» y remite al cobro", async () => {
    servirRequisitos();
    renderAgenda();
    const { panel } = await abrirDetalle(PAGO);

    expect(await within(panel).findByText(/registrar el cobro/i)).toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: /^resolver/i })).not.toBeInTheDocument();
  });

  it("RF-076 posponer desde el panel pide la nueva fecha (mínimo mañana) y envía la reprogramación", async () => {
    const pedidos: unknown[] = [];
    servidor.use(registrarPost("posponer", pedidos));
    servirRequisitos();
    renderAgenda();
    const { usuario, panel } = await abrirDetalle(FORMULARIO);

    await usuario.click(await within(panel).findByRole("button", { name: /^posponer/i }));
    const fecha = await within(panel).findByLabelText(/nueva fecha/i);
    expect(fecha).toHaveAttribute("min", "2026-10-26");
    await usuario.type(fecha, "2026-10-30");
    await usuario.click(within(panel).getByRole("button", { name: /confirmar/i }));

    await waitFor(() => {
      expect(pedidos).toEqual([{ id: ID_FORMULARIO, cuerpo: { fecha: "2026-10-30" } }]);
    });
  });

  it("RF-076 si el servidor rechaza la fecha (422) el panel muestra el motivo", async () => {
    servidor.use(
      http.post("*/api/alertas/:id/posponer", () =>
        HttpResponse.json(
          {
            type: "about:blank",
            title: "Datos inválidos",
            status: 422,
            detail: "Fecha no válida del servidor.",
          },
          { status: 422, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );
    servirRequisitos();
    renderAgenda();
    const { usuario, panel } = await abrirDetalle(FORMULARIO);

    await usuario.click(await within(panel).findByRole("button", { name: /^posponer/i }));
    await usuario.type(await within(panel).findByLabelText(/nueva fecha/i), "2026-10-30");
    await usuario.click(within(panel).getByRole("button", { name: /confirmar/i }));

    expect(await screen.findByText(/fecha no válida del servidor/i)).toBeInTheDocument();
  });

  it("RF-076 marcar como vista desde el panel envía POST /api/alertas/{id}/vista", async () => {
    const pedidos: unknown[] = [];
    servidor.use(registrarPost("vista", pedidos));
    servirRequisitos();
    renderAgenda();
    const { usuario, panel } = await abrirDetalle(FORMULARIO);

    await usuario.click(await within(panel).findByRole("button", { name: /^marcar como vista/i }));

    await waitFor(() => {
      expect(pedidos).toEqual([{ id: ID_FORMULARIO, cuerpo: null }]);
    });
  });

  it("RF-076 al resolver desde el panel el foco pasa al «Deshacer» del aviso", async () => {
    servidor.use(registrarPost("resolver", []));
    servirRequisitos();
    renderAgenda();
    const { usuario, panel } = await abrirDetalle(FORMULARIO);

    await usuario.click(await within(panel).findByRole("button", { name: /^resolver/i }));

    expect(await screen.findByRole("button", { name: /deshacer/i })).toHaveFocus();
    expect(screen.queryByRole("dialog", { name: /detalle de la alerta/i })).not.toBeInTheDocument();
  });

  it("RF-076 al marcar como vista desde el panel el foco queda en «Cerrar»", async () => {
    servidor.use(registrarPost("vista", []));
    servirRequisitos();
    renderAgenda();
    const { usuario, panel } = await abrirDetalle(FORMULARIO);

    await usuario.click(await within(panel).findByRole("button", { name: /^marcar como vista/i }));

    await waitFor(() => {
      expect(within(panel).getByRole("button", { name: /cerrar/i })).toHaveFocus();
    });
  });

  it("RF-076 Escape con el formulario de posponer abierto cierra solo el formulario", async () => {
    servirRequisitos();
    renderAgenda();
    const { usuario, panel } = await abrirDetalle(FORMULARIO);
    await usuario.click(await within(panel).findByRole("button", { name: /^posponer/i }));
    await usuario.type(await within(panel).findByLabelText(/nueva fecha/i), "2026-10-30");

    await usuario.keyboard("{Escape}");

    expect(within(panel).queryByLabelText(/nueva fecha/i)).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: /detalle de la alerta/i })).toBeInTheDocument();
  });

  it("RF-076 una alerta vista no ofrece posponer ni marcar como vista, pero sí resolver", async () => {
    servirRequisitos();
    renderAgenda();
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await screen.findByText(FORMULARIO);
    await usuario.click(screen.getByRole("switch", { name: /mostrar vistas/i }));

    const { panel } = await abrirDetalle(SALIDA_VISTA);

    expect(await within(panel).findByRole("button", { name: /^resolver/i })).toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: /^posponer/i })).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: /^marcar como vista/i }),
    ).not.toBeInTheDocument();
  });
});
