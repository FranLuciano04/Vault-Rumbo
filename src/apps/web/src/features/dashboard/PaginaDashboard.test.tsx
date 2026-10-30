import { crearCliente, formatearImporte } from "@rumbo/shared";
import {
  crearServidor,
  dashboardMock,
  manejadoresDashboardPara,
  usuariosPorRol,
  type RolMock,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { PaginaDashboard } from "./PaginaDashboard";

const servidor = crearServidor();
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

function Ubicacion() {
  return <p data-testid="ubicacion">{useLocation().pathname}</p>;
}

/** Monta la pantalla en `/dashboard` con los handlers del rol y deja ver a dónde navega. */
function renderDashboard(rol: RolMock, ...extra: Parameters<typeof servidor.use>) {
  servidor.use(...extra, ...manejadoresDashboardPara(rol));
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={<PaginaDashboard cliente={cliente} usuario={usuariosPorRol[rol]} />}
          />
          <Route path="*" element={<Ubicacion />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Registra los parámetros de cada `GET /api/dashboard` y sigue con el handler del mock. */
function registrarPedidos(pedidos: URLSearchParams[]) {
  return http.get("*/api/dashboard", ({ request }) => {
    pedidos.push(new URL(request.url).searchParams);
    return undefined;
  });
}

const plano = (texto: string | null) => (texto ?? "").replace(/\s+/g, " ");
const importe = (valor: string, moneda: "ARS" | "USD") => plano(formatearImporte(valor, moneda));

/** Espera a que cargue el tablero y devuelve la tarjeta (un enlace) de un indicador. */
async function tarjeta(nombre: RegExp) {
  return screen.findByRole("link", { name: nombre });
}

describe("RF-123 embudo", () => {
  it("RF-123 muestra el embudo con la cantidad de oportunidades de cada etapa", async () => {
    renderDashboard("dueno");

    const embudo = await screen.findByRole("region", { name: "Embudo de ventas" });
    const esperado: [string, string][] = [
      ["Nueva", "4"],
      ["En gestión", "6"],
      ["Cotizada", "5"],
      ["Ganada", "3"],
      ["Perdida", "2"],
    ];
    const filas = within(embudo).getAllByRole("listitem");
    expect(filas).toHaveLength(5);
    esperado.forEach(([etapa, cantidad], i) => {
      expect(filas[i]).toHaveTextContent(etapa);
      expect(filas[i]).toHaveTextContent(new RegExp(`\\b${cantidad}\\b`));
    });
  });

  it("RF-123 muestra la tasa de conversión como porcentaje", async () => {
    renderDashboard("dueno");

    const embudo = await screen.findByRole("region", { name: "Embudo de ventas" });
    expect(within(embudo).getByText(/Conversión 60\s?%/)).toBeInTheDocument();
  });

  it("RF-123 con el período sin actividad muestra el embudo en cero", async () => {
    renderDashboard(
      "dueno",
      http.get("*/api/dashboard", () =>
        HttpResponse.json({
          ...dashboardMock,
          embudo: {
            etapas: dashboardMock.embudo.etapas.map((e) => ({ ...e, cantidad: 0 })),
            tasa_conversion: "0.0000",
          },
        }),
      ),
    );

    const embudo = await screen.findByRole("region", { name: "Embudo de ventas" });
    expect(within(embudo).getByText(/Conversión 0\s?%/)).toBeInTheDocument();
    within(embudo)
      .getAllByRole("listitem")
      .forEach((fila) => expect(fila).toHaveTextContent(/\b0\b/));
  });
});

describe("RF-124 indicadores", () => {
  it("RF-124 muestra las tarjetas de ventas, ganancia, cobrado y a pagar a operadores en ARS", async () => {
    renderDashboard("dueno");

    expect(plano((await tarjeta(/Ventas del mes/)).textContent)).toContain(
      importe("5400000.00", "ARS"),
    );
    expect(plano((await tarjeta(/Ganancia estimada/)).textContent)).toContain(
      importe("1080000.00", "ARS"),
    );
    const cobrado = plano((await tarjeta(/Cobrado a pasajeros/)).textContent);
    expect(cobrado).toContain(importe("2700000.00", "ARS"));
    expect(plano((await tarjeta(/A pagar a operadores/)).textContent)).toContain(
      importe("1900000.00", "ARS"),
    );
  });

  it("RF-124 la tarjeta de cobrado muestra también lo pendiente de cobrar", async () => {
    renderDashboard("dueno");

    const texto = plano((await tarjeta(/Cobrado a pasajeros/)).textContent);
    expect(texto).toMatch(/Pendiente de cobrar/);
    expect(texto).toContain(importe("2700000.00", "ARS"));
  });

  it("RF-124 muestra la comisión y el ticket promedio", async () => {
    renderDashboard("dueno");

    await tarjeta(/Ventas del mes/);
    expect(plano(document.body.textContent)).toContain(importe("108000.00", "ARS"));
    expect(plano(document.body.textContent)).toContain(importe("1800000.00", "ARS"));
  });

  it("RF-124 muestra el USD aparte del ARS, sin convertir", async () => {
    renderDashboard(
      "dueno",
      http.get("*/api/dashboard", () =>
        HttpResponse.json({
          ...dashboardMock,
          ventas: [
            { moneda: "ARS", monto: "5400000.00" },
            { moneda: "USD", monto: "12400.00" },
          ],
          cobrado: [
            { moneda: "ARS", monto: "2700000.00" },
            { moneda: "USD", monto: "3000.00" },
          ],
        }),
      ),
    );

    const ventas = plano((await tarjeta(/Ventas del mes/)).textContent);
    expect(ventas).toContain(importe("5400000.00", "ARS"));
    expect(ventas).toContain(importe("12400.00", "USD"));
    const cobrado = plano((await tarjeta(/Cobrado a pasajeros/)).textContent);
    expect(cobrado).toContain(importe("2700000.00", "ARS"));
    expect(cobrado).toContain(importe("3000.00", "USD"));
    // nunca un total mezclado
    expect(ventas).not.toContain(importe("5412400.00", "ARS"));
  });

  it("RF-124 un indicador sin importes muestra cero en lugar de romper", async () => {
    renderDashboard(
      "dueno",
      http.get("*/api/dashboard", () =>
        HttpResponse.json({ ...dashboardMock, ventas: [], cobrado: [], comisiones: [] }),
      ),
    );

    const ventas = await tarjeta(/Ventas del mes/);
    expect(plano(ventas.textContent)).toContain(importe("0.00", "ARS"));
  });
});

describe("RF-125 y RF-128 indicadores operativos vacíos", () => {
  it("RF-125 tolera los vencimientos, viajes próximos, destinos y ranking vacíos", async () => {
    renderDashboard(
      "dueno",
      http.get("*/api/dashboard", () =>
        HttpResponse.json({
          ...dashboardMock,
          proximos_vencimientos: [],
          viajes_proximos: [],
          destinos_mas_vendidos: [],
          ventas_por_vendedor: [],
          consultas_pendientes: 0,
          presupuestos_abiertos: 0,
          reservas_confirmadas: 0,
          alertas_pendientes: 0,
        }),
      ),
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "Embudo de ventas" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("RF-128 tolera las ventas mensuales vacías", async () => {
    renderDashboard(
      "dueno",
      http.get("*/api/dashboard", () =>
        HttpResponse.json({ ...dashboardMock, ventas_mensuales: [] }),
      ),
    );

    expect(await screen.findByRole("region", { name: "Embudo de ventas" })).toBeInTheDocument();
    expect(await tarjeta(/Ventas del mes/)).toBeInTheDocument();
  });
});

describe("RF-127 filtros", () => {
  it("RF-127 pide el dashboard sin filtros al abrir", async () => {
    const pedidos: URLSearchParams[] = [];
    renderDashboard("dueno", registrarPedidos(pedidos));

    await screen.findByRole("region", { name: "Embudo de ventas" });
    expect(pedidos[0]?.get("desde")).toBeNull();
    expect(pedidos[0]?.get("hasta")).toBeNull();
    expect(pedidos[0]?.get("responsable_id")).toBeNull();
  });

  it("RF-127 filtra por período con Desde y Hasta", async () => {
    const pedidos: URLSearchParams[] = [];
    renderDashboard("empleado", registrarPedidos(pedidos));
    await screen.findByRole("region", { name: "Embudo de ventas" });

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-09-30" } });

    await waitFor(() => {
      const ultimo = pedidos.at(-1);
      expect(ultimo?.get("desde")).toBe("2026-09-01");
      expect(ultimo?.get("hasta")).toBe("2026-09-30");
    });
  });

  it("RF-127 el admin filtra por responsable", async () => {
    const pedidos: URLSearchParams[] = [];
    renderDashboard("admin", registrarPedidos(pedidos));
    await screen.findByRole("region", { name: "Embudo de ventas" });

    await userEvent.selectOptions(
      screen.getByLabelText("Responsable"),
      usuariosPorRol.empleado.nombre,
    );

    await waitFor(() =>
      expect(pedidos.at(-1)?.get("responsable_id")).toBe(usuariosPorRol.empleado.id),
    );
  });

  it("RF-127 el dueño filtra por responsable y puede volver a toda la agencia", async () => {
    const pedidos: URLSearchParams[] = [];
    renderDashboard("dueno", registrarPedidos(pedidos));
    await screen.findByRole("region", { name: "Embudo de ventas" });
    const selector = screen.getByLabelText("Responsable");

    await userEvent.selectOptions(selector, usuariosPorRol.freelance.nombre);
    await waitFor(() =>
      expect(pedidos.at(-1)?.get("responsable_id")).toBe(usuariosPorRol.freelance.id),
    );

    await userEvent.selectOptions(selector, "Toda la agencia");
    await waitFor(() => expect(pedidos.at(-1)?.get("responsable_id")).toBeNull());
  });

  it.each<RolMock>(["empleado", "freelance"])(
    "RF-127 el %s no tiene filtro por responsable y no lo manda",
    async (rol) => {
      const pedidos: URLSearchParams[] = [];
      renderDashboard(rol, registrarPedidos(pedidos));
      await screen.findByRole("region", { name: "Embudo de ventas" });

      expect(screen.queryByLabelText("Responsable")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Desde")).toBeInTheDocument();
      expect(pedidos.every((p) => p.get("responsable_id") === null)).toBe(true);
    },
  );
});

describe("RF-129 vista por rol", () => {
  it.each<RolMock>(["admin", "dueno"])(
    "RF-129 el %s ve toda la agencia: ganancia, a pagar a operadores y ventas por vendedor",
    async (rol) => {
      renderDashboard(rol);

      expect(await tarjeta(/Ganancia estimada/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /A pagar a operadores/ })).toBeInTheDocument();
      const ranking = screen.getByRole("region", { name: "Ventas por vendedor" });
      expect(within(ranking).getByText(usuariosPorRol.empleado.nombre)).toBeInTheDocument();
      expect(within(ranking).getByText(usuariosPorRol.freelance.nombre)).toBeInTheDocument();
      expect(screen.getByText("Toda la agencia")).toBeInTheDocument();
    },
  );

  it.each<RolMock>(["empleado", "freelance"])(
    "RF-129 el %s ve lo suyo: su comisión, sus cobros y sus viajes, sin ganancia de la agencia ni deuda con operadores",
    async (rol) => {
      renderDashboard(rol);

      const comision = await tarjeta(/Tu comisión del mes/);
      expect(plano(comision.textContent)).toContain(importe("108000.00", "ARS"));
      expect(screen.getByRole("link", { name: /Cobrado a tus pasajeros/ })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Tus viajes activos/ })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /Ganancia estimada/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /A pagar a operadores/ })).not.toBeInTheDocument();
    },
  );

  it.each<RolMock>(["empleado", "freelance"])(
    "RF-129 el %s no ve las ventas de otros vendedores",
    async (rol) => {
      renderDashboard(rol);

      await tarjeta(/Tu comisión del mes/);
      const otro = rol === "empleado" ? usuariosPorRol.freelance : usuariosPorRol.empleado;
      expect(screen.queryByText(otro.nombre)).not.toBeInTheDocument();
      expect(screen.queryByText("Toda la agencia")).not.toBeInTheDocument();
    },
  );

  it("RF-129 las ventas llevan a la lista de viajes", async () => {
    renderDashboard("dueno");

    await userEvent.click(await tarjeta(/Ventas del mes/));

    expect(await screen.findByTestId("ubicacion")).toHaveTextContent("/viajes");
  });

  it("RF-129 lo cobrado lleva a la lista de viajes", async () => {
    renderDashboard("dueno");

    await userEvent.click(await tarjeta(/Cobrado a pasajeros/));

    expect(await screen.findByTestId("ubicacion")).toHaveTextContent("/viajes");
  });

  it("RF-129 una etapa del embudo lleva a las oportunidades", async () => {
    renderDashboard("dueno");
    const embudo = await screen.findByRole("region", { name: "Embudo de ventas" });

    await userEvent.click(within(embudo).getByRole("link", { name: /Cotizada/ }));

    expect(await screen.findByTestId("ubicacion")).toHaveTextContent("/oportunidades");
  });

  it("RF-129 las alertas llevan a la agenda del día", async () => {
    renderDashboard("dueno");

    await userEvent.click(await screen.findByRole("link", { name: /Alertas/ }));

    expect(await screen.findByTestId("ubicacion")).toHaveTextContent("/agenda");
  });
});
