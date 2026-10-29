import { crearCliente, type Alerta, type EstadoAlerta } from "@rumbo/shared";
import { alertasMock, crearServidor } from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll } from "vitest";
import { InsistenciasOportunidad } from "./InsistenciasOportunidad";

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
const OPORTUNIDAD = "6b2d9f08-7e41-4c5a-8d13-0a9e3c5b7f44";

function insistencia(n: number, estado: EstadoAlerta): Alerta {
  return {
    ...alertasMock[0],
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    tipo: "insistencia",
    estado,
    oportunidad_id: OPORTUNIDAD,
    fecha: "2026-10-26",
    descripcion: `Insistencia ${estado} ${n}`,
  } as Alerta;
}

/** Sirve `GET /api/alertas` filtrando por `estado` (si viene) y paginando de a `por_pagina` (20 por defecto). */
function servirAlertas(todas: Alerta[]) {
  servidor.use(
    http.get("*/api/alertas", ({ request }) => {
      const url = new URL(request.url);
      const estado = url.searchParams.get("estado");
      const pagina = Number(url.searchParams.get("pagina") ?? 1);
      const porPagina = Number(url.searchParams.get("por_pagina") ?? 20);
      const filtradas = estado ? todas.filter((a) => a.estado === estado) : todas;
      const desde = (pagina - 1) * porPagina;
      return HttpResponse.json({
        items: filtradas.slice(desde, desde + porPagina),
        total: filtradas.length,
        pagina,
        por_pagina: porPagina,
      });
    }),
  );
}

function renderInsistencias() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <InsistenciasOportunidad cliente={cliente} oportunidadId={OPORTUNIDAD} puedeAgendar={false} />
    </QueryClientProvider>,
  );
}

const VER_MAS = { name: /ver más|cargar más/i };

describe("RF-015 insistencias de la oportunidad: estados (H-05)", () => {
  it("RF-015 una insistencia vista aparece en el detalle con la etiqueta «Vista»", async () => {
    servirAlertas([insistencia(1, "vista")]);
    renderInsistencias();

    const fila = (await screen.findByText(/Insistencia vista 1/)).closest("li");
    expect(fila).not.toBeNull();
    expect(within(fila as HTMLElement).getByText("Vista")).toBeInTheDocument();
  });

  it("RF-015 pendiente y atendida conservan sus etiquetas y su orden (pendientes antes que atendidas)", async () => {
    servirAlertas([insistencia(1, "resuelta"), insistencia(2, "pendiente")]);
    renderInsistencias();

    await screen.findByText(/Insistencia pendiente 2/);
    const filas = screen.getAllByRole("listitem");
    expect(filas).toHaveLength(2);
    expect(within(filas[0]).getByText("Pendiente")).toBeInTheDocument();
    expect(within(filas[1]).getByText("Atendida")).toBeInTheDocument();
  });
});

describe("RF-015 insistencias de la oportunidad: paginación (H-06)", () => {
  it("RF-015 con más de 20 insistencias de un estado se puede llegar a la última", async () => {
    const pendientes = Array.from({ length: 25 }, (_, i) => insistencia(i + 1, "pendiente"));
    servirAlertas(pendientes);
    renderInsistencias();

    await screen.findByText(/Insistencia pendiente 1$/);
    expect(screen.queryByText(/Insistencia pendiente 25$/)).not.toBeInTheDocument();

    await userEvent.click(await screen.findByRole("button", VER_MAS));

    expect(await screen.findByText(/Insistencia pendiente 25$/)).toBeInTheDocument();
  });

  it("RF-015 con más de 20 atendidas también se puede llegar a la última", async () => {
    const atendidas = Array.from({ length: 22 }, (_, i) => insistencia(i + 1, "resuelta"));
    servirAlertas(atendidas);
    renderInsistencias();

    await screen.findByText(/Insistencia resuelta 1$/);
    await userEvent.click(await screen.findByRole("button", VER_MAS));

    expect(await screen.findByText(/Insistencia resuelta 22$/)).toBeInTheDocument();
  });

  it("RF-015 con 20 insistencias o menos no aparece el control de ver más", async () => {
    servirAlertas(Array.from({ length: 20 }, (_, i) => insistencia(i + 1, "pendiente")));
    renderInsistencias();

    await screen.findByText(/Insistencia pendiente 20$/);
    expect(screen.queryByRole("button", VER_MAS)).not.toBeInTheDocument();
  });
});
