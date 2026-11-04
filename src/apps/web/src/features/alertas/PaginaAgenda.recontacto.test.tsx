import { crearCliente, type Alerta } from "@rumbo/shared";
import {
  aFicha,
  alertasMock,
  clientesMock,
  crearServidor,
  manejadoresAlertas,
  usuariosPorRol,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { PaginaAgenda } from "./PaginaAgenda";

// T-116 (CU-30 pasos 3 a 5, pantalla 7): la sugerencia de recontacto con el contexto del cliente y
// las tres decisiones. La tarjeta vive en el panel de detalle de la alerta de tipo `recontacto`.
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

const DESCRIPCION = "Hace un año que Joaquín Ramos no viaja: ofrecele una escapada.";
const ID_ALERTA = "c0a1f5d2-6e37-4b81-9a4c-1f2e3d4c5b07";
const ID_CLIENTE = "d4a8c6e2-5f19-4073-8b3a-2e1c9d7f0b33";

const joaquin = clientesMock.find((c) => c.id === ID_CLIENTE);
const base = alertasMock.find((a) => a.id === ID_ALERTA);
if (!joaquin || !base) throw new Error("faltan los mocks de Joaquín Ramos");

/** La sugerencia de hoy (el mock está fechada el 30/10) y el cliente sin opt-out. */
const recontacto: Alerta = { ...base, fecha: "2026-10-25" };
const fichaJoaquin = { ...aFicha(joaquin), no_recontactar: false };

const pagina = <T,>(items: T[]) => ({ items, total: items.length, pagina: 1, por_pagina: 20 });

const HISTORIAL = {
  oportunidades: [
    {
      id: "6b2d9f08-7e41-4c5a-8d13-0a9e3c5b7f44",
      destino_consultado: "Roma",
      estado: "ganada",
      fecha_desde_tentativa: "2025-11-03",
      fecha_hasta_tentativa: "2025-11-17",
    },
  ],
  viajes: [
    {
      id: "f0a7c3d9-2b64-4e18-9c5d-8b1e6a4d2f99",
      destino_id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e05",
      estado: "finalizado",
      fecha_salida: "2025-11-03",
      fecha_regreso: "2025-11-17",
    },
  ],
  resenas: [],
};

const problema = (status: number, detail: string) =>
  HttpResponse.json(
    { type: "about:blank", title: "Error", status, detail },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );

interface Pedidos {
  resolver: unknown[];
  posponer: unknown[];
  patchCliente: unknown[];
}

/** Sirve la agenda con la sugerencia de hoy, la ficha y el historial de Joaquín, y registra los POST. */
function servirRecontacto(historial: Record<string, unknown> = HISTORIAL): Pedidos {
  const pedidos: Pedidos = { resolver: [], posponer: [], patchCliente: [] };
  servidor.use(
    http.get("*/api/alertas", ({ request }) => {
      const estado = new URL(request.url).searchParams.get("estado") ?? "pendiente";
      return HttpResponse.json(pagina(estado === "pendiente" ? [recontacto] : []));
    }),
    http.get("*/api/alertas/:id", () => HttpResponse.json(recontacto)),
    http.get("*/api/clientes/:id", () => HttpResponse.json(fichaJoaquin)),
    http.get("*/api/clientes/:id/historial", () => HttpResponse.json(historial)),
    http.patch("*/api/clientes/:id", async ({ request }) => {
      pedidos.patchCliente.push(await request.json());
      return HttpResponse.json({ ...fichaJoaquin, no_recontactar: true });
    }),
    http.post("*/api/alertas/:id/resolver", ({ params }) => {
      pedidos.resolver.push(String(params["id"]));
      return HttpResponse.json({ ...recontacto, estado: "resuelta" });
    }),
    http.post("*/api/alertas/:id/posponer", async ({ params, request }) => {
      pedidos.posponer.push({ id: String(params["id"]), cuerpo: await request.json() });
      return HttpResponse.json(recontacto);
    }),
  );
  return pedidos;
}

function Ubicacion() {
  const { pathname, search } = useLocation();
  return <p data-testid="ubicacion">{`${pathname}${search}`}</p>;
}

function renderAgenda() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/agenda"]}>
        <Routes>
          <Route
            path="/agenda"
            element={<PaginaAgenda cliente={cliente} usuario={usuariosPorRol.empleado} />}
          />
          <Route path="/oportunidades/nueva" element={<Ubicacion />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Abre el panel de la sugerencia y devuelve su tarjeta de recontacto. */
async function abrirTarjeta(descripcion = DESCRIPCION) {
  const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const texto = await screen.findByText(descripcion);
  const li = texto.closest("li");
  if (!li) throw new Error("La sugerencia no está en un elemento de lista");
  await usuario.click(within(li).getByRole("button", { name: `Ver detalle: ${descripcion}` }));
  const panel = await screen.findByRole("dialog", { name: /detalle de la alerta/i });
  const tarjeta = await within(panel).findByRole("region", { name: /sugerencia de recontacto/i });
  return { usuario, panel, tarjeta };
}

describe("RF-029 decisión de recontacto", () => {
  describe("tarjeta con el contexto del cliente", () => {
    it("RF-028 el panel de una sugerencia muestra la tarjeta con el nombre del cliente", async () => {
      servirRecontacto();
      renderAgenda();

      const { tarjeta } = await abrirTarjeta();

      expect(within(tarjeta).getByText(/Joaquín Ramos/)).toBeInTheDocument();
    });

    it("RF-028 la tarjeta resume el historial: viajes con sus fechas y oportunidades con su destino", async () => {
      servirRecontacto();
      renderAgenda();

      const { tarjeta } = await abrirTarjeta();

      expect(await within(tarjeta).findByText(/03\/11\/25/)).toBeInTheDocument();
      expect(within(tarjeta).getByText(/Roma/)).toBeInTheDocument();
    });

    it("RF-028 la tarjeta muestra las preferencias del cliente", async () => {
      servirRecontacto();
      renderAgenda();

      const { tarjeta } = await abrirTarjeta();

      expect(
        await within(tarjeta).findByText(/Viaja solo, prefiere escapadas cortas/),
      ).toBeInTheDocument();
    });

    it("RF-028 si el cliente no tiene historial lo dice", async () => {
      servirRecontacto({ oportunidades: [], viajes: [], resenas: [] });
      renderAgenda();

      const { tarjeta } = await abrirTarjeta();

      expect(await within(tarjeta).findByText(/sin viajes/i)).toBeInTheDocument();
    });

    it("RF-028 si falla la carga del historial lo avisa y las decisiones siguen disponibles", async () => {
      servirRecontacto();
      servidor.use(
        http.get("*/api/clientes/:id/historial", () => problema(500, "Falla del servidor.")),
      );
      renderAgenda();

      const { tarjeta } = await abrirTarjeta();

      expect(await within(tarjeta).findByText(/no pudimos cargar el historial/i)).toBeVisible();
      expect(within(tarjeta).getByText(/crear consulta/i)).toBeInTheDocument();
      expect(within(tarjeta).getByRole("button", { name: /no recontactar/i })).toBeEnabled();
      expect(within(tarjeta).getByRole("button", { name: /posponer/i })).toBeEnabled();
    });

    it("RF-029 ofrece las tres decisiones: crear consulta, no recontactar y posponer", async () => {
      servirRecontacto();
      renderAgenda();

      const { tarjeta } = await abrirTarjeta();

      expect(within(tarjeta).getByText(/crear consulta/i)).toBeInTheDocument();
      expect(within(tarjeta).getByRole("button", { name: /no recontactar/i })).toBeInTheDocument();
      expect(within(tarjeta).getByRole("button", { name: /posponer/i })).toBeInTheDocument();
    });

    it("RF-028 una alerta de otro tipo no muestra la tarjeta de recontacto", async () => {
      servidor.use(
        http.get("*/api/alertas", () =>
          HttpResponse.json(
            pagina([{ ...alertasMock.find((a) => a.tipo === "formulario"), fecha: "2026-10-25" }]),
          ),
        ),
        http.get("*/api/alertas/:id", () =>
          HttpResponse.json(alertasMock.find((a) => a.tipo === "formulario")),
        ),
        http.get("*/api/destinos/:id/requisitos", () => HttpResponse.json(pagina([]))),
      );
      renderAgenda();
      const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const descripcion = "Pedir el pasaporte vigente: Roma exige 6 meses de validez.";
      const texto = await screen.findByText(descripcion);
      const li = texto.closest("li");
      if (!li) throw new Error("falta la fila");
      await usuario.click(within(li).getByRole("button", { name: `Ver detalle: ${descripcion}` }));

      const panel = await screen.findByRole("dialog", { name: /detalle de la alerta/i });
      expect(await within(panel).findByText(descripcion)).toBeInTheDocument();
      expect(
        within(panel).queryByRole("region", { name: /sugerencia de recontacto/i }),
      ).not.toBeInTheDocument();
      expect(within(panel).queryByText(/crear consulta/i)).not.toBeInTheDocument();
    });
  });

  describe("alerta ya vista", () => {
    it("RF-029 con la alerta vista no se ofrece posponer", async () => {
      servirRecontacto();
      servidor.use(
        http.get("*/api/alertas/:id", () => HttpResponse.json({ ...recontacto, estado: "vista" })),
      );
      renderAgenda();

      const { tarjeta } = await abrirTarjeta();

      expect(within(tarjeta).getByText(/crear consulta/i)).toBeInTheDocument();
      expect(within(tarjeta).queryByRole("button", { name: /posponer/i })).not.toBeInTheDocument();
    });
  });

  describe("crear consulta (A2)", () => {
    it("RF-029 «Crear consulta» abre /oportunidades/nueva con el cliente de la sugerencia", async () => {
      servirRecontacto();
      renderAgenda();
      const { usuario, tarjeta } = await abrirTarjeta();

      await usuario.click(within(tarjeta).getByText(/crear consulta/i));

      expect(await screen.findByTestId("ubicacion")).toHaveTextContent(
        `/oportunidades/nueva?cliente_id=${ID_CLIENTE}`,
      );
    });
  });

  describe("no recontactar (A1)", () => {
    it("RF-029 «No recontactar» pide confirmación y todavía no envía nada", async () => {
      const pedidos = servirRecontacto();
      renderAgenda();
      const { usuario, tarjeta } = await abrirTarjeta();

      await usuario.click(within(tarjeta).getByRole("button", { name: /no recontactar/i }));

      expect(await within(tarjeta).findByRole("button", { name: /confirmar/i })).toBeVisible();
      expect(pedidos.patchCliente).toHaveLength(0);
      expect(pedidos.resolver).toHaveLength(0);
    });

    it("RF-029 al confirmar marca no_recontactar en el cliente y no llama a /resolver", async () => {
      const pedidos = servirRecontacto();
      renderAgenda();
      const { usuario, tarjeta } = await abrirTarjeta();

      await usuario.click(within(tarjeta).getByRole("button", { name: /no recontactar/i }));
      await usuario.click(await within(tarjeta).findByRole("button", { name: /confirmar/i }));

      await waitFor(() => {
        expect(pedidos.patchCliente).toEqual([{ no_recontactar: true }]);
      });
      await waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: /detalle de la alerta/i }),
        ).not.toBeInTheDocument();
      });
      expect(pedidos.resolver).toHaveLength(0);
    });

    it("RF-029 tras confirmar «No recontactar» el panel se cierra, sin «Deshacer», y la agenda se vuelve a pedir", async () => {
      let pedidosDeAgenda = 0;
      servirRecontacto();
      servidor.use(
        http.get("*/api/alertas", ({ request }) => {
          pedidosDeAgenda += 1;
          const estado = new URL(request.url).searchParams.get("estado") ?? "pendiente";
          return HttpResponse.json(pagina(estado === "pendiente" ? [recontacto] : []));
        }),
      );
      renderAgenda();
      const { usuario, tarjeta } = await abrirTarjeta();
      const antes = pedidosDeAgenda;

      await usuario.click(within(tarjeta).getByRole("button", { name: /no recontactar/i }));
      await usuario.click(await within(tarjeta).findByRole("button", { name: /confirmar/i }));

      await waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: /detalle de la alerta/i }),
        ).not.toBeInTheDocument();
      });
      await waitFor(() => {
        expect(pedidosDeAgenda).toBeGreaterThan(antes);
      });
      expect(screen.queryByRole("button", { name: /deshacer/i })).not.toBeInTheDocument();
    });

    it("RF-029 «Cancelar» en la confirmación no envía nada", async () => {
      const pedidos = servirRecontacto();
      renderAgenda();
      const { usuario, tarjeta } = await abrirTarjeta();

      await usuario.click(within(tarjeta).getByRole("button", { name: /no recontactar/i }));
      await usuario.click(await within(tarjeta).findByRole("button", { name: /cancelar/i }));

      expect(within(tarjeta).queryByRole("button", { name: /confirmar/i })).not.toBeInTheDocument();
      expect(pedidos.patchCliente).toHaveLength(0);
      expect(pedidos.resolver).toHaveLength(0);
    });

    it("RF-029 si el servidor rechaza el opt-out muestra el motivo y no resuelve la alerta", async () => {
      const pedidos = servirRecontacto();
      servidor.use(
        http.patch("*/api/clientes/:id", () => problema(403, "No podés editar a este cliente.")),
      );
      renderAgenda();
      const { usuario, tarjeta } = await abrirTarjeta();

      await usuario.click(within(tarjeta).getByRole("button", { name: /no recontactar/i }));
      await usuario.click(await within(tarjeta).findByRole("button", { name: /confirmar/i }));

      expect(await screen.findByText(/no podés editar a este cliente/i)).toBeInTheDocument();
      expect(pedidos.resolver).toHaveLength(0);
    });
  });

  describe("posponer (A3)", () => {
    it("RF-029 «Posponer» pide la nueva fecha (mínimo mañana) y envía la reprogramación al confirmar", async () => {
      const pedidos = servirRecontacto();
      renderAgenda();
      const { usuario, tarjeta } = await abrirTarjeta();

      await usuario.click(within(tarjeta).getByRole("button", { name: /posponer/i }));
      const fecha = await within(tarjeta).findByLabelText(/nueva fecha/i);
      expect(fecha).toHaveAttribute("min", "2026-10-26");
      expect(pedidos.posponer).toHaveLength(0);
      await usuario.type(fecha, "2026-11-30");
      await usuario.click(within(tarjeta).getByRole("button", { name: /confirmar/i }));

      await waitFor(() => {
        expect(pedidos.posponer).toEqual([{ id: ID_ALERTA, cuerpo: { fecha: "2026-11-30" } }]);
      });
    });

    it("RF-029 si el servidor rechaza la fecha (422) la tarjeta muestra el motivo", async () => {
      servirRecontacto();
      servidor.use(
        http.post("*/api/alertas/:id/posponer", () =>
          problema(422, "Fecha no válida del servidor."),
        ),
      );
      renderAgenda();
      const { usuario, tarjeta } = await abrirTarjeta();

      await usuario.click(within(tarjeta).getByRole("button", { name: /posponer/i }));
      await usuario.type(await within(tarjeta).findByLabelText(/nueva fecha/i), "2026-11-30");
      await usuario.click(within(tarjeta).getByRole("button", { name: /confirmar/i }));

      expect(await screen.findByText(/fecha no válida del servidor/i)).toBeInTheDocument();
    });
  });
});
