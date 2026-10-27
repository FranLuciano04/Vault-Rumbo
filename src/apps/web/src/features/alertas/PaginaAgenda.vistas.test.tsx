import { crearCliente } from "@rumbo/shared";
import {
  alertasMock,
  crearServidor,
  manejadoresAlertas,
  usuariosPorRol,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { PaginaAgenda } from "./PaginaAgenda";

const servidor = crearServidor(...manejadoresAlertas);
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
const HOY_ISO = "2026-10-25";
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

const plantilla = alertasMock[1]!;
const crear = (prefijo: string, estado: "pendiente" | "vista", cantidad: number) =>
  Array.from({ length: cantidad }, (_, i) => ({
    ...plantilla,
    id: `00000000-0000-4000-8000-${estado === "vista" ? "1" : "2"}${String(i + 1).padStart(11, "0")}`,
    descripcion: `${prefijo} ${String(i + 1)}`,
    fecha: HOY_ISO,
    estado,
  }));

/** GET /api/alertas paginado de verdad (por `pagina` y `por_pagina`); registra los pedidos de vistas. */
function servidorPaginado(pendientes: number, vistas: number, pedidosVistas: URLSearchParams[]) {
  const pool = {
    pendiente: crear("Pendiente", "pendiente", pendientes),
    vista: crear("Vista", "vista", vistas),
  };
  servidor.use(
    http.get("*/api/alertas", ({ request }) => {
      const p = new URL(request.url).searchParams;
      const estado = p.get("estado") === "vista" ? "vista" : "pendiente";
      if (estado === "vista") pedidosVistas.push(p);
      const pagina = Number(p.get("pagina") ?? 1);
      const porPagina = Number(p.get("por_pagina") ?? 20);
      const hasta = p.get("hasta");
      const desde = p.get("desde");
      const filtradas =
        p.get("proximas") === "true"
          ? []
          : pool[estado].filter((a) => (!hasta || a.fecha <= hasta) && (!desde || a.fecha >= desde));
      const inicio = (pagina - 1) * porPagina;
      return HttpResponse.json({
        items: filtradas.slice(inicio, inicio + porPagina),
        total: filtradas.length,
        pagina,
        por_pagina: porPagina,
      });
    }),
  );
}

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

describe("RF-074 RF-076 agenda: paginación con «Mostrar vistas»", { timeout: 30000 }, () => {
  it("RF-074 sin pendientes y con 101 vistas, «Mostrar vistas» ofrece «Siguiente» y la página 2 trae la vista 101", async () => {
    servidorPaginado(0, 101, []);
    const usuario = userEvent.setup();
    renderAgenda();
    await screen.findByText(/Tenés 101 alertas vistas sin resolver/);

    await usuario.click(screen.getByRole("switch", { name: "Mostrar vistas" }));
    expect(await screen.findByText("Vista 1")).toBeInTheDocument();

    const siguiente = await screen.findByRole("button", { name: "Siguiente" });
    expect(siguiente).toBeEnabled();
    await usuario.click(siguiente);

    expect(await screen.findByText("Vista 101")).toBeInTheDocument();
    expect(screen.queryByText("Vista 1")).not.toBeInTheDocument();
  });

  it("RF-076 una vista de la página 2 se puede resolver", async () => {
    servidorPaginado(0, 101, []);
    const usuario = userEvent.setup();
    renderAgenda();
    await screen.findByText(/Tenés 101 alertas vistas sin resolver/);

    await usuario.click(screen.getByRole("switch", { name: "Mostrar vistas" }));
    await usuario.click(await screen.findByRole("button", { name: "Siguiente" }));
    await screen.findByText("Vista 101");

    expect(screen.getByRole("button", { name: /^Ver detalle/ })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: /^Resolver/ }));

    expect(await screen.findByRole("button", { name: /^Deshacer: Vista 101/ })).toBeInTheDocument();
    expect(screen.queryByText("Vista 101")).not.toBeInTheDocument();
  });

  it("RF-074 con pendientes en 2 páginas, la página 2 pide las vistas con pagina=2 y no repite las de la página 1", async () => {
    const pedidosVistas: URLSearchParams[] = [];
    servidorPaginado(101, 101, pedidosVistas);
    const usuario = userEvent.setup();
    renderAgenda();
    await screen.findByText("Pendiente 1");

    await usuario.click(screen.getByRole("switch", { name: "Mostrar vistas" }));
    expect(await screen.findByText("Vista 1")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText("Pendiente 101")).toBeInTheDocument();
    expect(await screen.findByText("Vista 101")).toBeInTheDocument();
    expect(screen.queryByText("Vista 1")).not.toBeInTheDocument();
    expect(pedidosVistas.some((p) => p.get("pagina") === "2")).toBe(true);
  });
});
