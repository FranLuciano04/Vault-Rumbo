import { crearCliente, formatearImporte, type Reporte } from "@rumbo/shared";
import {
  crearServidor,
  manejadoresDashboardPara,
  reportesCatalogoMock,
  type RolMock,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { PaginaReportes } from "./PaginaReportes";

const servidor = crearServidor();
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
const crearObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:reporte");
let descargas: string[] = [];
beforeEach(() => {
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL: crearObjectURL, revokeObjectURL: vi.fn() }),
  );
  descargas = [];
  // jsdom no navega: se registra el nombre de archivo del enlace temporal.
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    descargas.push(this.download);
  });
});
afterEach(() => {
  servidor.resetHandlers();
  crearObjectURL.mockClear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
afterAll(() => {
  servidor.close();
});

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });

function renderReportes(rol: RolMock, ...extra: Parameters<typeof servidor.use>) {
  servidor.use(...extra, ...manejadoresDashboardPara(rol));
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/reportes"]}>
        <PaginaReportes cliente={cliente} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const plano = (texto: string | null) => (texto ?? "").replace(/\s+/g, " ");
const importe = (valor: string, moneda: "ARS" | "USD") => plano(formatearImporte(valor, moneda));

type Pedido = { id: string; q: URLSearchParams };

/** Registra los parámetros de cada `GET /api/reportes/:id` y sigue con el handler del mock. */
function registrarPedidos(pedidos: Pedido[]) {
  return http.get("*/api/reportes/:id", ({ params, request }) => {
    pedidos.push({ id: String(params["id"]), q: new URL(request.url).searchParams });
    return undefined;
  });
}

/** Un reporte con importes por moneda, margen y mes, como los manda el backend de T-123. */
const reporteFinanciero: Reporte = {
  id: "ganancia",
  nombre: "Ganancia y rentabilidad",
  desde: "2026-05-01",
  hasta: "2026-05-31",
  comparar_desde: null,
  comparar_hasta: null,
  columnas: [
    { clave: "mes", titulo: "Mes", tipo: "texto", moneda: null },
    { clave: "viajes", titulo: "Viajes", tipo: "entero", moneda: null },
    { clave: "ventas_ars", titulo: "Ventas (ARS)", tipo: "importe", moneda: "ARS" },
    { clave: "ventas_usd", titulo: "Ventas (USD)", tipo: "importe", moneda: "USD" },
    { clave: "margen_ars", titulo: "Margen (ARS)", tipo: "texto", moneda: null },
  ],
  filas: [
    {
      mes: "2026-05",
      viajes: 3,
      ventas_ars: "1234567.50",
      ventas_usd: "12400.00",
      margen_ars: "12.50",
    },
  ],
  filas_comparadas: null,
};

const problema = (status: number, title: string, detail: string) =>
  HttpResponse.json(
    { type: "about:blank", title, status, detail },
    { status, headers: { "content-type": "application/problem+json" } },
  );

/** Espera a que cargue el catálogo y devuelve el selector de reporte. */
async function selectorReporte() {
  const selector = await screen.findByLabelText("Reporte");
  await waitFor(() => {
    expect(within(selector).getAllByRole("option").length).toBeGreaterThan(0);
  });
  return selector;
}

describe("RF-131 reporte", () => {
  it("RF-131 lista el catálogo de reportes del backend", async () => {
    renderReportes("dueno");

    const selector = await selectorReporte();
    reportesCatalogoMock.forEach((r) => {
      expect(within(selector).getByRole("option", { name: r.nombre })).toBeInTheDocument();
    });
  });

  it("RF-131 el admin también ve el catálogo", async () => {
    renderReportes("admin");

    const selector = await selectorReporte();
    expect(
      within(selector).getByRole("option", { name: reportesCatalogoMock[0]?.nombre }),
    ).toBeInTheDocument();
  });

  it("RF-131 al elegir un reporte lo pide a la API y muestra sus columnas y filas", async () => {
    const pedidos: Pedido[] = [];
    renderReportes("dueno", registrarPedidos(pedidos));

    const selector = await selectorReporte();
    await userEvent.selectOptions(selector, "Ventas por destino");

    const tabla = await screen.findByRole("table", { name: /Ventas por destino/ });
    ["Destino", "Viajes", "Ventas (ARS)"].forEach((titulo) => {
      expect(within(tabla).getByRole("columnheader", { name: titulo })).toBeInTheDocument();
    });
    expect(within(tabla).getByRole("cell", { name: "Brasil" })).toBeInTheDocument();
    expect(within(tabla).getByRole("cell", { name: "Europa" })).toBeInTheDocument();
    expect(pedidos.at(-1)?.id).toBe("ventas-por-destino");
  });

  it("RF-131 por defecto el período es el mes en curso", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-12T15:00:00Z") });
    const pedidos: Pedido[] = [];
    renderReportes("dueno", registrarPedidos(pedidos));

    await selectorReporte();
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-11-01");
    expect(screen.getByLabelText("Hasta")).toHaveValue("2026-11-30");
    await screen.findByRole("table");
    expect(pedidos.at(-1)?.q.get("desde")).toBe("2026-11-01");
    expect(pedidos.at(-1)?.q.get("hasta")).toBe("2026-11-30");
    // sin comparación ni formato salvo que se pida
    expect(pedidos.at(-1)?.q.get("comparar_desde")).toBeNull();
    expect(pedidos.at(-1)?.q.get("formato")).toBeNull();
  });

  it("RF-131 cambiar el período vuelve a pedir el reporte con las nuevas fechas", async () => {
    const pedidos: Pedido[] = [];
    renderReportes("dueno", registrarPedidos(pedidos));
    await screen.findByRole("table");

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-09-30" } });

    await waitFor(() => {
      expect(pedidos.at(-1)?.q.get("desde")).toBe("2026-09-01");
      expect(pedidos.at(-1)?.q.get("hasta")).toBe("2026-09-30");
    });
  });

  it("RF-131 comparacion-mensual sin tocar las fechas no manda desde/hasta y muestra el período de la respuesta", async () => {
    const pedidos: Pedido[] = [];
    renderReportes(
      "dueno",
      http.get("*/api/reportes", () =>
        HttpResponse.json([
          { id: "comparacion-mensual", nombre: "Comparación mensual", descripcion: "Mes a mes." },
        ]),
      ),
      registrarPedidos(pedidos),
      http.get("*/api/reportes/:id", () =>
        HttpResponse.json({
          ...reporteFinanciero,
          id: "comparacion-mensual",
          desde: "2025-12-01",
          hasta: "2026-11-30",
        }),
      ),
    );

    await screen.findByRole("table");
    expect(pedidos.at(-1)?.q.has("desde")).toBe(false);
    expect(pedidos.at(-1)?.q.has("hasta")).toBe(false);
    expect(screen.getByLabelText("Desde")).toHaveValue("2025-12-01");
    expect(screen.getByLabelText("Hasta")).toHaveValue("2026-11-30");

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-01-01" } });
    await waitFor(() => {
      expect(pedidos.at(-1)?.q.get("desde")).toBe("2026-01-01");
    });
    expect(pedidos.at(-1)?.q.get("hasta")).toBe("2026-11-30");
  });

  it("RF-131 con una fecha vacía no pide el reporte con desde vacío y sigue mostrando la tabla", async () => {
    const pedidos: Pedido[] = [];
    renderReportes("dueno", registrarPedidos(pedidos));
    await screen.findByRole("table");

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "" } });
    await new Promise((resolver) => setTimeout(resolver, 50));

    expect(screen.getByLabelText("Desde")).toHaveValue("");
    expect(pedidos.every((p) => p.q.get("desde") !== "")).toBe(true);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Descargar Excel/ })).toBeDisabled();
  });

  it("RF-131 muestra el período del reporte en formato dd/mm/aa", async () => {
    renderReportes("dueno");

    await screen.findByRole("table");
    // el mock responde del 01/10/26 al 31/10/26
    expect(await screen.findByText(/01\/10\/26/)).toBeInTheDocument();
    expect(screen.getByText(/31\/10\/26/)).toBeInTheDocument();
  });

  it("RF-131 formatea los importes con la moneda de su columna, sin mezclar ARS y USD", async () => {
    renderReportes(
      "dueno",
      http.get("*/api/reportes/:id", () => HttpResponse.json(reporteFinanciero)),
    );

    const tabla = await screen.findByRole("table");
    const texto = plano(tabla.textContent);
    expect(texto).toContain(importe("1234567.50", "ARS"));
    expect(texto).toContain(importe("12400.00", "USD"));
    expect(texto).not.toContain(importe("1246967.50", "ARS"));
  });

  it("RF-131 muestra el margen como porcentaje y el mes como mm/aa", async () => {
    renderReportes(
      "dueno",
      http.get("*/api/reportes/:id", () => HttpResponse.json(reporteFinanciero)),
    );

    const tabla = await screen.findByRole("table");
    const celdas = within(tabla)
      .getAllByRole("cell")
      .map((c) => plano(c.textContent));
    expect(celdas).toContain("05/26");
    expect(celdas.some((c) => /^12,50\s?%$/.test(c))).toBe(true);
    expect(plano(tabla.textContent)).not.toContain("2026-05");
  });

  it("RF-131 un importe vacío (null) no rompe la tabla", async () => {
    renderReportes(
      "dueno",
      http.get("*/api/reportes/:id", () =>
        HttpResponse.json({
          ...reporteFinanciero,
          filas: [{ ...reporteFinanciero.filas[0], ventas_usd: null, margen_ars: null }],
        }),
      ),
    );

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("RF-131 sin datos en el período muestra un aviso y no una tabla vacía", async () => {
    renderReportes(
      "dueno",
      http.get("*/api/reportes/:id", () =>
        HttpResponse.json({ ...reporteFinanciero, filas: [], filas_comparadas: null }),
      ),
    );

    expect(await screen.findByText(/No hay datos para el período/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("RF-131 un 422 del período muestra el detalle y oculta la tabla anterior", async () => {
    renderReportes("dueno");
    await screen.findByRole("table");
    servidor.use(
      http.get("*/api/reportes/:id", () =>
        problema(422, "Datos inválidos", "Desde no puede ser posterior a Hasta."),
      ),
    );

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-10-30" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-10-01" } });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Desde no puede ser posterior a Hasta.",
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("RF-131 un 403 muestra el detalle del permiso y no el reporte", async () => {
    renderReportes(
      "empleado",
      http.get("*/api/reportes", () =>
        problema(403, "Sin permiso", "Tu rol no permite esta acción."),
      ),
      http.get("*/api/reportes/:id", () =>
        problema(403, "Sin permiso", "Tu rol no permite esta acción."),
      ),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Tu rol no permite esta acción.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("RF-134 comparar", () => {
  async function activarComparacion() {
    await screen.findByRole("table");
    await userEvent.click(screen.getByRole("checkbox", { name: /Comparar con otro período/i }));
  }

  it("RF-134 sin activar la comparación no se muestra el período comparado ni se pide", async () => {
    const pedidos: Pedido[] = [];
    renderReportes("dueno", registrarPedidos(pedidos));

    await screen.findByRole("table");
    expect(screen.queryByLabelText("Comparar desde")).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: /Período comparado/i })).not.toBeInTheDocument();
    expect(pedidos.every((p) => p.q.get("comparar_desde") === null)).toBe(true);
  });

  it("RF-134 al activar la comparación pide el otro período y muestra su tabla", async () => {
    const pedidos: Pedido[] = [];
    renderReportes("dueno", registrarPedidos(pedidos));
    await activarComparacion();

    fireEvent.change(screen.getByLabelText("Comparar desde"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Comparar hasta"), { target: { value: "2026-09-30" } });

    await waitFor(() => {
      expect(pedidos.at(-1)?.q.get("comparar_desde")).toBe("2026-09-01");
      expect(pedidos.at(-1)?.q.get("comparar_hasta")).toBe("2026-09-30");
    });
    const comparada = await screen.findByRole("table", { name: /Período comparado/i });
    // datos del mes anterior del mock
    expect(plano(comparada.textContent)).toContain(importe("2900000.00", "ARS"));
    expect(plano(comparada.textContent)).toContain(importe("1300000.00", "ARS"));
    expect(within(comparada).getByRole("columnheader", { name: "Destino" })).toBeInTheDocument();
    // la tabla del período principal sigue visible
    expect(screen.getByRole("table", { name: /Período principal/i })).toBeInTheDocument();
  });

  it("RF-134 muestra las fechas del período comparado en dd/mm/aa", async () => {
    renderReportes("dueno");
    await activarComparacion();

    fireEvent.change(screen.getByLabelText("Comparar desde"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Comparar hasta"), { target: { value: "2026-09-30" } });

    expect(await screen.findByText(/01\/09\/26/)).toBeInTheDocument();
    expect(screen.getByText(/30\/09\/26/)).toBeInTheDocument();
  });

  it("RF-134 un reporte que no se compara (filas_comparadas null) avisa y no muestra la segunda tabla", async () => {
    renderReportes(
      "dueno",
      http.get("*/api/reportes/:id", () =>
        HttpResponse.json({ ...reporteFinanciero, id: "pagos-operadores", filas_comparadas: null }),
      ),
    );
    await activarComparacion();

    fireEvent.change(screen.getByLabelText("Comparar desde"), { target: { value: "2026-04-01" } });
    fireEvent.change(screen.getByLabelText("Comparar hasta"), { target: { value: "2026-04-30" } });

    expect(await screen.findByText(/no admite comparación/i)).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: /Período comparado/i })).not.toBeInTheDocument();
    expect(screen.getByRole("table", { name: /Período principal/i })).toBeInTheDocument();
  });

  it("RF-134 el período comparado sin datos muestra un aviso propio", async () => {
    renderReportes(
      "dueno",
      http.get("*/api/reportes/:id", () =>
        HttpResponse.json({
          ...reporteFinanciero,
          comparar_desde: "2026-04-01",
          comparar_hasta: "2026-04-30",
          filas_comparadas: [],
        }),
      ),
    );
    await activarComparacion();

    fireEvent.change(screen.getByLabelText("Comparar desde"), { target: { value: "2026-04-01" } });
    fireEvent.change(screen.getByLabelText("Comparar hasta"), { target: { value: "2026-04-30" } });

    expect(await screen.findByText(/No hay datos en el período comparado/i)).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /Período principal/i })).toBeInTheDocument();
  });

  it("RF-134 desactivar la comparación quita la tabla comparada y deja de pedirla", async () => {
    const pedidos: Pedido[] = [];
    renderReportes("dueno", registrarPedidos(pedidos));
    await activarComparacion();
    fireEvent.change(screen.getByLabelText("Comparar desde"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Comparar hasta"), { target: { value: "2026-09-30" } });
    await screen.findByRole("table", { name: /Período comparado/i });

    await userEvent.click(screen.getByRole("checkbox", { name: /Comparar con otro período/i }));

    await waitFor(() => {
      expect(screen.queryByRole("table", { name: /Período comparado/i })).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(pedidos.at(-1)?.q.get("comparar_desde")).toBeNull();
    });
  });

  it("RF-134 un 422 al comparar muestra el detalle", async () => {
    renderReportes("dueno");
    await activarComparacion();
    servidor.use(
      http.get("*/api/reportes/:id", () =>
        problema(422, "Datos inválidos", "Comparar desde no puede ser posterior a Comparar hasta."),
      ),
    );

    fireEvent.change(screen.getByLabelText("Comparar desde"), { target: { value: "2026-09-30" } });
    fireEvent.change(screen.getByLabelText("Comparar hasta"), { target: { value: "2026-09-01" } });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Comparar desde no puede ser posterior a Comparar hasta.",
    );
  });
});

describe("RF-133 exportar", () => {
  it.each([
    ["Excel", "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ["PDF", "pdf", "application/pdf"],
  ])("RF-133 descarga el reporte en %s con el período elegido", async (boton, formato, tipo) => {
    const pedidos: Pedido[] = [];
    renderReportes("dueno", registrarPedidos(pedidos));
    await screen.findByRole("table");
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-09-30" } });
    await waitFor(() => {
      expect(pedidos.at(-1)?.q.get("desde")).toBe("2026-09-01");
    });

    await userEvent.click(screen.getByRole("button", { name: new RegExp(`Descargar ${boton}`) }));

    await waitFor(() => {
      expect(crearObjectURL).toHaveBeenCalledTimes(1);
    });
    const archivo = crearObjectURL.mock.calls[0]?.[0];
    expect(archivo).toBeInstanceOf(Blob);
    expect(archivo?.type).toBe(tipo);
    expect(descargas).toHaveLength(1);
    expect(descargas[0]).toMatch(new RegExp(`\\.${formato}$`));
    const pedido = pedidos.at(-1);
    expect(pedido?.q.get("formato")).toBe(formato);
    expect(pedido?.q.get("desde")).toBe("2026-09-01");
    expect(pedido?.q.get("hasta")).toBe("2026-09-30");
  });

  it("RF-133 un error al descargar se muestra sin tirar la pantalla", async () => {
    renderReportes("dueno");
    await screen.findByRole("table");
    servidor.use(
      http.get("*/api/reportes/:id", ({ request }) =>
        new URL(request.url).searchParams.get("formato")
          ? problema(500, "Error", "No se pudo generar el archivo.")
          : undefined,
      ),
    );

    await userEvent.click(screen.getByRole("button", { name: /Descargar Excel/ }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(crearObjectURL).not.toHaveBeenCalled();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
