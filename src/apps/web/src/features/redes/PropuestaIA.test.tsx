import { crearCliente, type ContenidoRed } from "@rumbo/shared";
import { contenidosMock, crearServidor, manejadoresRedes } from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PaginaRedes } from "./PaginaRedes";

/*
 * Convenciones de UI que estos tests le piden a la implementación (pantalla 27 del prototipo):
 * - En el encabezado de la página, un botón «Propuesta con IA»; en cada tarjeta de una pieza en
 *   idea o en producción (no en listo ni publicado), un botón «Propuesta con IA».
 * - El panel es un `dialog` accesible con nombre «Propuesta con IA».
 * - Campos: textbox «Tema o destino»; grupo «Canal» y grupo «Tono u objetivo» con botones
 *   `aria-pressed`; campo «Fecha de publicación» (solo al crear una pieza nueva); botón «Generar».
 * - Borradores: un `radio` por borrador (el primero viene elegido), con su título y su texto;
 *   cada uno tiene un botón «Editar» que habilita el textbox «Texto del borrador».
 * - Botones «Regenerar», «Descartar» y «Guardar en la pieza»; ante un error, `alert` y «Reintentar».
 */

const servidor = crearServidor();
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-12T15:00:00"));
  servidor.use(...manejadoresRedes);
});
afterEach(() => {
  servidor.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => {
  servidor.close();
});

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });
const [idea, enProduccion, listo, publicado] = contenidosMock as [
  ContenidoRed,
  ContenidoRed,
  ContenidoRed,
  ContenidoRed,
];

function renderRedes() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/redes"]}>
        <PaginaRedes cliente={cliente} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const tarjeta = async (titulo: string) => {
  const texto = await screen.findByText(titulo);
  const caja = texto.closest<HTMLElement>("article, li, [data-testid^='tarjeta']");
  if (!caja) throw new Error(`no hay una tarjeta para ${titulo}`);
  return caja;
};

const borradoresDe = (n: number, prefijo = "Borrador") =>
  Array.from({ length: n }, (_, i) => ({
    titulo: `${prefijo} ${String(i + 1)}`,
    texto: `Texto del ${prefijo.toLowerCase()} ${String(i + 1)}`,
  }));

const problema = (status: number, detail: string) =>
  HttpResponse.json(
    { type: "about:blank", title: "Error", status, detail },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );

/** Registra los pedidos a la IA y las escrituras; la IA responde `respuestas` en orden. */
function espiar(respuestas: ReturnType<typeof borradoresDe>[] = [borradoresDe(2)]) {
  const pedidos: Record<string, unknown>[] = [];
  const altas: Record<string, unknown>[] = [];
  const cambios: { id: string; cuerpo: Record<string, unknown> }[] = [];
  servidor.use(
    http.post("*/api/contenidos/propuestas-ia", async ({ request }) => {
      pedidos.push((await request.clone().json()) as Record<string, unknown>);
      const borradores =
        respuestas[Math.min(pedidos.length - 1, respuestas.length - 1)] ?? borradoresDe(2);
      return HttpResponse.json({ borradores });
    }),
    http.post("*/api/contenidos", async ({ request }) => {
      const cuerpo = (await request.clone().json()) as Record<string, unknown>;
      altas.push(cuerpo);
      return HttpResponse.json(
        {
          ...contenidosMock[0],
          id: "6a1b2c3d-4e5f-4a60-8b71-8c9d0e1f2aff",
          ...cuerpo,
          estado_kanban: "idea",
        },
        { status: 201 },
      );
    }),
    http.patch("*/api/contenidos/:id", async ({ params, request }) => {
      const cuerpo = (await request.clone().json()) as Record<string, unknown>;
      cambios.push({ id: String(params["id"]), cuerpo });
      const c = contenidosMock.find((x) => x.id === params["id"]);
      return HttpResponse.json({ ...c, ...cuerpo });
    }),
  );
  return { pedidos, altas, cambios };
}

const panel = () => screen.getByRole("dialog", { name: /propuesta con ia/i });
const grupo = (nombre: RegExp) => within(panel()).getByRole("group", { name: nombre });

/** Abre el panel desde cero (botón del encabezado). */
async function abrirDesdeCero() {
  renderRedes();
  await screen.findByText(idea.titulo);
  await userEvent.click(screen.getByRole("button", { name: /^propuesta con ia$/i }));
}
async function completarPedido() {
  await userEvent.type(
    within(panel()).getByRole("textbox", { name: /tema o destino/i }),
    "Cataratas del Iguazú",
  );
  await userEvent.click(within(grupo(/canal/i)).getByRole("button", { name: /instagram/i }));
  await userEvent.click(
    within(grupo(/tono u objetivo/i)).getByRole("button", { name: /promocional/i }),
  );
}
async function generar() {
  await userEvent.click(within(panel()).getByRole("button", { name: /^generar/i }));
}

describe("RF-119 propuesta", () => {
  it("RF-119 el formulario del pedido pide tema, canal y tono", async () => {
    await abrirDesdeCero();

    const p = within(panel());
    expect(p.getByRole("textbox", { name: /tema o destino/i })).toBeInTheDocument();
    expect(p.getByRole("group", { name: /canal/i })).toBeInTheDocument();
    expect(p.getByRole("group", { name: /tono u objetivo/i })).toBeInTheDocument();
    expect(p.getByRole("button", { name: /^generar/i })).toBeInTheDocument();
  });

  it("RF-119 pide a la IA solo tema, canal y tono, y muestra los borradores", async () => {
    const { pedidos } = espiar([borradoresDe(2)]);
    await abrirDesdeCero();
    await completarPedido();

    await generar();

    expect(await within(panel()).findByText("Borrador 1")).toBeInTheDocument();
    expect(within(panel()).getByText("Borrador 2")).toBeInTheDocument();
    expect(within(panel()).getByText("Texto del borrador 1")).toBeInTheDocument();
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0]).toMatchObject({ tema: "Cataratas del Iguazú", canal: "instagram" });
    expect(String(pedidos[0]?.["tono"])).toMatch(/promocional/i);
    expect(Object.keys(pedidos[0] ?? {}).sort()).toEqual(["canal", "tema", "tono"]);
  });

  it("RF-119 no pide nada a la IA sin tema y lo avisa", async () => {
    const { pedidos } = espiar();
    await abrirDesdeCero();
    await userEvent.click(within(grupo(/canal/i)).getByRole("button", { name: /instagram/i }));

    await generar();

    expect(await within(panel()).findByText(/escribí el tema/i)).toBeInTheDocument();
    expect(pedidos).toHaveLength(0);
  });

  it("RF-119 no pide nada a la IA sin canal y lo avisa", async () => {
    const { pedidos } = espiar();
    await abrirDesdeCero();
    await userEvent.type(
      within(panel()).getByRole("textbox", { name: /tema o destino/i }),
      "Mendoza",
    );

    await generar();

    expect(await within(panel()).findByText(/elegí un canal/i)).toBeInTheDocument();
    expect(pedidos).toHaveLength(0);
  });

  it("RF-119 el primer borrador viene elegido", async () => {
    espiar([borradoresDe(3)]);
    await abrirDesdeCero();
    await completarPedido();
    await generar();
    await within(panel()).findByText("Borrador 1");

    const opciones = within(panel()).getAllByRole("radio");
    expect(opciones).toHaveLength(3);
    expect(opciones[0]).toBeChecked();
    expect(opciones[1]).not.toBeChecked();
  });

  it("RF-119 A1 regenerar vuelve a pedir con el tema y el tono ajustados y reemplaza los borradores", async () => {
    const { pedidos } = espiar([borradoresDe(2, "Borrador"), borradoresDe(2, "Otro")]);
    await abrirDesdeCero();
    await completarPedido();
    await generar();
    await within(panel()).findByText("Borrador 1");

    const tema = within(panel()).getByRole("textbox", { name: /tema o destino/i });
    await userEvent.clear(tema);
    await userEvent.type(tema, "Iguazú en familia");
    await userEvent.click(
      within(grupo(/tono u objetivo/i)).getByRole("button", { name: /informativo/i }),
    );
    await userEvent.click(within(panel()).getByRole("button", { name: /regenerar/i }));

    expect(await within(panel()).findByText("Otro 1")).toBeInTheDocument();
    expect(within(panel()).queryByText("Borrador 1")).not.toBeInTheDocument();
    expect(pedidos).toHaveLength(2);
    expect(pedidos[1]).toMatchObject({ tema: "Iguazú en familia", canal: "instagram" });
    expect(String(pedidos[1]?.["tono"])).toMatch(/informativo/i);
  });

  it("RF-119 A2 descartar cierra el panel sin guardar nada", async () => {
    const { altas, cambios } = espiar();
    await abrirDesdeCero();
    await completarPedido();
    await generar();
    await within(panel()).findByText("Borrador 1");

    await userEvent.click(within(panel()).getByRole("button", { name: /^descartar/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /propuesta con ia/i })).not.toBeInTheDocument();
    });
    expect(altas).toHaveLength(0);
    expect(cambios).toHaveLength(0);
  });

  it("RF-119 si la IA falla (502) muestra el error, ningún borrador y la opción de reintentar", async () => {
    servidor.use(
      http.post("*/api/contenidos/propuestas-ia", () =>
        problema(502, "La IA no respondió a tiempo."),
      ),
    );
    await abrirDesdeCero();
    await completarPedido();

    await generar();

    expect(await within(panel()).findByRole("alert")).toHaveTextContent(
      /la ia no respondió a tiempo/i,
    );
    expect(within(panel()).queryByRole("radio")).not.toBeInTheDocument();
    expect(within(panel()).getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
  });

  it("RF-119 «Reintentar» repite el mismo pedido y, si la IA responde, muestra los borradores", async () => {
    const pedidos: Record<string, unknown>[] = [];
    servidor.use(
      http.post("*/api/contenidos/propuestas-ia", async ({ request }) => {
        pedidos.push((await request.clone().json()) as Record<string, unknown>);
        if (pedidos.length === 1) return problema(502, "Falló la IA.");
        return HttpResponse.json({ borradores: borradoresDe(2) });
      }),
    );
    await abrirDesdeCero();
    await completarPedido();
    await generar();

    await userEvent.click(await within(panel()).findByRole("button", { name: /reintentar/i }));

    expect(await within(panel()).findByText("Borrador 1")).toBeInTheDocument();
    expect(within(panel()).queryByRole("alert")).not.toBeInTheDocument();
    expect(pedidos).toHaveLength(2);
    expect(pedidos[1]).toEqual(pedidos[0]);
  });

  it("RF-119 A3 desde una pieza en idea: el panel nombra la pieza y toma su título y canal", async () => {
    espiar();
    renderRedes();
    await userEvent.click(
      within(await tarjeta(idea.titulo)).getByRole("button", { name: /propuesta con ia/i }),
    );

    const p = within(panel());
    expect(p.getByText(new RegExp(idea.titulo, "i"))).toBeInTheDocument();
    expect(p.getByRole("textbox", { name: /tema o destino/i })).toHaveValue(idea.titulo);
    expect(within(grupo(/canal/i)).getByRole("button", { name: /instagram/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("RF-119 A3 también se ofrece en una pieza en producción, pero no en listo ni publicado", async () => {
    renderRedes();

    expect(
      within(await tarjeta(enProduccion.titulo)).getByRole("button", { name: /propuesta con ia/i }),
    ).toBeInTheDocument();
    expect(
      within(await tarjeta(listo.titulo)).queryByRole("button", { name: /propuesta con ia/i }),
    ).toBeNull();
    expect(
      within(await tarjeta(publicado.titulo)).queryByRole("button", { name: /propuesta con ia/i }),
    ).toBeNull();
  });
});

describe("RF-121 guardar borrador", () => {
  async function conBorradores() {
    await abrirDesdeCero();
    await completarPedido();
    await generar();
    await within(panel()).findByText("Borrador 1");
  }

  it("RF-121 guarda el borrador elegido como pieza nueva (POST /contenidos) con su fecha", async () => {
    const { altas, cambios } = espiar([borradoresDe(2)]);
    await conBorradores();

    await userEvent.click(within(panel()).getAllByRole("radio")[1] as HTMLElement);
    await userEvent.type(within(panel()).getByLabelText(/fecha de publicación/i), "2026-12-20");
    await userEvent.click(within(panel()).getByRole("button", { name: /guardar en la pieza/i }));

    await waitFor(() => {
      expect(altas).toHaveLength(1);
    });
    expect(altas[0]).toMatchObject({
      titulo: "Borrador 2",
      texto: "Texto del borrador 2",
      canal: "instagram",
      fecha_publicacion: "2026-12-20",
    });
    expect(cambios).toHaveLength(0);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /propuesta con ia/i })).not.toBeInTheDocument();
    });
  });

  it("RF-121 guarda el texto editado por la persona", async () => {
    const { altas } = espiar([borradoresDe(2)]);
    await conBorradores();

    await userEvent.click(
      within(panel()).getAllByRole("button", { name: /^editar/i })[0] as HTMLElement,
    );
    const texto = within(panel()).getByRole("textbox", { name: /texto del borrador/i });
    await userEvent.clear(texto);
    await userEvent.type(texto, "Versión corregida a mano");
    await userEvent.type(within(panel()).getByLabelText(/fecha de publicación/i), "2026-12-20");
    await userEvent.click(within(panel()).getByRole("button", { name: /guardar en la pieza/i }));

    await waitFor(() => {
      expect(altas).toHaveLength(1);
    });
    expect(altas[0]).toMatchObject({ titulo: "Borrador 1", texto: "Versión corregida a mano" });
  });

  it("RF-121 no guarda sin fecha de publicación y lo avisa", async () => {
    const { altas } = espiar([borradoresDe(2)]);
    await conBorradores();

    await userEvent.click(within(panel()).getByRole("button", { name: /guardar en la pieza/i }));

    expect(await within(panel()).findByText(/elegí la fecha de publicación/i)).toBeInTheDocument();
    expect(altas).toHaveLength(0);
  });

  it("RF-121 A3 desde una pieza existente aplica el borrador a esa pieza (PATCH) y no crea otra", async () => {
    const { altas, cambios } = espiar([borradoresDe(2)]);
    renderRedes();
    await userEvent.click(
      within(await tarjeta(idea.titulo)).getByRole("button", { name: /propuesta con ia/i }),
    );
    await generar();
    await within(panel()).findByText("Borrador 1");

    await userEvent.click(within(panel()).getAllByRole("radio")[1] as HTMLElement);
    await userEvent.click(within(panel()).getByRole("button", { name: /guardar en la pieza/i }));

    await waitFor(() => {
      expect(cambios).toHaveLength(1);
    });
    expect(cambios[0]?.id).toBe(idea.id);
    expect(cambios[0]?.cuerpo).toMatchObject({
      titulo: "Borrador 2",
      texto: "Texto del borrador 2",
    });
    expect(cambios[0]?.cuerpo).not.toHaveProperty("estado_kanban");
    expect(altas).toHaveLength(0);
  });

  it("RF-121 A3 desde una pieza en producción la deja en esa columna (el PATCH no mueve el estado)", async () => {
    const { cambios } = espiar([borradoresDe(1)]);
    renderRedes();
    await userEvent.click(
      within(await tarjeta(enProduccion.titulo)).getByRole("button", { name: /propuesta con ia/i }),
    );
    await generar();
    await within(panel()).findByText("Borrador 1");

    await userEvent.click(within(panel()).getByRole("button", { name: /guardar en la pieza/i }));

    await waitFor(() => {
      expect(cambios).toHaveLength(1);
    });
    expect(cambios[0]?.id).toBe(enProduccion.id);
    expect(cambios[0]?.cuerpo).not.toHaveProperty("estado_kanban");
  });

  it("RF-121 si el guardado falla muestra el error y deja los borradores para reintentar", async () => {
    espiar([borradoresDe(2)]);
    servidor.use(http.post("*/api/contenidos", () => problema(422, "Fecha inválida.")));
    await conBorradores();
    await userEvent.type(within(panel()).getByLabelText(/fecha de publicación/i), "2026-12-20");

    await userEvent.click(within(panel()).getByRole("button", { name: /guardar en la pieza/i }));

    expect(await within(panel()).findByRole("alert")).toBeInTheDocument();
    expect(within(panel()).getByText("Borrador 1")).toBeInTheDocument();
  });
});
