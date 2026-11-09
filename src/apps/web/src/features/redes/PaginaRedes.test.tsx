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
  const caja = texto.closest<HTMLElement>("article, li, [data-testid^='tarjeta']");
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
      within(publicada).queryByRole("button", { name: /avanzar|retroceder|descartar|editar/i }),
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

describe("RF-115 edición y RF-117 descarte", () => {
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

  it("RF-115 reprograma la fecha de publicación (A2)", async () => {
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

  it("RF-117 descarta una pieza (baja lógica) solo tras confirmar (A4)", async () => {
    const { descartes } = espiarEscrituras();
    renderRedes();

    await userEvent.click(
      within(await tarjeta(idea.titulo)).getByRole("button", { name: /descartar/i }),
    );
    expect(descartes).toEqual([]);
    await userEvent.click(screen.getByRole("button", { name: /^confirmar$/i }));

    await waitFor(() => {
      expect(descartes).toEqual([idea.id]);
    });
  });

  it("RF-117 cancelar el descarte no envía nada y deja la pieza", async () => {
    const { descartes } = espiarEscrituras();
    renderRedes();

    await userEvent.click(
      within(await tarjeta(idea.titulo)).getByRole("button", { name: /descartar/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: /^cancelar$/i }));

    expect(screen.queryByRole("button", { name: /^confirmar$/i })).toBeNull();
    expect(
      within(await tarjeta(idea.titulo)).getByRole("button", { name: /descartar/i }),
    ).toBeInTheDocument();
    expect(descartes).toEqual([]);
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
        return HttpResponse.json({ items: [], total: 0, pagina: 1, por_pagina: 100 });
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

describe("acceso al módulo de redes (DEC-0008, DEC-0013)", () => {
  it("DEC-0013 sin acceso a redes (403) muestra el aviso y ningún tablero", async () => {
    servidor.use(...manejadoresRedesPara("empleado", false));
    renderRedes();

    expect(await screen.findByText(/no tenés acceso al módulo de redes/i)).toBeInTheDocument();
    expect(screen.queryByText(idea.titulo)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /nueva pieza/i })).not.toBeInTheDocument();
  });

  it("DEC-0008 el freelance nunca ve el tablero", async () => {
    servidor.use(...manejadoresRedesPara("freelance", true));
    renderRedes();

    expect(await screen.findByText(/no tenés acceso al módulo de redes/i)).toBeInTheDocument();
    expect(screen.queryByText(idea.titulo)).not.toBeInTheDocument();
  });
});

describe("RF-114 columnas por páginas", () => {
  /** El servidor tiene 25 ideas y entrega `por_pagina` por vez; las demás columnas, vacías. */
  function conMuchasIdeas(pedidos: URLSearchParams[] = []) {
    servidor.use(
      http.get("*/api/contenidos", ({ request }) => {
        const q = new URL(request.url).searchParams;
        pedidos.push(q);
        const todas =
          q.get("estado_kanban") === "idea"
            ? Array.from({ length: 25 }, (_, i) => ({
                ...idea,
                id: `idea-${String(i + 1)}`,
                titulo: `Pieza ${String(i + 1)}`,
              }))
            : [];
        const pagina = Number(q.get("pagina") ?? 1);
        const por = Number(q.get("por_pagina") ?? 20);
        return HttpResponse.json({
          items: todas.slice((pagina - 1) * por, pagina * por),
          total: todas.length,
          pagina,
          por_pagina: por,
        });
      }),
    );
  }

  it("RF-114 trae más piezas de una columna con «Ver más» cuando el total supera la página", async () => {
    conMuchasIdeas();
    renderRedes();

    expect(await screen.findByText("Pieza 20")).toBeInTheDocument();
    expect(screen.queryByText("Pieza 21")).not.toBeInTheDocument();
    const columnaIdea = await columna(/^idea/i);
    expect(within(columnaIdea).getByRole("heading", { name: /\(25\)/ })).toBeInTheDocument();

    await userEvent.click(within(columnaIdea).getByRole("button", { name: /ver más/i }));

    expect(await screen.findByText("Pieza 25")).toBeInTheDocument();
    expect(within(columnaIdea).queryByRole("button", { name: /ver más/i })).toBeNull();
  });

  it("RF-114 pide cada columna por su estado y las publicadas sin límite de fecha", async () => {
    const pedidos: URLSearchParams[] = [];
    conMuchasIdeas(pedidos);
    renderRedes();
    await screen.findByText("Pieza 20");

    const estados = pedidos.map((q) => q.get("estado_kanban")).sort();
    expect(estados).toEqual(["en_produccion", "idea", "listo", "publicado"]);
    const publicadas = pedidos.find((q) => q.get("estado_kanban") === "publicado");
    expect(publicadas?.has("desde")).toBe(false);
  });

  it("RF-114 una pieza publicada hace más de 30 días aparece en su columna", async () => {
    const vieja = {
      ...publicado,
      titulo: "Publicación de agosto",
      fecha_publicacion: "2026-08-01",
    };
    servidor.use(
      http.get("*/api/contenidos", ({ request }) => {
        const publicadas = new URL(request.url).searchParams.get("estado_kanban") === "publicado";
        return HttpResponse.json({
          items: publicadas ? [vieja] : [],
          total: publicadas ? 1 : 0,
          pagina: 1,
          por_pagina: 20,
        });
      }),
    );
    renderRedes();

    expect(
      within(await columna(/^publicado/i)).getByText("Publicación de agosto"),
    ).toBeInTheDocument();
  });
});

describe("RF-117 piezas descartadas", () => {
  beforeEach(() => {
    servidor.use(...manejadoresRedes);
  });

  it("RF-117 «Mostrar descartadas» lista las piezas descartadas, sin acciones", async () => {
    renderRedes();
    await screen.findByText(idea.titulo);

    await userEvent.click(screen.getByRole("switch", { name: /mostrar descartadas/i }));

    const t = await tarjeta(tituloDescartado);
    expect(within(t).queryByRole("button")).toBeNull();
    expect(screen.queryByText(idea.titulo)).not.toBeInTheDocument();
    expect(screen.getByText(/las piezas descartadas se conservan/i)).toBeInTheDocument();
  });

  it("RF-117 al apagar el interruptor vuelve el tablero", async () => {
    renderRedes();
    await screen.findByText(idea.titulo);
    const interruptor = screen.getByRole("switch", { name: /mostrar descartadas/i });
    await userEvent.click(interruptor);
    await tarjeta(tituloDescartado);

    await userEvent.click(interruptor);

    expect(await screen.findByText(idea.titulo)).toBeInTheDocument();
    expect(screen.queryByText(tituloDescartado)).not.toBeInTheDocument();
  });
});

describe("RF-114 filtro por canal", () => {
  beforeEach(() => {
    servidor.use(...manejadoresRedes);
  });

  it("RF-114 filtrar por TikTok deja en el tablero solo las piezas de ese canal", async () => {
    renderRedes();
    await screen.findByText(idea.titulo);

    await userEvent.click(screen.getByRole("button", { name: "TikTok" }));

    expect(await screen.findByText(publicado.titulo)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(idea.titulo)).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "TikTok" })).toHaveAttribute("aria-pressed", "true");
  });

  it("RF-116 el filtro de canal también se aplica al calendario", async () => {
    const pedidos: (string | null)[][] = [];
    servidor.use(
      http.get("*/api/contenidos", ({ request }) => {
        const q = new URL(request.url).searchParams;
        pedidos.push([q.get("canal"), q.get("desde")]);
        return HttpResponse.json({ items: [], total: 0, pagina: 1, por_pagina: 100 });
      }),
    );
    renderRedes();
    await userEvent.click(await screen.findByRole("button", { name: "TikTok" }));
    await userEvent.click(screen.getByRole("tab", { name: /calendario/i }));

    await waitFor(() => {
      expect(pedidos).toContainEqual(["tiktok", "2026-11-01"]);
    });
  });
});

describe("RF-114 errores de las acciones", () => {
  beforeEach(() => {
    servidor.use(...manejadoresRedes);
  });

  const rechazarIdea = http.patch("*/api/contenidos/:id", ({ params }) => {
    if (params["id"] !== idea.id) {
      const c = contenidosMock.find((x) => x.id === params["id"]);
      return HttpResponse.json({ ...c, estado_kanban: "en_produccion" });
    }
    return HttpResponse.json(
      { type: "about:blank", title: "Conflicto", status: 409, detail: "Movimiento rechazado." },
      { status: 409, headers: { "Content-Type": "application/problem+json" } },
    );
  });

  it("RF-114 un error se limpia cuando otra acción sale bien", async () => {
    servidor.use(rechazarIdea);
    renderRedes();
    await userEvent.click(
      within(await tarjeta(idea.titulo)).getByRole("button", { name: /avanzar/i }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/movimiento rechazado/i);

    await userEvent.click(
      within(await tarjeta(listo.titulo)).getByRole("button", { name: /retroceder/i }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("RF-114 si el servidor rechaza un movimiento, el tablero se vuelve a leer", async () => {
    let lecturas = 0;
    servidor.use(
      rechazarIdea,
      http.get("*/api/contenidos", () => {
        lecturas += 1;
        return HttpResponse.json({ items: [idea], total: 1, pagina: 1, por_pagina: 20 });
      }),
    );
    renderRedes();
    const primera = (await screen.findAllByRole("article"))[0] as HTMLElement;
    const antes = lecturas;
    await userEvent.click(within(primera).getByRole("button", { name: /avanzar/i }));
    await screen.findByRole("alert");

    await waitFor(() => {
      expect(lecturas).toBeGreaterThan(antes);
    });
  });
});

describe("403 después de cargar (DEC-0013)", () => {
  const sinPermiso = http.get("*/api/contenidos", () =>
    HttpResponse.json(
      { type: "about:blank", title: "Sin permiso", status: 403, detail: "Sin acceso." },
      { status: 403, headers: { "Content-Type": "application/problem+json" } },
    ),
  );

  it("DEC-0013 un 403 en una relectura del tablero muestra el aviso de acceso", async () => {
    servidor.use(...manejadoresRedes);
    espiarEscrituras();
    renderRedes();
    const t = await tarjeta(idea.titulo);
    servidor.use(sinPermiso);

    await userEvent.click(within(t).getByRole("button", { name: /avanzar/i }));

    expect(await screen.findByText(/no tenés acceso al módulo de redes/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /nueva pieza/i })).not.toBeInTheDocument();
  });

  it("DEC-0013 un 403 en el calendario muestra el aviso de acceso", async () => {
    servidor.use(...manejadoresRedes);
    renderRedes();
    await screen.findByText(idea.titulo);
    servidor.use(sinPermiso);

    await userEvent.click(screen.getByRole("tab", { name: /calendario/i }));

    expect(await screen.findByText(/no tenés acceso al módulo de redes/i)).toBeInTheDocument();
    expect(screen.queryByText(/no pudimos cargar el calendario/i)).not.toBeInTheDocument();
  });
});

describe("RF-114 columna fallida", () => {
  it("RF-114 una columna que no carga muestra su error y no «(0)»", async () => {
    servidor.use(
      http.get("*/api/contenidos", ({ request }) =>
        new URL(request.url).searchParams.get("estado_kanban") === "listo"
          ? HttpResponse.json(
              { type: "about:blank", title: "Error", status: 500, detail: "Falla del servidor." },
              { status: 500, headers: { "Content-Type": "application/problem+json" } },
            )
          : undefined,
      ),
      ...manejadoresRedes,
    );
    renderRedes();

    const listos = await columna(/^listo/i);
    expect(await within(listos).findByRole("alert")).toHaveTextContent(/no pudimos cargar/i);
    expect(within(listos).queryByText(/\(0\)/)).toBeNull();
  });
});

describe("RF-114 kanban orden de las columnas", () => {
  const reciente = {
    ...publicado,
    id: "pub-reciente",
    titulo: "Publicada reciente",
    fecha_publicacion: "2026-11-10",
  };
  const vieja = {
    ...publicado,
    id: "pub-vieja",
    titulo: "Publicada vieja",
    fecha_publicacion: "2026-08-01",
  };

  /** Responde como la API: ascendente por defecto y descendente con `orden=desc`. */
  function conPublicadas(pedidos: URLSearchParams[] = []) {
    servidor.use(
      http.get("*/api/contenidos", ({ request }) => {
        const q = new URL(request.url).searchParams;
        pedidos.push(q);
        let items: ContenidoRed[] = [];
        if (q.get("estado_kanban") === "publicado") {
          items = q.get("orden") === "desc" ? [reciente, vieja] : [vieja, reciente];
        }
        return HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 20 });
      }),
    );
  }

  it("RF-114 la columna Publicado pide orden=desc y sin desde", async () => {
    const pedidos: URLSearchParams[] = [];
    conPublicadas(pedidos);
    renderRedes();
    await screen.findByText("Publicada reciente");

    const publicadas = pedidos.filter((q) => q.get("estado_kanban") === "publicado");
    expect(publicadas.length).toBeGreaterThan(0);
    for (const q of publicadas) {
      expect(q.get("orden")).toBe("desc");
      expect(q.has("desde")).toBe(false);
    }
  });

  it("RF-114 «Ver más» de Publicado también pide orden=desc y sin desde", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(
      http.get("*/api/contenidos", ({ request }) => {
        const q = new URL(request.url).searchParams;
        pedidos.push(q);
        const pagina = Number(q.get("pagina") ?? 1);
        const por = Number(q.get("por_pagina") ?? 20);
        const todas =
          q.get("estado_kanban") === "publicado"
            ? Array.from({ length: 25 }, (_, i) => ({
                ...publicado,
                id: `pub-${String(i + 1)}`,
                titulo: `Publicada ${String(i + 1)}`,
              }))
            : [];
        return HttpResponse.json({
          items: todas.slice((pagina - 1) * por, pagina * por),
          total: todas.length,
          pagina,
          por_pagina: por,
        });
      }),
    );
    renderRedes();

    const col = await columna(/^publicado/i);
    await userEvent.click(await within(col).findByRole("button", { name: /ver más/i }));
    await waitFor(() => {
      expect(pedidos.some((q) => q.get("pagina") === "2")).toBe(true);
    });

    const segunda = pedidos.filter(
      (q) => q.get("estado_kanban") === "publicado" && q.get("pagina") === "2",
    );
    expect(segunda.length).toBeGreaterThan(0);
    for (const q of segunda) {
      expect(q.get("orden")).toBe("desc");
      expect(q.has("desde")).toBe(false);
    }
  });

  it("RF-114 en Publicado la pieza reciente aparece antes que la vieja", async () => {
    conPublicadas();
    renderRedes();

    const col = await columna(/^publicado/i);
    await within(col).findByText("Publicada vieja");
    const titulos = within(col)
      .getAllByText(/^Publicada (reciente|vieja)$/)
      .map((n) => n.textContent);
    expect(titulos).toEqual(["Publicada reciente", "Publicada vieja"]);
  });

  it("RF-114 las demás columnas no mandan orden", async () => {
    const pedidos: URLSearchParams[] = [];
    conPublicadas(pedidos);
    renderRedes();
    await screen.findByText("Publicada reciente");

    const otras = pedidos.filter((q) => q.get("estado_kanban") !== "publicado");
    expect(otras.map((q) => q.get("estado_kanban")).sort()).toEqual([
      "en_produccion",
      "idea",
      "listo",
    ]);
    for (const q of otras) expect(q.has("orden")).toBe(false);
  });

  it("RF-117 las descartadas no mandan orden", async () => {
    const pedidos: URLSearchParams[] = [];
    conPublicadas(pedidos);
    renderRedes();
    await screen.findByText("Publicada reciente");

    await userEvent.click(screen.getByRole("switch", { name: /mostrar descartadas/i }));
    await waitFor(() => {
      expect(pedidos.some((q) => q.get("estado_kanban") === "descartado")).toBe(true);
    });

    const descartadas = pedidos.filter((q) => q.get("estado_kanban") === "descartado");
    for (const q of descartadas) expect(q.has("orden")).toBe(false);
  });
});
