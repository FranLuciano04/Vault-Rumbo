import { crearCliente } from "@rumbo/shared";
import {
  crearServidor,
  destinosMock,
  hotelesMock,
  idOportunidadMock,
  manejadoresHotelesPara,
  manejadoresM1,
  manejadoresOportunidades,
  oportunidadesMock,
  usuariosPorRol,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  servidor.events.removeAllListeners();
});
afterAll(() => {
  servidor.close();
});

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });
const bariloche = destinosMock[0].id;
const enGestion = idOportunidadMock.en_gestion;
/** Fechas tentativas de la oportunidad: el hotel elegido arranca con ellas (DEC-0028). */
const FECHAS = { desde: "2027-03-05", hasta: "2027-03-15" };
const base = oportunidadesMock.find((o) => o.id === enGestion);

/** La oportunidad en gestión del mock, pero con el destino consultado que pide el test. */
function conDestino(
  destino: string | null,
  fechas: { desde: string; hasta: string } | null = null,
) {
  return http.get("*/api/oportunidades/:id", ({ params }) =>
    params["id"] === enGestion
      ? HttpResponse.json({
          ...base,
          destino_consultado: destino,
          fecha_desde_tentativa: fechas?.desde ?? null,
          fecha_hasta_tentativa: fechas?.hasta ?? null,
        })
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

interface CuerpoEmision {
  moneda: string;
  items: {
    concepto: string;
    precio: string;
    hotel_id?: string;
    check_in?: string;
    check_out?: string;
  }[];
}

/** El POST de emisión: guarda el cuerpo y responde una cotización con esos mismos ítems. */
function emisionQueEco(cuerpos: CuerpoEmision[]) {
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

function renderCotizaciones(oportunidadId: string = enGestion) {
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
    const cuerpos: CuerpoEmision[] = [];
    servidor.use(conDestino("Bariloche", FECHAS), emisionQueEco(cuerpos));
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
    const cuerpos: CuerpoEmision[] = [];
    servidor.use(conDestino("Bariloche", FECHAS), emisionQueEco(cuerpos));
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
          items: vacio ? [] : hotelesMock.slice(0, 1),
          total: vacio ? 0 : 1,
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
    expect(
      await screen.findByRole("heading", { name: hotelesMock[0]?.nombre }),
    ).toBeInTheDocument();
    // Dentro de la cotización no se ofrece el alta: se perdería el formulario.
    expect(screen.queryByRole("link", { name: /dar de alta/i })).not.toBeInTheDocument();
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

  it("RF-106 en USD el hotel se suma sin precio: la referencia es en ARS", async () => {
    servidor.use(conDestino("Bariloche"));
    const u = userEvent.setup();
    renderCotizaciones();
    await screen.findByRole("button", { name: /buscar hoteles/i });
    await u.click(screen.getByRole("radio", { name: "USD" }));
    await u.click(await abrirBuscador());

    await u.click(await screen.findByRole("button", { name: /agregar hotel llao llao/i }));

    expect(screen.getByRole("textbox", { name: "Precio" })).toHaveValue("");
    const total = screen.getByText(/total calculado/i).parentElement as HTMLElement;
    expect(total).not.toHaveTextContent("150.000");
  });

  it("RF-106 agregar en ARS y pasar a USD vacía el precio autocompletado y quita «(ref. por noche)»; emitir sin cargarlo no llama a la API", async () => {
    const cuerpos: CuerpoEmision[] = [];
    servidor.use(conDestino("Bariloche", FECHAS), emisionQueEco(cuerpos));
    const u = userEvent.setup();
    renderCotizaciones();
    await u.click(await abrirBuscador());
    await u.click(await screen.findByRole("button", { name: /agregar hotel llao llao/i }));
    expect(screen.getByRole("textbox", { name: "Precio" })).toHaveValue("150000,00");

    await u.click(screen.getByRole("radio", { name: "USD" }));

    expect(screen.getByRole("textbox", { name: "Precio" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Concepto" })).toHaveValue("Hotel Llao Llao");
    await u.click(screen.getByRole("button", { name: /generar documento/i }));
    expect(
      await screen.findByText(/cargá al menos un ítem con concepto y precio válidos/i),
    ).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-106 un precio escrito o corregido a mano no se toca al cambiar de moneda", async () => {
    servidor.use(conDestino("Bariloche"));
    const u = userEvent.setup();
    renderCotizaciones();
    await u.click(await abrirBuscador());
    await u.click(await screen.findByRole("button", { name: /agregar hotel llao llao/i }));
    const precio = screen.getByRole("textbox", { name: "Precio" });
    await u.clear(precio);
    await u.type(precio, "180000");

    await u.click(screen.getByRole("radio", { name: "USD" }));

    expect(screen.getByRole("textbox", { name: "Precio" })).toHaveValue("180000");
  });

  it("RF-106 un ítem cargado a mano sin hotel no se toca al cambiar de moneda", async () => {
    servidor.use(conDestino("Bariloche"));
    const u = userEvent.setup();
    renderCotizaciones();
    await screen.findByRole("button", { name: /buscar hoteles/i });
    await u.type(screen.getByRole("textbox", { name: "Concepto" }), "Traslado");
    await u.type(screen.getByRole("textbox", { name: "Precio" }), "5000");

    await u.click(screen.getByRole("radio", { name: "USD" }));

    expect(screen.getByRole("textbox", { name: "Precio" })).toHaveValue("5000");
    expect(screen.getByRole("textbox", { name: "Concepto" })).toHaveValue("Traslado");
  });

  it("RF-106 agregar el hotel con USD ya elegido deja el precio vacío y el concepto sin «(ref. por noche)»", async () => {
    servidor.use(conDestino("Bariloche"));
    const u = userEvent.setup();
    renderCotizaciones();
    await screen.findByRole("button", { name: /buscar hoteles/i });
    await u.click(screen.getByRole("radio", { name: "USD" }));
    await u.click(await abrirBuscador());

    await u.click(await screen.findByRole("button", { name: /agregar hotel llao llao/i }));

    expect(screen.getByRole("textbox", { name: "Precio" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Concepto" })).toHaveValue("Hotel Llao Llao");
  });

  it("RF-106 volver de USD a ARS no rellena el precio ni restaura el concepto", async () => {
    servidor.use(conDestino("Bariloche"));
    const u = userEvent.setup();
    renderCotizaciones();
    await u.click(await abrirBuscador());
    await u.click(await screen.findByRole("button", { name: /agregar hotel llao llao/i }));
    await u.click(screen.getByRole("radio", { name: "USD" }));

    await u.click(screen.getByRole("radio", { name: "ARS" }));

    expect(screen.getByRole("textbox", { name: "Precio" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Concepto" })).toHaveValue("Hotel Llao Llao");
  });

  it("RF-106 avisa si el destino de la oportunidad no está en el catálogo y busca sin filtrarlo", async () => {
    const pedidos: URLSearchParams[] = [];
    espiar(pedidos);
    servidor.use(conDestino("Atlantis"));
    const u = userEvent.setup();
    renderCotizaciones();

    await u.click(await abrirBuscador());

    expect(await screen.findByText(/no encontramos «atlantis»/i)).toBeInTheDocument();
    await screen.findByRole("list", { name: /hoteles encontrados/i });
    expect(pedidos.at(-1)?.has("destino_id")).toBe(false);
  });

  it("RF-106 pagina los resultados del catálogo", async () => {
    const pedidos: URLSearchParams[] = [];
    espiar(pedidos);
    servidor.use(
      conDestino("Bariloche"),
      http.get("*/api/hoteles", ({ request }) => {
        const pagina = Number(new URL(request.url).searchParams.get("pagina") ?? 1);
        return HttpResponse.json({
          items: hotelesMock.slice(0, 1),
          total: 40,
          pagina,
          por_pagina: 20,
          alternativas: null,
        });
      }),
    );
    const u = userEvent.setup();
    renderCotizaciones();
    await u.click(await abrirBuscador());

    expect(await screen.findByText(/página 1 de 2/i)).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: /siguiente/i }));

    await waitFor(() => {
      expect(pedidos.at(-1)?.get("pagina")).toBe("2");
    });
    expect(await screen.findByText(/página 2 de 2/i)).toBeInTheDocument();
  });

  it("RF-106 sobre una oportunidad ganada no se ofrece el buscador", async () => {
    renderCotizaciones(idOportunidadMock.ganada);

    expect(await screen.findByRole("list", { name: /cotizaciones/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /buscar hoteles/i })).not.toBeInTheDocument();
  });
});

describe("RF-106 hotel con fechas en la cotización", () => {
  const llaoLlao = hotelesMock.find((h) => h.nombre === "Hotel Llao Llao");

  async function elegirLlaoLlao(u: ReturnType<typeof userEvent.setup>) {
    await u.click(await abrirBuscador());
    await u.click(await screen.findByRole("button", { name: /agregar hotel llao llao/i }));
  }

  it("RF-106 un ítem que sale de un hotel del catálogo arranca con las fechas tentativas de la oportunidad", async () => {
    servidor.use(conDestino("Bariloche", FECHAS));
    const u = userEvent.setup();
    renderCotizaciones();

    await elegirLlaoLlao(u);

    expect(screen.getByLabelText(/check-in/i)).toHaveValue("2027-03-05");
    expect(screen.getByLabelText(/check-out/i)).toHaveValue("2027-03-15");
  });

  it("RF-106 si la oportunidad no tiene fechas tentativas, check-in y check-out arrancan vacíos", async () => {
    servidor.use(conDestino("Bariloche"));
    const u = userEvent.setup();
    renderCotizaciones();

    await elegirLlaoLlao(u);

    expect(screen.getByLabelText(/check-in/i)).toHaveValue("");
    expect(screen.getByLabelText(/check-out/i)).toHaveValue("");
  });

  it("RF-106 un ítem cargado a mano sin hotel no muestra check-in ni check-out", async () => {
    servidor.use(conDestino("Bariloche", FECHAS));
    renderCotizaciones();

    await abrirBuscador();

    expect(screen.queryByLabelText(/check-in/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/check-out/i)).not.toBeInTheDocument();
  });

  it("RF-106 un check-out anterior al check-in se avisa y no emite la cotización", async () => {
    const cuerpos: CuerpoEmision[] = [];
    servidor.use(conDestino("Bariloche", FECHAS), emisionQueEco(cuerpos));
    const u = userEvent.setup();
    renderCotizaciones();
    await elegirLlaoLlao(u);

    fireEvent.change(screen.getByLabelText(/check-out/i), { target: { value: "2027-03-01" } });
    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    expect(
      await screen.findByText(/el check-out no puede ser anterior al check-in/i),
    ).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-106 un hotel sin las dos fechas no se emite (DEC-0028: son obligatorias)", async () => {
    const cuerpos: CuerpoEmision[] = [];
    servidor.use(conDestino("Bariloche"), emisionQueEco(cuerpos));
    const u = userEvent.setup();
    renderCotizaciones();
    await elegirLlaoLlao(u);

    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    expect(await screen.findByLabelText(/check-in/i)).toBeInvalid();
    expect(screen.getByLabelText(/check-out/i)).toBeInvalid();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-106 al emitir, el ítem del hotel manda hotel_id, check_in y check_out", async () => {
    const cuerpos: CuerpoEmision[] = [];
    servidor.use(conDestino("Bariloche", FECHAS), emisionQueEco(cuerpos));
    const u = userEvent.setup();
    renderCotizaciones();
    await elegirLlaoLlao(u);
    fireEvent.change(screen.getByLabelText(/check-in/i), { target: { value: "2027-03-06" } });
    fireEvent.change(screen.getByLabelText(/check-out/i), { target: { value: "2027-03-12" } });

    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    const item = cuerpos[0]?.items.find((i) => i.concepto.includes("Hotel Llao Llao"));
    expect(item).toMatchObject({
      hotel_id: llaoLlao?.id,
      check_in: "2027-03-06",
      check_out: "2027-03-12",
    });
  });

  it("RF-106 los ítems sin hotel se mandan como hoy: solo concepto y precio", async () => {
    const cuerpos: CuerpoEmision[] = [];
    servidor.use(conDestino("Bariloche", FECHAS), emisionQueEco(cuerpos));
    const u = userEvent.setup();
    renderCotizaciones();
    await screen.findByRole("button", { name: /buscar hoteles/i });
    await u.type(screen.getByRole("textbox", { name: "Concepto" }), "Traslado");
    await u.type(screen.getByRole("textbox", { name: "Precio" }), "5000");

    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.items).toEqual([{ concepto: "Traslado", precio: "5000" }]);
  });

  it("RF-106 con un ítem con hotel y otro sin hotel, solo el del hotel manda hotel_id y fechas", async () => {
    const cuerpos: CuerpoEmision[] = [];
    servidor.use(conDestino("Bariloche", FECHAS), emisionQueEco(cuerpos));
    const u = userEvent.setup();
    renderCotizaciones();
    await elegirLlaoLlao(u);
    await u.click(screen.getByRole("button", { name: /agregar ítem/i }));
    const conceptos = screen.getAllByRole("textbox", { name: "Concepto" });
    const precios = screen.getAllByRole("textbox", { name: "Precio" });
    await u.type(conceptos[1] as HTMLElement, "Traslado");
    await u.type(precios[1] as HTMLElement, "5000");

    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    const [hotel, traslado] = cuerpos[0]?.items ?? [];
    expect(hotel).toMatchObject({ hotel_id: llaoLlao?.id, check_in: "2027-03-05" });
    expect(traslado).toEqual({ concepto: "Traslado", precio: "5000" });
  });

  it("RF-106 la cotización emitida muestra el hotel con sus fechas", async () => {
    servidor.use(conDestino("Bariloche", FECHAS), emisionQueEco([]));
    const u = userEvent.setup();
    renderCotizaciones();
    await elegirLlaoLlao(u);

    await u.click(screen.getByRole("button", { name: /generar documento/i }));

    const emitida = await screen.findByRole("status");
    expect(emitida).toHaveTextContent(/hotel llao llao/i);
    expect(emitida).toHaveTextContent("05/03/27");
    expect(emitida).toHaveTextContent("15/03/27");
  });

  it("RF-106 el historial muestra las fechas de los hoteles de cada cotización", async () => {
    renderCotizaciones(idOportunidadMock.cotizada);

    const historial = await screen.findByRole("list", { name: /cotizaciones de la oportunidad/i });

    // La versión enviada de Europa tiene un ítem con hotel del 12/05/27 al 30/05/27.
    await waitFor(() => {
      expect(historial).toHaveTextContent("12/05/27");
    });
    expect(historial).toHaveTextContent("30/05/27");
  });
});
