import { crearCliente, type ContenidoRed } from "@rumbo/shared";
import { contenidosMock, crearServidor } from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarioContenido } from "./CalendarioContenido";

const servidor = crearServidor();
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
beforeEach(() => {
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
const plantilla = contenidosMock[0] as ContenidoRed;
const POR_PAGINA = 100;

/** Pieza número `n` (1 a `total`): las primeras 100 caen del 1 al 29; la 101 cae el día 30. */
function pieza(n: number): ContenidoRed {
  const dia = n === 101 ? 30 : ((n - 1) % 29) + 1;
  return {
    ...plantilla,
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    titulo: n === 101 ? "Pieza del último día" : `Pieza ${String(n)}`,
    canal: "instagram",
    estado_kanban: "listo",
    fecha_publicacion: `2026-11-${String(dia).padStart(2, "0")}`,
  };
}

interface Pedido {
  pagina: string | null;
  desde: string | null;
  canal: string | null;
}

/** Simula un mes con `total` piezas paginadas de a 100 y registra cada pedido. */
function simularMes(
  total: number,
  opciones: { fallaPagina2?: boolean; frenarPagina2?: Promise<void> } = {},
) {
  const pedidos: Pedido[] = [];
  servidor.use(
    http.get("*/api/contenidos", async ({ request }) => {
      const url = new URL(request.url);
      const pagina = Number(url.searchParams.get("pagina") ?? "1");
      pedidos.push({
        pagina: url.searchParams.get("pagina"),
        desde: url.searchParams.get("desde"),
        canal: url.searchParams.get("canal"),
      });
      if (pagina === 2 && opciones.frenarPagina2) await opciones.frenarPagina2;
      if (pagina === 2 && opciones.fallaPagina2) {
        return HttpResponse.json({ title: "Error interno", status: 500 }, { status: 500 });
      }
      const desde = (pagina - 1) * POR_PAGINA + 1;
      const hasta = Math.min(pagina * POR_PAGINA, total);
      const items = Array.from({ length: Math.max(0, hasta - desde + 1) }, (_, i) =>
        pieza(desde + i),
      );
      return HttpResponse.json({ items, total, pagina, por_pagina: POR_PAGINA });
    }),
  );
  return pedidos;
}

function renderCalendario(canal?: "instagram" | "tiktok") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui = (c?: "instagram" | "tiktok") => (
    <QueryClientProvider client={queryClient}>
      <CalendarioContenido cliente={cliente} hoy="2026-11-12" canal={c} alSinAcceso={() => {}} />
    </QueryClientProvider>
  );
  return { ...render(ui(canal)), ui };
}

const paginasPedidas = (pedidos: Pedido[]) => pedidos.map((p) => p.pagina);

describe("RF-116 H-01 calendario con más de una página de piezas", () => {
  it("RF-116 H-01 con 101 piezas en el mes pide la página 2 y muestra la pieza del día 30", async () => {
    const pedidos = simularMes(101);
    renderCalendario();

    expect(await screen.findByText("Pieza del último día")).toBeInTheDocument();
    expect(paginasPedidas(pedidos)).toContain("2");
  });

  it("RF-116 H-01 pide páginas mientras pagina x por_pagina < total y deja de pedir al cubrir el total", async () => {
    const pedidos = simularMes(101);
    renderCalendario();

    await screen.findByText("Pieza del último día");
    await new Promise((r) => setTimeout(r, 100));
    expect(paginasPedidas(pedidos)).toEqual(["1", "2"]);
  });

  it("RF-116 H-01 con el total cubierto por la primera página no pide otra", async () => {
    const pedidos = simularMes(100);
    renderCalendario();

    await screen.findByText("Pieza 1");
    await new Promise((r) => setTimeout(r, 100));
    expect(paginasPedidas(pedidos)).toEqual(["1"]);
  });

  it("RF-116 H-01 mientras faltan páginas por cargar se ve un estado de carga", async () => {
    let soltar: () => void = () => {};
    const frenada = new Promise<void>((resolver) => {
      soltar = resolver;
    });
    const pedidos = simularMes(101, { frenarPagina2: frenada });
    renderCalendario();

    await waitFor(() => {
      expect(paginasPedidas(pedidos)).toContain("2");
    });
    expect(screen.getByRole("status")).toHaveTextContent(/cargando/i);

    soltar();
    expect(await screen.findByText("Pieza del último día")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  it("RF-116 H-01 si falla una página se ve un error en lugar del calendario como completo", async () => {
    const pedidos = simularMes(101, { fallaPagina2: true });
    renderCalendario();

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos cargar el calendario/i);
    expect(screen.queryByText("Pieza 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Pieza del último día")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 200));
    expect(paginasPedidas(pedidos)).toEqual(["1", "2"]);
  });

  it("RF-116 H-01 al cambiar de mes las páginas vuelven a pedirse desde la 1", async () => {
    const pedidos = simularMes(101);
    renderCalendario();
    await screen.findByText("Pieza del último día");

    await userEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));

    await waitFor(() => {
      const deDiciembre = pedidos.filter((p) => p.desde === "2026-12-01").map((p) => p.pagina);
      expect(deDiciembre).toEqual(["1", "2"]);
    });
  });

  it("RF-116 H-01 al cambiar de canal las páginas vuelven a pedirse desde la 1", async () => {
    const pedidos = simularMes(101);
    const { rerender, ui } = renderCalendario("instagram");
    await screen.findByText("Pieza del último día");

    rerender(ui("tiktok"));

    await waitFor(() => {
      const deTiktok = pedidos.filter((p) => p.canal === "tiktok").map((p) => p.pagina);
      expect(deTiktok).toEqual(["1", "2"]);
    });
  });
});
