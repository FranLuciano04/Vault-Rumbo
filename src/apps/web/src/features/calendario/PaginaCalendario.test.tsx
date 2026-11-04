import { crearCliente, type EventoCalendario } from "@rumbo/shared";
import { crearServidor } from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PaginaCalendario } from "./PaginaCalendario";

const servidor = crearServidor();
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
beforeEach(() => {
  // Hoy es jueves 12/11/26; solo se falsea la fecha para no frenar a MSW ni a Testing Library.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-12T15:00:00"));
});
afterEach(() => {
  servidor.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => {
  servidor.close();
});

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });

const idViajeBrasil = "e5f6a7b8-c9d0-4e1f-a2b3-c4d5e6f7a812";
const idViajeCamila = "f0a7c3d9-2b64-4e18-9c5d-8b1e6a4d2f55";
const idViajeRoma = "7a1e5c10-2b3d-4e5f-8a6b-1c2d3e4f5a02";
const idPago = "11111111-2222-4333-8444-555555555501";
const idAlerta = "11111111-2222-4333-8444-555555555502";
const responsable = "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03";

const eventos: EventoCalendario[] = [
  {
    tipo: "viaje",
    titulo: "Familia Sosa — Brasil",
    desde: "2026-11-10",
    hasta: "2026-11-14",
    estado: "confirmado",
    viaje_id: idViajeBrasil,
    pago_id: null,
    alerta_id: null,
    responsable_id: responsable,
  },
  {
    tipo: "vencimiento",
    titulo: "Vence un pago de Camila Benítez",
    desde: "2026-11-12",
    hasta: "2026-11-12",
    estado: "pendiente",
    viaje_id: idViajeCamila,
    pago_id: idPago,
    alerta_id: null,
    responsable_id: responsable,
  },
  {
    tipo: "alerta",
    titulo: "Pedir el pasaporte vigente",
    desde: "2026-11-12",
    hasta: "2026-11-12",
    estado: "pendiente",
    viaje_id: null,
    pago_id: null,
    alerta_id: idAlerta,
    responsable_id: responsable,
  },
  {
    tipo: "vencimiento",
    titulo: "Vence un pago de Joaquín Ramos",
    desde: "2026-11-20",
    hasta: "2026-11-20",
    estado: "vencido",
    viaje_id: idViajeRoma,
    pago_id: "11111111-2222-4333-8444-555555555503",
    alerta_id: null,
    responsable_id: responsable,
  },
  {
    tipo: "viaje",
    titulo: "Joaquín Ramos — Roma",
    desde: "2026-12-05",
    hasta: "2026-12-12",
    estado: "reservado",
    viaje_id: idViajeRoma,
    pago_id: null,
    alerta_id: null,
    responsable_id: responsable,
  },
];

/** `GET /api/calendario` con los eventos de arriba, filtrados por el rango y el tipo pedidos. */
function manejadorCalendario(pedidos: URLSearchParams[] = []) {
  return http.get("*/api/calendario", ({ request }) => {
    const q = new URL(request.url).searchParams;
    pedidos.push(q);
    const desde = q.get("desde");
    const hasta = q.get("hasta");
    const tipo = q.get("tipo");
    return HttpResponse.json(
      eventos.filter(
        (e) =>
          (!tipo || e.tipo === tipo) && (!desde || e.hasta >= desde) && (!hasta || e.desde <= hasta),
      ),
    );
  });
}

function Ubicacion() {
  return <p data-testid="ubicacion">{useLocation().pathname}</p>;
}

function renderCalendario() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/calendario"]}>
        <Routes>
          <Route path="/calendario" element={<PaginaCalendario cliente={cliente} />} />
          <Route path="*" element={<Ubicacion />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Los controles de vista pueden ser botones o pestañas: se buscan por nombre. */
const vista = (nombre: "Mes" | "Semana" | "Día") => {
  const patron = new RegExp(`^${nombre}$`, "i");
  return screen.queryAllByRole("tab", { name: patron }).length > 0
    ? screen.getByRole("tab", { name: patron })
    : screen.getByRole("button", { name: patron });
};
const siguiente = () => screen.getByRole("button", { name: /siguiente/i });
const anterior = () => screen.getByRole("button", { name: /anterior/i });
const enlaceDe = async (titulo: string) =>
  (await screen.findAllByRole("link", { name: new RegExp(titulo, "i") }))[0]!;

describe("RF-136 vistas del calendario", () => {
  it("abre en el mes en curso con los viajes, vencimientos y alertas del mes", async () => {
    servidor.use(manejadorCalendario());
    renderCalendario();

    expect(await screen.findAllByText(/Familia Sosa — Brasil/)).not.toHaveLength(0);
    expect(screen.getAllByText(/Vence un pago de Camila Benítez/)).not.toHaveLength(0);
    expect(screen.getAllByText(/Pedir el pasaporte vigente/)).not.toHaveLength(0);
    expect(screen.getByText(/noviembre/i)).toBeInTheDocument();
    expect(screen.queryByText(/Joaquín Ramos — Roma/)).not.toBeInTheDocument();
  });

  it("pide al backend el rango visible", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(manejadorCalendario(pedidos));
    renderCalendario();
    await screen.findAllByText(/Familia Sosa — Brasil/);

    const q = pedidos[0]!;
    expect(q.get("desde")! <= "2026-11-01").toBe(true);
    expect(q.get("hasta")! >= "2026-11-30").toBe(true);
  });

  it("la vista semana muestra solo los eventos de la semana del 9 al 15", async () => {
    servidor.use(manejadorCalendario());
    renderCalendario();
    await screen.findAllByText(/Familia Sosa — Brasil/);

    await userEvent.click(vista("Semana"));

    expect(await screen.findAllByText(/Pedir el pasaporte vigente/)).not.toHaveLength(0);
    expect(screen.getAllByText(/Familia Sosa — Brasil/)).not.toHaveLength(0);
    await waitFor(() =>
      expect(screen.queryByText(/Vence un pago de Joaquín Ramos/)).not.toBeInTheDocument(),
    );
  });

  it("la vista día muestra los eventos del día de hoy", async () => {
    servidor.use(manejadorCalendario());
    renderCalendario();
    await screen.findAllByText(/Familia Sosa — Brasil/);

    await userEvent.click(vista("Día"));

    expect(await screen.findAllByText(/Vence un pago de Camila Benítez/)).not.toHaveLength(0);
    expect(screen.getAllByText(/Pedir el pasaporte vigente/)).not.toHaveLength(0);
    await waitFor(() =>
      expect(screen.queryByText(/Vence un pago de Joaquín Ramos/)).not.toBeInTheDocument(),
    );
  });
});

describe("RF-137 navegación del calendario", () => {
  it("en la vista mes, siguiente lleva a diciembre y anterior vuelve a noviembre", async () => {
    servidor.use(manejadorCalendario());
    renderCalendario();
    await screen.findAllByText(/Familia Sosa — Brasil/);

    await userEvent.click(siguiente());

    expect(await screen.findAllByText(/Joaquín Ramos — Roma/)).not.toHaveLength(0);
    expect(screen.getByText(/diciembre/i)).toBeInTheDocument();
    expect(screen.queryByText(/Familia Sosa — Brasil/)).not.toBeInTheDocument();

    await userEvent.click(anterior());

    expect(await screen.findAllByText(/Familia Sosa — Brasil/)).not.toHaveLength(0);
    expect(screen.getByText(/noviembre/i)).toBeInTheDocument();
  });

  it("en la vista semana, siguiente avanza a la semana del 16 al 22", async () => {
    servidor.use(manejadorCalendario());
    renderCalendario();
    await screen.findAllByText(/Familia Sosa — Brasil/);
    await userEvent.click(vista("Semana"));
    await screen.findAllByText(/Pedir el pasaporte vigente/);

    await userEvent.click(siguiente());

    expect(await screen.findAllByText(/Vence un pago de Joaquín Ramos/)).not.toHaveLength(0);
    expect(screen.queryByText(/Pedir el pasaporte vigente/)).not.toBeInTheDocument();
  });

  it("en la vista día, siguiente avanza al 13 y deja de mostrar lo del 12", async () => {
    servidor.use(manejadorCalendario());
    renderCalendario();
    await screen.findAllByText(/Familia Sosa — Brasil/);
    await userEvent.click(vista("Día"));
    await screen.findAllByText(/Pedir el pasaporte vigente/);

    await userEvent.click(siguiente());

    expect(await screen.findAllByText(/Familia Sosa — Brasil/)).not.toHaveLength(0);
    expect(screen.queryByText(/Pedir el pasaporte vigente/)).not.toBeInTheDocument();
  });

  it("el botón Hoy vuelve al período en curso", async () => {
    servidor.use(manejadorCalendario());
    renderCalendario();
    await screen.findAllByText(/Familia Sosa — Brasil/);
    await userEvent.click(siguiente());
    await screen.findAllByText(/Joaquín Ramos — Roma/);

    await userEvent.click(screen.getByRole("button", { name: /hoy/i }));

    expect(await screen.findAllByText(/Familia Sosa — Brasil/)).not.toHaveLength(0);
  });
});

describe("RF-138 filtros y estado vacío", () => {
  it("filtra por tipo y deja solo las alertas", async () => {
    servidor.use(manejadorCalendario());
    renderCalendario();
    await screen.findAllByText(/Familia Sosa — Brasil/);

    await userEvent.selectOptions(screen.getByLabelText(/tipo/i), "alerta");

    await waitFor(() =>
      expect(screen.queryByText(/Familia Sosa — Brasil/)).not.toBeInTheDocument(),
    );
    expect(screen.queryByText(/Vence un pago de Camila Benítez/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Pedir el pasaporte vigente/)).not.toHaveLength(0);
  });

  it("filtra por estado en el cliente, sin volver a pedir al backend", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(manejadorCalendario(pedidos));
    renderCalendario();
    await screen.findAllByText(/Familia Sosa — Brasil/);
    const antes = pedidos.length;

    await userEvent.selectOptions(screen.getByLabelText(/estado/i), "vencido");

    expect(await screen.findAllByText(/Vence un pago de Joaquín Ramos/)).not.toHaveLength(0);
    expect(screen.queryByText(/Vence un pago de Camila Benítez/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Familia Sosa — Brasil/)).not.toBeInTheDocument();
    expect(pedidos).toHaveLength(antes);
    expect(pedidos.every((q) => !q.has("estado"))).toBe(true);
  });

  it("muestra el estado vacío cuando el período no tiene eventos", async () => {
    servidor.use(manejadorCalendario());
    renderCalendario();
    await screen.findAllByText(/Familia Sosa — Brasil/);
    await userEvent.click(vista("Día"));
    await screen.findAllByText(/Pedir el pasaporte vigente/);

    await userEvent.click(siguiente());
    await userEvent.click(siguiente());

    expect(await screen.findByText(/no hay eventos|sin eventos/i)).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando el filtro no deja nada", async () => {
    servidor.use(manejadorCalendario());
    renderCalendario();
    await screen.findAllByText(/Familia Sosa — Brasil/);

    await userEvent.selectOptions(screen.getByLabelText(/estado/i), "vencido");
    await userEvent.selectOptions(screen.getByLabelText(/tipo/i), "alerta");

    expect(await screen.findByText(/no hay eventos|sin eventos/i)).toBeInTheDocument();
  });
});

describe("RF-139 ir al detalle", () => {
  it("un viaje lleva a la ficha del viaje", async () => {
    servidor.use(manejadorCalendario());
    renderCalendario();

    await userEvent.click(await enlaceDe("Familia Sosa — Brasil"));

    expect(await screen.findByTestId("ubicacion")).toHaveTextContent(`/viajes/${idViajeBrasil}`);
  });

  it("un vencimiento de pago lleva a la ficha de su viaje", async () => {
    servidor.use(manejadorCalendario());
    renderCalendario();

    await userEvent.click(await enlaceDe("Vence un pago de Camila Benítez"));

    expect(await screen.findByTestId("ubicacion")).toHaveTextContent(`/viajes/${idViajeCamila}`);
  });

  it("una alerta lleva a la agenda", async () => {
    servidor.use(manejadorCalendario());
    renderCalendario();

    await userEvent.click(await enlaceDe("Pedir el pasaporte vigente"));

    expect(await screen.findByTestId("ubicacion")).toHaveTextContent(/^\/agenda/);
  });

  it("es de solo lectura: no ofrece acciones que modifiquen datos", async () => {
    servidor.use(manejadorCalendario());
    renderCalendario();
    await screen.findAllByText(/Familia Sosa — Brasil/);

    expect(
      screen.queryByRole("button", { name: /cobrar|resolver|cancelar|eliminar/i }),
    ).not.toBeInTheDocument();
  });
});
