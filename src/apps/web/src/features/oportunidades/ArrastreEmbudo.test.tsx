/**
 * T-171: mover las tarjetas del embudo a otra columna (CU-05, RF-016, RF-017, RF-020).
 *
 * Contrato para el implementador (jsdom no mide, así que el arrastre con puntero no se prueba acá;
 * se fija la forma accesible con teclado, que dispara la misma lógica que soltar la tarjeta):
 *
 * - Cada tarjeta (`<li>`) de una oportunidad que el usuario puede escribir (`puedeEscribirOportunidad`)
 *   y que tiene al menos un destino válido tiene un `button` cuyo nombre accesible empieza con «Mover»
 *   (por ejemplo «Mover Cusco»). Sin permiso de escritura, ese botón no existe.
 * - Al activarlo se abre un `menu` con un `menuitem` por destino válido, nombrado exactamente con la
 *   etiqueta de la columna destino («En gestión», «Ganada», «Perdida»). Los destinos inválidos no
 *   se ofrecen o aparecen deshabilitados (`aria-disabled`/`disabled`); `Cotizada` nunca se puede elegir.
 * - Tabla: nueva -> en_gestion, ganada, perdida; en_gestion -> ganada, perdida;
 *   cotizada -> ganada, perdida; perdida -> en_gestion; ganada -> nada (sin botón).
 * - nueva -> En gestión: POST /en-gestion directo. perdida -> En gestión: POST /reactivar directo.
 * - Ganada: abre el mismo grupo de confirmación del detalle (`role="group"`, aria-label
 *   «Ganar la oportunidad», con botones «Confirmar» y «Cancelar»); recién al confirmar va POST /ganar.
 * - Perdida: abre el mismo formulario del detalle (`form`, aria-label «Perder la oportunidad», con
 *   `select` «Motivo», «Confirmar» y «Cancelar»); POST /perder con `motivo_perdida`.
 * - Cancelar no llama a la API y la tarjeta sigue en su columna. Un error de la API deja la tarjeta
 *   en su columna y muestra el `detail` en un `role="alert"`.
 * - Éxito: la tarjeta aparece en la columna nueva (se invalidan las dos columnas) y los totales cambian.
 */
import { crearCliente } from "@rumbo/shared";
import {
  crearServidor,
  idOportunidadMock,
  manejadoresOportunidades,
  oportunidadesMock,
  usuariosPorRol,
  type RolMock,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { PaginaOportunidades } from "./PaginaOportunidades";

const servidor = crearServidor(...manejadoresOportunidades);
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

const asesores = [{ id: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03", nombre: "Ana Pérez" }];

const problema = (status: number, detail: string) =>
  HttpResponse.json(
    { type: "about:blank", title: "Error", status, detail },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );

interface Llamada {
  accion: string;
  id: string;
  cuerpo: Record<string, unknown>;
}

/**
 * Servidor con estado: el listado respeta el estado actual de cada oportunidad y los POST de
 * transición lo cambian (como la API real); registra las llamadas. `errores` fuerza un problema por acción.
 */
function servidorConEstado(errores: Partial<Record<string, [number, string]>> = {}) {
  const estados = new Map<string, string>(oportunidadesMock.map((o) => [o.id, o.estado]));
  const llamadas: Llamada[] = [];
  const hacia: Record<string, string> = {
    "en-gestion": "en_gestion",
    ganar: "ganada",
    perder: "perdida",
    reactivar: "en_gestion",
  };
  servidor.use(
    http.get("*/api/usuarios/asesores", () => HttpResponse.json(asesores)),
    http.get("*/api/oportunidades", ({ request }) => {
      const estado = new URL(request.url).searchParams.get("estado");
      const items = oportunidadesMock
        .map((o) => ({ ...o, estado: estados.get(o.id) as typeof o.estado }))
        .filter((o) => !estado || o.estado === estado);
      return HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 20 });
    }),
    http.post("*/api/oportunidades/:id/:accion", async ({ params, request }) => {
      const id = String(params["id"]);
      const accion = String(params["accion"]);
      if (!(accion in hacia)) return undefined;
      llamadas.push({
        id,
        accion,
        cuerpo: (await request
          .clone()
          .json()
          .catch(() => ({}))) as Record<string, unknown>,
      });
      const error = errores[accion];
      if (error) return problema(error[0], error[1]);
      estados.set(id, hacia[accion] ?? "");
      const o = oportunidadesMock.find((x) => x.id === id);
      return HttpResponse.json({ ...o, estado: hacia[accion] });
    }),
  );
  return llamadas;
}

function renderEmbudo(rol: RolMock = "empleado", usuario = usuariosPorRol[rol]) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/oportunidades"]}>
        <PaginaOportunidades cliente={cliente} usuario={usuario} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const columna = async (estado: string) => {
  const encabezado = await screen.findByRole("heading", { name: new RegExp(`^${estado}\\b`) });
  const seccion = encabezado.closest("section");
  if (!seccion) throw new Error(`La columna «${estado}» no es una sección`);
  return seccion;
};

const tarjeta = async (estado: string, destino: string) => {
  const li = (await within(await columna(estado)).findByText(destino)).closest("li");
  if (!li) throw new Error(`La tarjeta de «${destino}» no es un li`);
  return li;
};

/** Abre el menú de movimiento de una tarjeta con el teclado accesible. */
async function abrirMenu(estado: string, destino: string) {
  const usuario = userEvent.setup();
  const li = await tarjeta(estado, destino);
  await usuario.click(within(li).getByRole("button", { name: /^mover/i }));
  return usuario;
}

const destinosOfrecidos = () =>
  screen
    .queryAllByRole("menuitem")
    .filter((i) => !i.hasAttribute("disabled") && i.getAttribute("aria-disabled") !== "true")
    .map((i) => i.textContent.trim());

describe("RF-016 arrastrar: destinos válidos por estado", () => {
  it.each([
    ["Nueva", "Cusco", ["En gestión", "Ganada", "Perdida"]],
    ["En gestión", "Mendoza", ["Ganada", "Perdida"]],
    ["Cotizada", "Europa", ["Ganada", "Perdida"]],
    ["Perdida", "Miami", ["En gestión"]],
  ])("RF-016 desde %s (%s) se ofrece %j", async (estado, destino, esperados) => {
    servidorConEstado();
    renderEmbudo("empleado");

    await abrirMenu(estado, destino);

    expect(destinosOfrecidos().sort()).toEqual([...esperados].sort());
  });

  it("RF-016 cotizada nunca es un destino que se pueda elegir", async () => {
    servidorConEstado();
    renderEmbudo("empleado");

    await abrirMenu("Nueva", "Cusco");

    expect(destinosOfrecidos()).not.toContain("Cotizada");
  });

  it("RF-016 una oportunidad ganada no se puede mover: sin control de mover", async () => {
    servidorConEstado();
    renderEmbudo("empleado");
    const li = await tarjeta("Ganada", "Brasil");

    expect(within(li).queryByRole("button", { name: /^mover/i })).not.toBeInTheDocument();
  });

  it("RF-016 nueva a en gestión manda POST /en-gestion sin confirmación y la tarjeta pasa de columna", async () => {
    const llamadas = servidorConEstado();
    renderEmbudo("empleado");
    const usuario = await abrirMenu("Nueva", "Cusco");

    await usuario.click(screen.getByRole("menuitem", { name: "En gestión" }));

    await waitFor(async () => {
      expect(within(await columna("En gestión")).getByText("Cusco")).toBeInTheDocument();
    });
    expect(llamadas).toEqual([
      expect.objectContaining({ accion: "en-gestion", id: idOportunidadMock.nueva }),
    ]);
    expect(within(await columna("Nueva")).queryByText("Cusco")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Nueva\s*0$/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^En gestión\s*2$/ })).toBeInTheDocument();
  });
});

describe("RF-016 arrastrar al ganar", () => {
  it("RF-016 mover a Ganada abre la confirmación y todavía no llama a la API", async () => {
    const llamadas = servidorConEstado();
    renderEmbudo("empleado");
    const usuario = await abrirMenu("En gestión", "Mendoza");

    await usuario.click(screen.getByRole("menuitem", { name: "Ganada" }));

    expect(await screen.findByRole("group", { name: "Ganar la oportunidad" })).toBeInTheDocument();
    expect(llamadas).toEqual([]);
  });

  it("RF-016 confirmar manda POST /ganar y la tarjeta aparece en Ganada con los totales al día", async () => {
    const llamadas = servidorConEstado();
    renderEmbudo("empleado");
    const usuario = await abrirMenu("Cotizada", "Europa");
    await usuario.click(screen.getByRole("menuitem", { name: "Ganada" }));
    const grupo = await screen.findByRole("group", { name: "Ganar la oportunidad" });

    await usuario.click(within(grupo).getByRole("button", { name: "Confirmar" }));

    await waitFor(async () => {
      expect(within(await columna("Ganada")).getByText("Europa")).toBeInTheDocument();
    });
    expect(llamadas).toEqual([
      expect.objectContaining({ accion: "ganar", id: idOportunidadMock.cotizada }),
    ]);
    expect(within(await columna("Cotizada")).queryByText("Europa")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Cotizada\s*0$/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Ganada\s*3$/ })).toBeInTheDocument();
  });

  it("RF-016 cancelar la confirmación no llama a la API y la tarjeta queda en su columna", async () => {
    const llamadas = servidorConEstado();
    renderEmbudo("empleado");
    const usuario = await abrirMenu("En gestión", "Mendoza");
    await usuario.click(screen.getByRole("menuitem", { name: "Ganada" }));
    const grupo = await screen.findByRole("group", { name: "Ganar la oportunidad" });

    await usuario.click(within(grupo).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("group", { name: "Ganar la oportunidad" })).not.toBeInTheDocument();
    expect(llamadas).toEqual([]);
    expect(within(await columna("En gestión")).getByText("Mendoza")).toBeInTheDocument();
  });

  it("RF-016 un 409 al ganar deja la tarjeta en su columna y muestra el detail", async () => {
    servidorConEstado({ ganar: [409, "No se puede ganar una oportunidad perdida."] });
    renderEmbudo("empleado");
    const usuario = await abrirMenu("Nueva", "Cusco");
    await usuario.click(screen.getByRole("menuitem", { name: "Ganada" }));
    const grupo = await screen.findByRole("group", { name: "Ganar la oportunidad" });

    await usuario.click(within(grupo).getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se puede ganar una oportunidad perdida.",
    );
    expect(within(await columna("Nueva")).getByText("Cusco")).toBeInTheDocument();
    expect(within(await columna("Ganada")).queryByText("Cusco")).not.toBeInTheDocument();
  });

  it("RF-016 un 403 al ganar muestra el detail y la tarjeta no se mueve", async () => {
    servidorConEstado({ ganar: [403, "No tenés permiso sobre esta oportunidad."] });
    renderEmbudo("empleado");
    const usuario = await abrirMenu("Nueva", "Cusco");
    await usuario.click(screen.getByRole("menuitem", { name: "Ganada" }));
    const grupo = await screen.findByRole("group", { name: "Ganar la oportunidad" });

    await usuario.click(within(grupo).getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No tenés permiso sobre esta oportunidad.",
    );
    expect(within(await columna("Nueva")).getByText("Cusco")).toBeInTheDocument();
  });
});

describe("RF-017 arrastrar al perder pide el motivo", () => {
  it("RF-017 mover a Perdida abre el formulario del motivo y no llama a la API todavía", async () => {
    const llamadas = servidorConEstado();
    renderEmbudo("empleado");
    const usuario = await abrirMenu("Nueva", "Cusco");

    await usuario.click(screen.getByRole("menuitem", { name: "Perdida" }));

    const formulario = await screen.findByRole("form", { name: "Perder la oportunidad" });
    expect(within(formulario).getByRole("combobox", { name: /motivo/i })).toBeInTheDocument();
    expect(llamadas).toEqual([]);
  });

  it("RF-017 sin motivo no se envía", async () => {
    const llamadas = servidorConEstado();
    renderEmbudo("empleado");
    const usuario = await abrirMenu("Nueva", "Cusco");
    await usuario.click(screen.getByRole("menuitem", { name: "Perdida" }));
    const formulario = await screen.findByRole("form", { name: "Perder la oportunidad" });

    await usuario.click(within(formulario).getByRole("button", { name: "Confirmar" }));

    expect(await within(formulario).findByRole("alert")).toBeInTheDocument();
    expect(llamadas).toEqual([]);
  });

  it("RF-017 con un motivo manda POST /perder con motivo_perdida y la tarjeta pasa a Perdida", async () => {
    const llamadas = servidorConEstado();
    renderEmbudo("empleado");
    const usuario = await abrirMenu("En gestión", "Mendoza");
    await usuario.click(screen.getByRole("menuitem", { name: "Perdida" }));
    const formulario = await screen.findByRole("form", { name: "Perder la oportunidad" });

    await usuario.selectOptions(
      within(formulario).getByRole("combobox", { name: /motivo/i }),
      "precio",
    );
    await usuario.click(within(formulario).getByRole("button", { name: "Confirmar" }));

    await waitFor(async () => {
      expect(within(await columna("Perdida")).getByText("Mendoza")).toBeInTheDocument();
    });
    expect(llamadas).toEqual([
      expect.objectContaining({
        accion: "perder",
        id: idOportunidadMock.en_gestion,
        cuerpo: { motivo_perdida: "precio" },
      }),
    ]);
    expect(within(await columna("En gestión")).queryByText("Mendoza")).not.toBeInTheDocument();
  });

  it("RF-017 cancelar el formulario no llama a la API y la tarjeta queda en su columna", async () => {
    const llamadas = servidorConEstado();
    renderEmbudo("empleado");
    const usuario = await abrirMenu("Cotizada", "Europa");
    await usuario.click(screen.getByRole("menuitem", { name: "Perdida" }));
    const formulario = await screen.findByRole("form", { name: "Perder la oportunidad" });

    await usuario.click(within(formulario).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("form", { name: "Perder la oportunidad" })).not.toBeInTheDocument();
    expect(llamadas).toEqual([]);
    expect(within(await columna("Cotizada")).getByText("Europa")).toBeInTheDocument();
  });

  it("RF-017 un 409 al perder deja la tarjeta en su columna y muestra el detail", async () => {
    servidorConEstado({ perder: [409, "No se puede perder una oportunidad ganada."] });
    renderEmbudo("empleado");
    const usuario = await abrirMenu("Nueva", "Cusco");
    await usuario.click(screen.getByRole("menuitem", { name: "Perdida" }));
    const formulario = await screen.findByRole("form", { name: "Perder la oportunidad" });
    await usuario.selectOptions(
      within(formulario).getByRole("combobox", { name: /motivo/i }),
      "precio",
    );

    await usuario.click(within(formulario).getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se puede perder una oportunidad ganada.",
    );
    expect(within(await columna("Nueva")).getByText("Cusco")).toBeInTheDocument();
    expect(within(await columna("Perdida")).queryByText("Cusco")).not.toBeInTheDocument();
  });
});

describe("RF-020 arrastrar una perdida a en gestión la reactiva", () => {
  it("RF-020 mover una perdida a En gestión manda POST /reactivar sin confirmación", async () => {
    const llamadas = servidorConEstado();
    renderEmbudo("empleado");
    const usuario = await abrirMenu("Perdida", "Miami");

    await usuario.click(screen.getByRole("menuitem", { name: "En gestión" }));

    await waitFor(async () => {
      expect(within(await columna("En gestión")).getByText("Miami")).toBeInTheDocument();
    });
    expect(llamadas).toEqual([
      expect.objectContaining({ accion: "reactivar", id: idOportunidadMock.perdida }),
    ]);
    expect(within(await columna("Perdida")).queryByText("Miami")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Perdida\s*0$/ })).toBeInTheDocument();
  });

  it("RF-020 un 409 al reactivar deja la tarjeta en Perdida y muestra el detail", async () => {
    servidorConEstado({ reactivar: [409, "No se puede reactivar una oportunidad nueva."] });
    renderEmbudo("empleado");
    const usuario = await abrirMenu("Perdida", "Miami");

    await usuario.click(screen.getByRole("menuitem", { name: "En gestión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se puede reactivar una oportunidad nueva.",
    );
    expect(within(await columna("Perdida")).getByText("Miami")).toBeInTheDocument();
  });
});

describe("RF-016 arrastrar: permisos de escritura", () => {
  const ajeno = { ...usuariosPorRol.empleado, id: "99999999-9999-4999-8999-999999999999" };

  it("RF-016 quien no es responsable de la oportunidad no tiene el control de mover", async () => {
    servidorConEstado();
    renderEmbudo("empleado", ajeno);
    const li = await tarjeta("Nueva", "Cusco");

    expect(within(li).queryByRole("button", { name: /^mover/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^mover/i })).not.toBeInTheDocument();
  });

  it.each<RolMock>(["admin", "dueno"])(
    "RF-016 %s puede mover tarjetas de cualquier responsable",
    async (rol) => {
      servidorConEstado();
      renderEmbudo(rol, { ...usuariosPorRol[rol], id: ajeno.id });
      const li = await tarjeta("Nueva", "Cusco");

      expect(within(li).getByRole("button", { name: /^mover/i })).toBeInTheDocument();
    },
  );
});

describe("RF-016 arrastrar con puntero (MouseSensor simulado)", () => {
  const ORDEN = ["Nueva", "En gestión", "Cotizada", "Ganada", "Perdida"];
  const ANCHO = 200;

  /** jsdom no mide: cada columna ocupa un tramo horizontal y cada tarjeta queda dentro de la suya. */
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const seccion = this.closest("section");
      const titulo = seccion?.querySelector("h2")?.textContent ?? "";
      const indice = ORDEN.findIndex((e) => titulo.startsWith(e));
      // Sin columna: la copia que sigue al puntero (DragOverlay), que parte de la tarjeta de la primera columna.
      if (indice < 0) return new DOMRect(10, 10, ANCHO - 20, 50);
      return this.tagName === "SECTION"
        ? new DOMRect(indice * ANCHO, 0, ANCHO, 400)
        : new DOMRect(indice * ANCHO + 10, 10, ANCHO - 20, 50);
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Agarra la tarjeta, la mueve `columnas` columnas a la derecha (o izquierda) y devuelve cómo soltarla. */
  async function arrastrar(estado: string, destino: string, columnas: number) {
    const li = await tarjeta(estado, destino);
    fireEvent.mouseDown(li, { button: 0, clientX: 20, clientY: 20 });
    const destinoX = 20 + columnas * ANCHO;
    // El primer movimiento solo activa el arrastre; el segundo lo desplaza y calcula la columna de abajo.
    fireEvent.mouseMove(document, { clientX: destinoX - 1, clientY: 20 });
    await new Promise((resolver) => setTimeout(resolver, 0));
    fireEvent.mouseMove(document, { clientX: destinoX, clientY: 20 });
    return () => {
      fireEvent.mouseUp(document, { clientX: 20 + columnas * ANCHO, clientY: 20 });
    };
  }

  it("RF-016 soltar en una columna válida usa la misma lógica que el menú (Ganada pide confirmar)", async () => {
    const llamadas = servidorConEstado();
    renderEmbudo("empleado");

    const soltar = await arrastrar("Nueva", "Cusco", 3);
    await waitFor(async () => {
      expect(await columna("Ganada")).toHaveClass("ring-2");
    });
    soltar();

    expect(await screen.findByRole("group", { name: "Ganar la oportunidad" })).toBeInTheDocument();
    expect(llamadas).toEqual([]);
  });

  it("RF-016 mientras se arrastra, las columnas que no son destino quedan con aria-disabled", async () => {
    servidorConEstado();
    renderEmbudo("empleado");

    const soltar = await arrastrar("Nueva", "Cusco", 1);

    await waitFor(async () => {
      expect(await columna("Cotizada")).toHaveAttribute("aria-disabled", "true");
    });
    expect(await columna("En gestión")).not.toHaveAttribute("aria-disabled");
    expect(await columna("Ganada")).not.toHaveAttribute("aria-disabled");
    expect(await columna("Perdida")).not.toHaveAttribute("aria-disabled");
    soltar();
    await waitFor(async () => {
      expect(await columna("Cotizada")).not.toHaveAttribute("aria-disabled");
    });
  });

  it("RF-016 soltar en Cotizada no llama a la API ni abre nada", async () => {
    const llamadas = servidorConEstado();
    renderEmbudo("empleado");

    const soltar = await arrastrar("Nueva", "Cusco", 2);
    await waitFor(async () => {
      expect(await columna("Cotizada")).toHaveAttribute("aria-disabled", "true");
    });
    soltar();

    await waitFor(async () => {
      expect(await columna("Cotizada")).not.toHaveAttribute("aria-disabled");
    });
    expect(llamadas).toEqual([]);
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(within(await columna("Nueva")).getByText("Cusco")).toBeInTheDocument();
  });

  it("RF-016 sin permiso de escritura no se activa el arrastre", async () => {
    servidorConEstado();
    renderEmbudo("empleado", {
      ...usuariosPorRol.empleado,
      id: "99999999-9999-4999-8999-999999999999",
    });

    await arrastrar("Nueva", "Cusco", 1);

    expect(await columna("Cotizada")).not.toHaveAttribute("aria-disabled");
  });

  it("RF-016 una oportunidad ganada no se puede arrastrar", async () => {
    servidorConEstado();
    renderEmbudo("empleado");

    await arrastrar("Ganada", "Brasil", -1);

    expect(await columna("Cotizada")).not.toHaveAttribute("aria-disabled");
  });
});

describe("RF-016 menú Mover con teclado", () => {
  it("RF-016 las flechas, Home y End recorren los destinos y Escape devuelve el foco al botón", async () => {
    servidorConEstado();
    renderEmbudo("empleado");
    const usuario = await abrirMenu("Nueva", "Cusco");
    const items = screen.getAllByRole("menuitem");
    expect(items[0]).toHaveFocus();

    await usuario.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();
    await usuario.keyboard("{End}");
    expect(items[2]).toHaveFocus();
    await usuario.keyboard("{ArrowDown}");
    expect(items[0]).toHaveFocus();
    await usuario.keyboard("{ArrowUp}");
    expect(items[2]).toHaveFocus();
    await usuario.keyboard("{Home}");
    expect(items[0]).toHaveFocus();

    await usuario.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mover Cusco" })).toHaveFocus();
  });
});
