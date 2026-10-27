import { crearCliente } from "@rumbo/shared";
import {
  alertasMock,
  crearServidor,
  manejadoresAlertas,
  usuariosPorRol,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { PaginaAgenda } from "./PaginaAgenda";
import { ESPERA_DESHACER_MS } from "./useResolverConDeshacer";

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

const plantilla = alertasMock[1] as (typeof alertasMock)[number];
const crear = (prefijo: string, estado: "pendiente" | "vista", cantidad: number) =>
  Array.from({ length: cantidad }, (_, i) => ({
    ...plantilla,
    id: `00000000-0000-4000-8000-${estado === "vista" ? "1" : "2"}${String(i + 1).padStart(11, "0")}`,
    descripcion: `${prefijo} ${String(i + 1)}`,
    fecha: HOY_ISO,
    estado,
  }));

/** GET /api/alertas paginado de verdad (por `pagina` y `por_pagina`); registra los pedidos de vistas. */
function servidorPaginado(
  pendientes: number,
  vistas: number,
  pedidosVistas: URLSearchParams[],
  demoraVistasPagina2 = 0,
) {
  const pool = {
    pendiente: crear("Pendiente", "pendiente", pendientes),
    vista: crear("Vista", "vista", vistas),
  };
  servidor.use(
    http.post("*/api/alertas/:id/resolver", ({ params }) => {
      const posicion = pool.vista.findIndex((a) => a.id === params["id"]);
      return HttpResponse.json({ ...pool.vista.splice(posicion, 1)[0], estado: "resuelta" });
    }),
    http.get("*/api/alertas", async ({ request }) => {
      const p = new URL(request.url).searchParams;
      const estado = p.get("estado") === "vista" ? "vista" : "pendiente";
      if (estado === "vista") pedidosVistas.push(p);
      const pagina = Number(p.get("pagina") ?? 1);
      if (estado === "vista" && pagina === 2) await delay(demoraVistasPagina2);
      const porPagina = Number(p.get("por_pagina") ?? 20);
      const hasta = p.get("hasta");
      const desde = p.get("desde");
      const filtradas =
        p.get("proximas") === "true"
          ? []
          : pool[estado].filter(
              (a) => (!hasta || a.fecha <= hasta) && (!desde || a.fecha >= desde),
            );
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
    expect(screen.getByText("Página 1 de 2: mostrando 100 de 101 alertas")).toBeInTheDocument();

    const siguiente = await screen.findByRole("button", { name: "Siguiente" });
    expect(siguiente).toBeEnabled();
    await usuario.click(siguiente);

    expect(await screen.findByText("Vista 101")).toBeInTheDocument();
    expect(screen.queryByText("Vista 1")).not.toBeInTheDocument();
    expect(screen.getByText("Página 2 de 2: mostrando 1 de 101 alertas")).toBeInTheDocument();
  });

  it("RF-074 mientras llegan las vistas de la página 2 (las pendientes ya vinieron con total 0), no retrocede", async () => {
    servidorPaginado(0, 101, [], 400);
    const usuario = userEvent.setup();
    renderAgenda();
    await screen.findByText(/Tenés 101 alertas vistas sin resolver/);
    await usuario.click(screen.getByRole("switch", { name: "Mostrar vistas" }));
    await usuario.click(await screen.findByRole("button", { name: "Siguiente" }));

    await new Promise((listo) => setTimeout(listo, 250));
    expect(screen.queryByText("Vista 1")).not.toBeInTheDocument();
    expect(await screen.findByText("Vista 101")).toBeInTheDocument();
    expect(screen.getByText(/^Página 2 de 2/)).toBeInTheDocument();
  });

  it("RF-074 con «Mostrar vistas» apagado, sin pendientes y con 101 vistas, no hay paginación", async () => {
    servidorPaginado(0, 101, []);
    renderAgenda();
    await screen.findByText(/Tenés 101 alertas vistas sin resolver/);

    expect(screen.queryByRole("button", { name: "Siguiente" })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Página \d+ de/)).not.toBeInTheDocument();
  });

  it("RF-074 al apagar «Mostrar vistas» en una página posterior a la última de pendientes, retrocede", async () => {
    servidorPaginado(0, 101, []);
    const usuario = userEvent.setup();
    renderAgenda();
    await screen.findByText(/Tenés 101 alertas vistas sin resolver/);
    const interruptor = screen.getByRole("switch", { name: "Mostrar vistas" });
    await usuario.click(interruptor);
    await usuario.click(await screen.findByRole("button", { name: "Siguiente" }));
    await screen.findByText("Vista 101");

    await usuario.click(interruptor);

    expect(await screen.findByText(/Tenés 101 alertas vistas sin resolver/)).toBeInTheDocument();
    expect(screen.queryByText(/^Página \d+ de/)).not.toBeInTheDocument();
    expect(screen.queryByText("¡Estás al día!")).not.toBeInTheDocument();
  });

  it("RF-076 al resolver la única vista de la última página, pasa a la página anterior", async () => {
    servidorPaginado(0, 101, []);
    const usuario = userEvent.setup();
    renderAgenda();
    await screen.findByText(/Tenés 101 alertas vistas sin resolver/);
    await usuario.click(screen.getByRole("switch", { name: "Mostrar vistas" }));
    await usuario.click(await screen.findByRole("button", { name: "Siguiente" }));
    await screen.findByText("Vista 101");

    await usuario.click(screen.getByRole("button", { name: /^Resolver/ }));
    await screen.findByRole("button", { name: /^Deshacer: Vista 101/ });
    // Mientras espera el envío, la página vacía no dice «¡Estás al día!».
    expect(screen.queryByText("¡Estás al día!")).not.toBeInTheDocument();

    expect(
      await screen.findByText("Vista 1", {}, { timeout: ESPERA_DESHACER_MS + 5_000 }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/^Página \d+ de/)).not.toBeInTheDocument();
    });
  });

  it("RF-074 si falla la consulta de vistas en una página posterior a la última de pendientes, vuelve a la anterior", async () => {
    servidorPaginado(0, 101, []);
    servidor.use(
      http.get("*/api/alertas", ({ request }) => {
        const p = new URL(request.url).searchParams;
        if (p.get("estado") === "vista" && p.get("pagina") === "2") {
          return new HttpResponse(null, { status: 500 });
        }
        return undefined;
      }),
    );
    const usuario = userEvent.setup();
    renderAgenda();
    await screen.findByText(/Tenés 101 alertas vistas sin resolver/);
    await usuario.click(screen.getByRole("switch", { name: "Mostrar vistas" }));
    await screen.findByText("Vista 1");

    await usuario.click(await screen.findByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText("Vista 1")).toBeInTheDocument();
    expect(await screen.findByText(/^Página 1 de 2/)).toBeInTheDocument();
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
