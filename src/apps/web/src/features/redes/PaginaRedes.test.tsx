import { crearCliente, type ContenidoRed } from "@rumbo/shared";
import {
  contenidosMock,
  crearServidor,
  manejadoresRedes,
  manejadoresRedesPara,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PaginaRedes } from "./PaginaRedes";

const servidor = crearServidor();
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
beforeEach(() => {
  // Hoy es jueves 12/11/26; solo se falsea la fecha para no frenar a MSW ni a Testing Library.
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

const [idea, enProduccion, listo, publicado] = contenidosMock as [
  ContenidoRed,
  ContenidoRed,
  ContenidoRed,
  ContenidoRed,
];
const tituloDescartado = "Sorteo de un fin de semana en Mendoza";

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

/** Tarjeta de una pieza en el tablero (article, li o data-testid="tarjeta-…"), buscada por título. */
const tarjeta = async (titulo: string) => {
  const texto = await screen.findByText(titulo);
  const caja = texto.closest("article, li, [data-testid^='tarjeta']") as HTMLElement | null;
  if (!caja) throw new Error(`no hay una tarjeta para ${titulo}`);
  return caja;
};
/** Columna del tablero, buscada por el encabezado (section, región o data-testid="columna-…"). */
const columna = async (nombre: RegExp) => {
  const encabezado = await screen.findByRole("heading", { name: nombre });
  return (encabezado.closest("section, [role='region'], [data-testid^='columna']") ??
    encabezado.parentElement) as HTMLElement;
};

/** Registra las escrituras que hace la pantalla y responde como el mock. */
function espiarEscrituras() {
  const patch: { id: string; cuerpo: Record<string, unknown> }[] = [];
  const post: Record<string, unknown>[] = [];
  const descartes: string[] = [];
  servidor.use(
    http.patch("*/api/contenidos/:id", async ({ params, request }) => {
      const cuerpo = (await request.clone().json()) as Record<string, unknown>;
      patch.push({ id: String(params["id"]), cuerpo });
      const c = contenidosMock.find((x) => x.id === params["id"]);
      return HttpResponse.json({ ...c, ...cuerpo });
    }),
    http.post("*/api/contenidos", async ({ request }) => {
      const cuerpo = (await request.clone().json()) as Record<string, unknown>;
      post.push(cuerpo);
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
    http.post("*/api/contenidos/:id/descartar", ({ params }) => {
      descartes.push(String(params["id"]));
      const c = contenidosMock.find((x) => x.id === params["id"]);
      return HttpResponse.json({ ...c, estado_kanban: "descartado" });
    }),
  );
  return { patch, post, descartes };
}

describe("RF-114 kanban", () => {
  beforeEach(() => {
    servidor.use(...manejadoresRedes);
  });

  it("RF-114 muestra una columna por estado: idea, en producción, listo y publicado", async () => {
    renderRedes();

    for (const nombre of [/^idea/i, /^en producción/i, /^listo/i, /^publicado/i]) {
      expect(await screen.findByRole("heading", { name: nombre })).toBeInTheDocument();
    }
  });

  it("RF-114 ubica cada pieza en la columna de su estado", async () => {
    renderRedes();

    expect(within(await columna(/^idea/i)).getByText(idea.titulo)).toBeInTheDocument();
    expect(
      within(await columna(/^en producción/i)).getByText(enProduccion.titulo),
    ).toBeInTheDocument();
    expect(within(await columna(/^listo/i)).getByText(listo.titulo)).toBeInTheDocument();
    expect(within(await columna(/^publicado/i)).getByText(publicado.titulo)).toBeInTheDocument();
  });

  it("RF-114 no muestra las piezas descartadas", async () => {
    renderRedes();
    await screen.findByText(idea.titulo);

    expect(screen.queryByText(tituloDescartado)).not.toBeInTheDocument();
  });

  it("RF-114 muestra el canal y la fecha de cada pieza", async () => {
    renderRedes();

    const t = await tarjeta(listo.titulo);
    expect(within(t).getByText(/WhatsApp/i)).toBeInTheDocument();
    expect(within(t).getByText(/20\/11\/26/)).toBeInTheDocument();
  });

  it("RF-114 avanza una pieza de idea a en producción", async () => {
    const { patch } = espiarEscrituras();
    renderRedes();

    await userEvent.click(
      within(await tarjeta(idea.titulo)).getByRole("button", { name: /avanzar/i }),
    );

    await waitFor(() => {
      expect(patch).toEqual([{ id: idea.id, cuerpo: { estado_kanban: "en_produccion" } }]);
    });
  });

  it("RF-114 retrocede una pieza de listo a en producción (A5)", async () => {
    const { patch } = espiarEscrituras();
    renderRedes();

    await userEvent.click(
      within(await tarjeta(listo.titulo)).getByRole("button", { name: /retroceder/i }),
    );

    await waitFor(() => {
      expect(patch).toEqual([{ id: listo.id, cuerpo: { estado_kanban: "en_produccion" } }]);
    });
  });

  it("RF-114 marca como publicado desde listo (A3)", async () => {
    const { patch } = espiarEscrituras();
    renderRedes();

    await userEvent.click(
      within(await tarjeta(listo.titulo)).getByRole("button", { name: /avanzar/i }),
    );

    await waitFor(() => {
      expect(patch).toEqual([{ id: listo.id, cuerpo: { estado_kanban: "publicado" } }]);
    });
  });

  it("RF-114 una idea no se retrocede y una pieza publicada no admite movimientos ni descarte", async () => {
    renderRedes();

    expect(
      within(await tarjeta(idea.titulo)).queryByRole("button", { name: /retroceder/i }),
    ).toBeNull();
    const publicada = await tarjeta(publicado.titulo);
    expect(
      within(publicada).queryByRole("button", { name: /avanzar|retroceder|descartar/i }),
    ).toBeNull();
  });

  it("RF-114 avisa si el servidor rechaza el movimiento (409)", async () => {
    servidor.use(
      http.patch("*/api/contenidos/:id", () =>
        HttpResponse.json(
          {
            type: "about:blank",
            title: "Conflicto",
            status: 409,
            detail: "No se pasa de idea a listo.",
          },
          { status: 409, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );
    renderRedes();

    await userEvent.click(
      within(await tarjeta(idea.titulo)).getByRole("button", { name: /avanzar/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pasa de idea a listo/i);
  });
});

describe("RF-113 alta de una pieza", () => {
  beforeEach(() => {
    servidor.use(...manejadoresRedes);
  });

  it("RF-113 crea una pieza con título, canal y fecha; nace en idea", async () => {
    const { post } = espiarEscrituras();
    renderRedes();
    await screen.findByText(idea.titulo);

    await userEvent.click(screen.getByRole("button", { name: /nueva pieza/i }));
    await userEvent.type(screen.getByLabelText(/título/i), "Reel de Cataratas");
    await userEvent.selectOptions(screen.getByLabelText(/canal/i), "tiktok");
    await userEvent.type(screen.getByLabelText(/fecha de publicación/i), "2026-12-20");
    await userEvent.click(screen.getByRole("button", { name: /^(crear|guardar)/i }));

    await waitFor(() => {
      expect(post).toHaveLength(1);
    });
    expect(post[0]).toMatchObject({
      titulo: "Reel de Cataratas",
      canal: "tiktok",
      fecha_publicacion: "2026-12-20",
    });
  });

  it("RF-113 no envía el alta sin título y lo avisa", async () => {
    const { post } = espiarEscrituras();
    renderRedes();
    await screen.findByText(idea.titulo);

    await userEvent.click(screen.getByRole("button", { name: /nueva pieza/i }));
    await userEvent.click(screen.getByRole("button", { name: /^(crear|guardar)/i }));

    expect(await screen.findByText(/escribí el título o la idea/i)).toBeInTheDocument();
    expect(post).toHaveLength(0);
  });
});

describe("RF-115 edición y descarte", () => {
  beforeEach(() => {
    servidor.use(...manejadoresRedes);
  });

  it("RF-115 edita el título de una pieza", async () => {
    const { patch } = espiarEscrituras();
    renderRedes();

    await userEvent.click(
      within(await tarjeta(idea.titulo)).getByRole("button", { name: /editar/i }),
    );
    const campo = screen.getByLabelText(/título/i);
    await userEvent.clear(campo);
    await userEvent.type(campo, "Escapadas de invierno");
    await userEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(patch).toHaveLength(1);
    });
    expect(patch[0]?.id).toBe(idea.id);
    expect(patch[0]?.cuerpo).toMatchObject({ titulo: "Escapadas de invierno" });
  });

  it("RF-116 reprograma la fecha de publicación (A2)", async () => {
    const { patch } = espiarEscrituras();
    renderRedes();

    await userEvent.click(
      within(await tarjeta(idea.titulo)).getByRole("button", { name: /editar/i }),
    );
    const fecha = screen.getByLabelText(/fecha de publicación/i);
    await userEvent.clear(fecha);
    await userEvent.type(fecha, "2026-12-30");
    await userEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(patch[0]?.cuerpo).toMatchObject({ fecha_publicacion: "2026-12-30" });
    });
  });

  it("RF-115 descarta una pieza (baja lógica) tras confirmar si se pide (A4)", async () => {
    const { descartes } = espiarEscrituras();
    renderRedes();

    await userEvent.click(
      within(await tarjeta(idea.titulo)).getByRole("button", { name: /descartar/i }),
    );
    const confirmar = screen.queryByRole("button", { name: /^(confirmar|sí, descartar|descartar)$/i });
    if (confirmar) await userEvent.click(confirmar);

    await waitFor(() => {
      expect(descartes).toEqual([idea.id]);
    });
  });
});

describe("RF-116 calendario", () => {
  beforeEach(() => {
    servidor.use(...manejadoresRedes);
  });

  /** La vista del calendario se alterna con una pestaña (o botón) llamada «Calendario». */
  const abrirCalendario = async () => {
    renderRedes();
    await screen.findByText(idea.titulo);
    const pestana = screen.queryByRole("tab", { name: /calendario/i });
    await userEvent.click(pestana ?? screen.getByRole("button", { name: /calendario/i }));
  };

  it("RF-116 muestra las publicaciones programadas del mes en curso", async () => {
    await abrirCalendario();

    expect(await screen.findByRole("heading", { name: /noviembre 2026/i })).toBeInTheDocument();
    expect((await screen.findAllByText(listo.titulo)).length).toBeGreaterThan(0);
  });

  it("RF-116 no muestra las piezas de otros meses", async () => {
    await abrirCalendario();
    await screen.findByRole("heading", { name: /noviembre 2026/i });

    expect(screen.queryByText(idea.titulo)).not.toBeInTheDocument();
    expect(screen.queryByText(enProduccion.titulo)).not.toBeInTheDocument();
  });

  it("RF-116 pide al backend solo el rango del mes que se ve", async () => {
    const rangos: (string | null)[][] = [];
    servidor.use(
      http.get("*/api/contenidos", ({ request }) => {
        const q = new URL(request.url).searchParams;
        rangos.push([q.get("desde"), q.get("hasta")]);
        return HttpResponse.json({ items: [], total: 0, pagina: 1, tamano: 100 });
      }),
    );
    renderRedes();
    const pestana = await screen.findByRole("tab", { name: /calendario/i });
    await userEvent.click(pestana);

    await waitFor(() => {
      expect(rangos).toContainEqual(["2026-11-01", "2026-11-30"]);
    });
  });

  it("RF-116 al pasar al mes siguiente aparecen las piezas de diciembre", async () => {
    await abrirCalendario();
    await screen.findByRole("heading", { name: /noviembre 2026/i });

    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));

    expect(await screen.findByRole("heading", { name: /diciembre 2026/i })).toBeInTheDocument();
    expect(await screen.findByText(enProduccion.titulo)).toBeInTheDocument();
  });
});

describe("RF-117 acceso al módulo de redes", () => {
  it("RF-117 sin acceso a redes (403) muestra el aviso y ningún tablero", async () => {
    servidor.use(...manejadoresRedesPara("empleado", false));
    renderRedes();

    expect(await screen.findByText(/no tenés acceso al módulo de redes/i)).toBeInTheDocument();
    expect(screen.queryByText(idea.titulo)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /nueva pieza/i })).not.toBeInTheDocument();
  });

  it("RF-117 el freelance nunca ve el tablero", async () => {
    servidor.use(...manejadoresRedesPara("freelance", true));
    renderRedes();

    expect(await screen.findByText(/no tenés acceso al módulo de redes/i)).toBeInTheDocument();
    expect(screen.queryByText(idea.titulo)).not.toBeInTheDocument();
  });
});
