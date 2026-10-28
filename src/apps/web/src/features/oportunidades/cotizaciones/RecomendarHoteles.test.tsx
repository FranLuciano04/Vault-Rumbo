import { crearCliente } from "@rumbo/shared";
import {
  crearServidor,
  destinosMock,
  idOportunidadMock,
  manejadoresHotelesPara,
  manejadoresM1,
  manejadoresOportunidades,
  oportunidadesMock,
  usuariosPorRol,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { CotizacionesOportunidad } from "./CotizacionesOportunidad";

// Handlers de oportunidades, catálogo de hoteles y destinos (el buscador se resuelve contra los tres).
const servidor = crearServidor(
  ...manejadoresOportunidades,
  ...manejadoresHotelesPara("empleado"),
  ...manejadoresM1,
);
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
const bariloche = destinosMock[0].id;
const enGestion = idOportunidadMock.en_gestion;
const base = oportunidadesMock.find((o) => o.id === enGestion);

/** La oportunidad en gestión del mock, pero con el destino consultado que pide el test. */
function conDestino(destino: string | null) {
  return http.get("*/api/oportunidades/:id", ({ params }) =>
    params["id"] === enGestion
      ? HttpResponse.json({ ...base, destino_consultado: destino })
      : undefined,
  );
}

/** Registra los parámetros de cada pedido al catálogo, sin cambiar la respuesta del mock. */
function espiar(pedidos: URLSearchParams[]) {
  servidor.events.on("request:start", ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === "/api/hoteles") pedidos.push(url.searchParams);
  });
}

/** El POST de emisión: guarda el cuerpo y responde una cotización con esos mismos ítems. */
function emisionQueEco(cuerpos: { moneda: string; items: { concepto: string; precio: string }[] }[]) {
  return http.post("*/api/oportunidades/:id/cotizaciones", async ({ request }) => {
    const cuerpo = (await request.json()) as (typeof cuerpos)[number];
    cuerpos.push(cuerpo);
    const total = cuerpo.items.reduce((suma, item) => suma + Number(item.precio), 0).toFixed(2);
    return HttpResponse.json(
      {
        id: "2f8c1d4e-9a30-4b57-8e62-5d7a0c3b1f99",
        oportunidad_id: enGestion,
        fecha: "2026-10-28",
        moneda: cuerpo.moneda,
        items: cuerpo.items,
        total,
        validez_hasta: "2026-11-28",
        estado: "borrador",
        creado_el: "2026-10-28T12:00:00Z",
        actualizado_el: "2026-10-28T12:00:00Z",
      },
      { status: 201 },
    );
  });
}

function renderCotizaciones(oportunidadId = enGestion) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <CotizacionesOportunidad
          cliente={cliente}
          usuario={usuariosPorRol.empleado}
          oportunidadId={oportunidadId}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const abrirBuscador = () => screen.findByRole("button", { name: /buscar hoteles/i });
const nombresEnResultados = () =>
  within(screen.getByRole("list", { name: /hoteles encontrados/i }))
    .getAllByRole("heading")
    .map((h) => h.textContent.trim());

describe("RF-106 recomendación en la cotización", () => {
  it("RF-106 el formulario ofrece buscar hoteles del catálogo (CU-06 A4)", async () => {
    servidor.use(conDestino("Bariloche"));
    renderCotizaciones();

    expect(await abrirBuscador()).toBeInTheDocument();
  });

  it("RF-106 busca filtrado por el destino de la oportunidad y ordenado por valoración", async () => {
    const pedidos: URLSearchParams[] = [];
    espiar(pedidos);
    servidor.use(conDestino("Bariloche"));
    const u = userEvent.setup();
    renderCotizaciones();

    await u.click(await abrirBuscador());

    await waitFor(() => {
      expect(pedidos.at(-1)?.get("destino_id")).toBe(bariloche);
    });
    expect(pedidos.at(-1)?.get("orden")).toBe("valoracion");
    // Solo los de Bariloche; con reseñas (Llao Llao, 4,5) antes que el sin reseñas (Cabañas).
    await screen.findByRole("heading", { name: "Hotel Llao Llao" });
    expect(nombresEnResultados()).toEqual(["Hotel Llao Llao", "Cabañas del Nahuel"]);
  });

  it("RF-106 cada resultado muestra su puntaje promedio, o «Sin reseñas»", async () => {
    servidor.use(conDestino("Bariloche"));
    const u = userEvent.setup();
    renderCotizaciones();

    await u.click(await abrirBuscador());

    const llao = (await screen.findByRole("heading", { name: "Hotel Llao Llao" })).closest(
      "li",
    ) as HTMLElement;
    const cabanas = screen
      .getByRole("heading", { name: "Cabañas del Nahuel" })
      .closest("li") as HTMLElement;
    expect(within(llao).getByText("4,5")).toBeInTheDocument();
    expect(within(cabanas).getByText(/sin reseñas/i)).toBeInTheDocument();
  });

  it("RF-106 elegir un hotel lo suma a «Hoteles elegidos» de la propuesta", async () => {
    servidor.use(conDestino("Bariloche"));
    const u = userEvent.setup();
    renderCotizaciones();
    await u.click(await abrirBuscador());

    await u.click(await screen.findByRole("button", { name: /agregar hotel llao llao/i }));

    const elegidos = screen.getByRole("list", { name: /hoteles elegidos/i });
    expect(within(elegidos).getByText("Hotel Llao Llao")).toBeInTheDocument();
    expect(within(elegidos).queryByText("Cabañas del Nahuel")).not.toBeInTheDocument();
  });

  it("RF-106 el hotel elegido se puede quitar de la propuesta", async () => {
    servidor.use(conDestino("Bariloche"));
    const u = userEvent.setup();
    renderCotizaciones();
    await u.click(await abrirBuscador());
    await u.click(await screen.findByRole("button", { name: /agregar hotel llao llao/i }));

    await u.click(screen.getByRole("button", { name: /quitar hotel llao llao/i }));

    expect(screen.queryByRole("list", { name: /hoteles elegidos/i })).not.toBeInTheDocument();
  });

  it("RF-106 el hotel elegido entra a los ítems con su precio de referencia y suma al total", async () => {
    const cuerpos: { moneda: string; items: { concepto: string; precio: string }[] }[] = [];
    servidor.use(conDestino("Bariloche"), emisionQueEco(cuerpos));
    const u = userEvent.setup();
    renderCotizaciones();
    await u.click(await abrirBuscador());

    await u.click(await screen.findByRole("button", { name: /agregar hotel llao llao/i }));

    const total = screen.getByText(/total calculado/i).parentElement as HTMLElement;
    expect(total).toHaveTextContent("$ 150.000,00");
    await u.click(screen.getByRole("button", { name: /generar documento/i }));
    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    // Sin completar otro ítem: la fila vacía inicial no debe bloquear la emisión.
    const item = cuerpos[0]?.items.find((i) => i.concepto.includes("Hotel Llao Llao"));
    expect(item).toBeDefined();
    expect(Number(item?.precio)).toBe(150000);
  });

  it("RF-106 los hoteles elegidos quedan en el detalle de la cotización emitida", async () => {
    const cuerpos: { moneda: string; items: { concepto: string; precio: string }[] }[] = [];
    servidor.use(conDestino("Bariloche"), emisionQueEco(cuerpos));
    const u = userEvent.setup();
    renderCotizaciones();
    await u.click(await abrirBuscador());
    await u.click(await screen.findByRole("button", { name: /agregar hotel llao llao/i }));

    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/hotel llao llao/i);
  });

  it("RF-106 sin resultados muestra las alternativas y quitar el destino repite la búsqueda sin él", async () => {
    const pedidos: URLSearchParams[] = [];
    espiar(pedidos);
    servidor.use(
      conDestino("Bariloche"),
      http.get("*/api/hoteles", ({ request }) => {
        const params = new URL(request.url).searchParams;
        const vacio = params.has("destino_id");
        return HttpResponse.json({
          items: vacio ? [] : [],
          total: 0,
          pagina: 1,
          por_pagina: 20,
          alternativas: vacio
            ? { ampliar_filtros: ["destino_id"], puede_dar_de_alta: true }
            : { ampliar_filtros: [], puede_dar_de_alta: true },
        });
      }),
    );
    const u = userEvent.setup();
    renderCotizaciones();
    await u.click(await abrirBuscador());

    expect(await screen.findByText(/no encontramos hoteles/i)).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: /quitar filtro: destino/i }));

    await waitFor(() => {
      expect(pedidos.at(-1)?.has("destino_id")).toBe(false);
    });
  });

  it("RF-106 una oportunidad sin destino (DEC-0023) busca en todo el catálogo, sin filtrar por destino", async () => {
    const pedidos: URLSearchParams[] = [];
    espiar(pedidos);
    servidor.use(conDestino(null));
    const u = userEvent.setup();
    renderCotizaciones();

    await u.click(await abrirBuscador());

    expect(await screen.findByRole("heading", { name: "Copacabana Palace" })).toBeInTheDocument();
    expect(pedidos.at(-1)?.has("destino_id")).toBe(false);
    expect(pedidos.at(-1)?.get("orden")).toBe("valoracion");
  });

  it("RF-106 si el catálogo falla avisa y no bloquea el resto del formulario", async () => {
    servidor.use(
      conDestino("Bariloche"),
      http.get("*/api/hoteles", () => new HttpResponse(null, { status: 500 })),
    );
    const u = userEvent.setup();
    renderCotizaciones();

    await u.click(await abrirBuscador());

    expect(await screen.findByText(/no pudimos cargar los hoteles/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generar documento/i })).toBeEnabled();
  });

  it("RF-106 sobre una oportunidad ganada no se ofrece el buscador", async () => {
    renderCotizaciones(idOportunidadMock.ganada);

    expect(await screen.findByRole("list", { name: /versiones/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /buscar hoteles/i })).not.toBeInTheDocument();
  });
});
