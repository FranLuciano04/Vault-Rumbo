import { crearCliente } from "@rumbo/shared";
import {
  crearServidor,
  hotelesMock,
  idHotelMock,
  manejadoresHotelesPara,
  manejadoresM1,
  resenasMock,
  usuariosPorRol,
  type RolMock,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, type RequestHandler } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { DetalleHotel } from "./DetalleHotel";

const servidor = crearServidor(...manejadoresHotelesPara("empleado"), ...manejadoresM1);
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
const llaoLlao = hotelesMock.find((h) => h.id === idHotelMock.llaoLlao);
if (!llaoLlao) throw new Error("falta el hotel Llao Llao en los mocks");
const RESENA_1 = "Muy bueno, el desayuno flojo.";
const RESENA_2 = "Las vistas al lago valen cada peso.";
const RESENA_OCULTA = "Reseña con insultos al personal.";
const ID_RESENA_2 = "e1a2b3c4-d5e6-4f70-8a9b-0c1d2e3f4a03";
const ID_RESENA_OCULTA = "e1a2b3c4-d5e6-4f70-8a9b-0c1d2e3f4a04";

type Escritura = { metodo: string; ruta: string; cuerpo: unknown };

// Supuesto del ticket (ver reporte): el detalle recibe `hotelId` por prop; la ruta la resuelve la sección.
function renderDetalle(rol: RolMock, hotelId: string = idHotelMock.llaoLlao) {
  servidor.use(...manejadoresHotelesPara(rol));
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <DetalleHotel cliente={cliente} usuario={usuariosPorRol[rol]} hotelId={hotelId} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Registra método, ruta y cuerpo de los pedidos de escritura, sin cambiar la respuesta del mock. */
function espiarEscrituras(pedidos: Escritura[]) {
  servidor.events.on("request:start", async ({ request }) => {
    if (request.method === "GET") return;
    const texto = await request.clone().text();
    pedidos.push({
      metodo: request.method,
      ruta: new URL(request.url).pathname,
      cuerpo: texto ? JSON.parse(texto) : null,
    });
  });
}

const botonesOcultar = () => screen.queryAllByRole("button", { name: /ocultar/i });

describe("RF-108 detalle de hotel", () => {
  it("muestra nombre, categoría, servicios y precio de referencia del hotel", async () => {
    renderDetalle("empleado");
    expect(await screen.findByRole("heading", { name: llaoLlao.nombre })).toBeInTheDocument();
    expect(screen.getByText(/5 estrellas/i)).toBeInTheDocument();
    expect(screen.getByText("pileta")).toBeInTheDocument();
    expect(screen.getByText("desayuno incluido")).toBeInTheDocument();
    expect(screen.getByText(/150\.000,00/)).toBeInTheDocument();
  });

  it("muestra el puntaje promedio de las publicadas y la cantidad de reseñas", async () => {
    renderDetalle("empleado");
    await screen.findByRole("heading", { name: llaoLlao.nombre });
    expect(screen.getByText("4,5")).toBeInTheDocument();
    expect(screen.getByText(/2 reseñas/)).toBeInTheDocument();
  });

  it("lista las reseñas publicadas con comentario y fecha dd/mm/aa", async () => {
    renderDetalle("empleado");
    expect(await screen.findByText(RESENA_1)).toBeInTheDocument();
    expect(screen.getByText(RESENA_2)).toBeInTheDocument();
    expect(screen.getByText("14/08/26")).toBeInTheDocument();
    expect(screen.getByText("02/09/26")).toBeInTheDocument();
  });

  it("no muestra la reseña oculta en la lista pública", async () => {
    renderDetalle("empleado");
    await screen.findByText(RESENA_1);
    expect(screen.queryByText(RESENA_OCULTA)).not.toBeInTheDocument();
  });

  it("un hotel sin reseñas dice «Sin reseñas»", async () => {
    renderDetalle("empleado", idHotelMock.cabanas);
    await screen.findByRole("heading", { name: "Cabañas del Nahuel" });
    expect(await screen.findByText(/sin reseñas/i)).toBeInTheDocument();
  });

  it("un hotel inexistente avisa que no existe, en lugar de quedar cargando", async () => {
    renderDetalle("empleado", "00000000-0000-4000-8000-000000000000");
    expect(await screen.findByText(/el hotel no existe/i)).toBeInTheDocument();
  });
});

describe("RF-111 moderación", () => {
  it.each<RolMock>(["admin", "dueno"])("%s ve el botón para ocultar cada reseña", async (rol) => {
    renderDetalle(rol);
    await screen.findByText(RESENA_1);
    expect(botonesOcultar()).toHaveLength(2);
  });

  it.each<RolMock>(["admin", "dueno"])(
    "%s oculta una reseña indicando el motivo (POST /ocultar)",
    async (rol) => {
      const pedidos: Escritura[] = [];
      espiarEscrituras(pedidos);
      const usuario = userEvent.setup();
      renderDetalle(rol);
      await screen.findByText(RESENA_2);
      const fila = screen.getByText(RESENA_2).closest("li") as HTMLElement;
      await usuario.click(fila.querySelector("button") as HTMLButtonElement);
      await usuario.type(await screen.findByRole("textbox", { name: /motivo/i }), "Spam");
      await usuario.click(screen.getByRole("button", { name: /confirmar/i }));
      await waitFor(() => {
        expect(pedidos).toContainEqual({
          metodo: "POST",
          ruta: `/api/resenas/${ID_RESENA_2}/ocultar`,
          cuerpo: { motivo_baja: "Spam" },
        });
      });
    },
  );

  it("no oculta sin motivo: no envía el pedido y avisa que es obligatorio", async () => {
    const pedidos: Escritura[] = [];
    espiarEscrituras(pedidos);
    const usuario = userEvent.setup();
    renderDetalle("admin");
    await screen.findByText(RESENA_2);
    await usuario.click(botonesOcultar()[0] as HTMLElement);
    await usuario.click(await screen.findByRole("button", { name: /confirmar/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/motivo/i);
    expect(pedidos).toEqual([]);
  });

  it("si el servidor rechaza la baja (409), muestra el detalle del error", async () => {
    const usuario = userEvent.setup();
    renderDetalle("admin");
    await screen.findByText(RESENA_2);
    servidor.use(
      http.post("*/api/resenas/:id/ocultar", () =>
        HttpResponse.json(
          {
            type: "about:blank",
            title: "Conflicto",
            status: 409,
            detail: "La reseña ya está oculta.",
          },
          { status: 409, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );
    await usuario.click(botonesOcultar()[0] as HTMLElement);
    await usuario.type(await screen.findByRole("textbox", { name: /motivo/i }), "Spam");
    await usuario.click(screen.getByRole("button", { name: /confirmar/i }));
    expect(await screen.findByText(/ya está oculta/i)).toBeInTheDocument();
  });
});

describe("RF-112 restaurar reseña", () => {
  it.each<RolMock>(["admin", "dueno"])(
    "%s ve las reseñas ocultas con el motivo y puede restaurarlas",
    async (rol) => {
      const pedidos: Escritura[] = [];
      espiarEscrituras(pedidos);
      const usuario = userEvent.setup();
      renderDetalle(rol);
      expect(await screen.findByText(RESENA_OCULTA)).toBeInTheDocument();
      expect(screen.getByText(/contenido ofensivo/i)).toBeInTheDocument();
      await usuario.click(screen.getByRole("button", { name: /restaurar/i }));
      await waitFor(() => {
        expect(pedidos).toContainEqual({
          metodo: "POST",
          ruta: `/api/resenas/${ID_RESENA_OCULTA}/restaurar`,
          cuerpo: null,
        });
      });
    },
  );
});

describe("RF-108 detalle por rol (solo lectura)", () => {
  it.each<RolMock>(["freelance", "empleado"])(
    "%s ve datos, puntaje y reseñas publicadas",
    async (rol) => {
      renderDetalle(rol);
      expect(await screen.findByText(RESENA_1)).toBeInTheDocument();
      expect(screen.getByText(RESENA_2)).toBeInTheDocument();
      expect(screen.getByText("4,5")).toBeInTheDocument();
    },
  );

  it.each<RolMock>(["freelance", "empleado"])(
    "%s no ve ocultar, restaurar ni reseñas ocultas",
    async (rol) => {
      const pedidos: Escritura[] = [];
      espiarEscrituras(pedidos);
      renderDetalle(rol);
      await screen.findByText(RESENA_1);
      expect(botonesOcultar()).toHaveLength(0);
      expect(screen.queryByRole("button", { name: /restaurar/i })).not.toBeInTheDocument();
      expect(screen.queryByText(RESENA_OCULTA)).not.toBeInTheDocument();
      expect(pedidos).toEqual([]);
    },
  );

  it("el freelance no pide las reseñas ocultas (la API respondería 403)", async () => {
    const estados: (string | null)[] = [];
    servidor.events.on("request:start", ({ request }) => {
      const url = new URL(request.url);
      if (url.pathname.endsWith("/resenas")) estados.push(url.searchParams.get("estado"));
    });
    renderDetalle("freelance");
    await screen.findByText(RESENA_1);
    expect(estados).not.toContain("oculta");
  });
});

/** Como `renderDetalle`, pero con manejadores propios que ganan sobre los del rol. */
function renderConManejadores(rol: RolMock, hotelId: string, ...manejadores: RequestHandler[]) {
  const resultado = renderDetalle(rol, hotelId);
  servidor.use(...manejadores);
  return resultado;
}

/** Reseñas de `estado` repartidas en páginas de 2 (`total` en todo el hotel). */
function resenasPaginadas(estado: "publicada" | "oculta", total: number) {
  return http.get("*/api/hoteles/:id/resenas", ({ request }) => {
    const url = new URL(request.url);
    const numero = Number(url.searchParams.get("pagina") ?? 1);
    const pedido = url.searchParams.get("estado") ?? "publicada";
    const base = resenasMock.find((r) => r.id === ID_RESENA_2);
    if (!base) throw new Error("falta la reseña base en los mocks");
    const todas = pedido === estado ? total : 0;
    const items = Array.from({ length: todas }, (_, i) => ({
      ...base,
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      estado: pedido as "publicada" | "oculta",
      comentario: `Comentario ${pedido} ${String(i + 1)}`,
    })).slice((numero - 1) * 2, numero * 2);
    return HttpResponse.json({ items, total: todas, pagina: numero, por_pagina: 2 });
  });
}

describe("RF-108 paginación de reseñas", () => {
  it("con más reseñas que una página, pasa a la siguiente de las publicadas", async () => {
    const usuario = userEvent.setup();
    renderConManejadores("empleado", idHotelMock.llaoLlao, resenasPaginadas("publicada", 3));
    expect(await screen.findByText("Comentario publicada 1")).toBeInTheDocument();
    expect(screen.queryByText("Comentario publicada 3")).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("Comentario publicada 3")).toBeInTheDocument();
  });

  it("admin también pagina las ocultas", async () => {
    const usuario = userEvent.setup();
    renderConManejadores("admin", idHotelMock.llaoLlao, resenasPaginadas("oculta", 3));
    expect(await screen.findByText("Comentario oculta 1")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("Comentario oculta 3")).toBeInTheDocument();
  });
});

describe("RF-108 estado y destino del hotel", () => {
  it("un hotel activo muestra su estado y el destino", async () => {
    renderDetalle("empleado");
    await screen.findByRole("heading", { name: llaoLlao.nombre });
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(await screen.findByText(/Bariloche/)).toBeInTheDocument();
  });

  it("un hotel cerrado lo avisa", async () => {
    renderDetalle("empleado", idHotelMock.playaDorada);
    await screen.findByRole("heading", { name: "Hotel Playa Dorada" });
    expect(screen.getByText("Cerrado")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/está cerrado/i);
  });

  it("el freelance ve el aviso de solo consulta", async () => {
    renderDetalle("freelance");
    await screen.findByRole("heading", { name: llaoLlao.nombre });
    expect(screen.getByRole("note")).toHaveTextContent(/solo consulta/i);
  });
});

describe("RF-108 / RF-109 enlace para editar desde el detalle", () => {
  it.each<RolMock>(["empleado", "admin", "dueno"])(
    "%s ve el enlace «Editar» hacia /hoteles/<id>/editar",
    async (rol) => {
      renderDetalle(rol);
      await screen.findByRole("heading", { name: llaoLlao.nombre });
      expect(screen.getByRole("link", { name: /^editar$/i })).toHaveAttribute(
        "href",
        `/hoteles/${idHotelMock.llaoLlao}/editar`,
      );
    },
  );

  it("el freelance no ve el enlace «Editar» (DEC-0008)", async () => {
    renderDetalle("freelance");
    await screen.findByRole("heading", { name: llaoLlao.nombre });
    expect(screen.queryByRole("link", { name: /editar/i })).not.toBeInTheDocument();
  });

  it("un hotel cerrado no muestra el enlace «Editar» (no se puede editar)", async () => {
    renderDetalle("empleado", idHotelMock.playaDorada);
    await screen.findByRole("heading", { name: "Hotel Playa Dorada" });
    expect(screen.getByText("Cerrado")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /editar/i })).not.toBeInTheDocument();
  });

  it.each<RolMock>(["empleado", "admin", "dueno"])(
    "%s ve el botón «Dar de baja» en un hotel activo",
    async (rol) => {
      renderDetalle(rol);
      await screen.findByRole("heading", { name: llaoLlao.nombre });
      expect(screen.getByRole("button", { name: "Dar de baja" })).toBeInTheDocument();
    },
  );

  it("el freelance y un hotel cerrado no muestran «Dar de baja»", async () => {
    const { unmount } = renderDetalle("freelance");
    await screen.findByRole("heading", { name: llaoLlao.nombre });
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
    unmount();
    renderDetalle("empleado", idHotelMock.playaDorada);
    await screen.findByRole("heading", { name: "Hotel Playa Dorada" });
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
  });
});

/** Reseñas con estado: 20 por página; ocultar y restaurar mueven la reseña de una lista a la otra. */
function moderacionConEstado(publicadas: number, ocultas: number) {
  const base = resenasMock.find((r) => r.id === ID_RESENA_2);
  if (!base) throw new Error("falta la reseña base en los mocks");
  const todas = Array.from({ length: publicadas + ocultas }, (_, i) => {
    const estado = i < publicadas ? ("publicada" as const) : ("oculta" as const);
    return {
      ...base,
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      estado,
      motivo_baja: estado === "oculta" ? "Motivo previo" : null,
      comentario: `Comentario ${estado} ${String(estado === "publicada" ? i + 1 : i - publicadas + 1)}`,
    };
  });
  return [
    http.get("*/api/hoteles/:id/resenas", ({ request }) => {
      const url = new URL(request.url);
      const numero = Number(url.searchParams.get("pagina") ?? 1);
      const pedido = url.searchParams.get("estado") ?? "publicada";
      const delEstado = todas.filter((r) => r.estado === pedido);
      return HttpResponse.json({
        items: delEstado.slice((numero - 1) * 20, numero * 20),
        total: delEstado.length,
        pagina: numero,
        por_pagina: 20,
      });
    }),
    http.post("*/api/resenas/:id/ocultar", ({ params }) => {
      const r = todas.find((x) => x.id === params["id"]);
      if (!r) return new HttpResponse(null, { status: 404 });
      r.estado = "oculta";
      return HttpResponse.json(r);
    }),
    http.post("*/api/resenas/:id/restaurar", ({ params }) => {
      const r = todas.find((x) => x.id === params["id"]);
      if (!r) return new HttpResponse(null, { status: 404 });
      r.estado = "publicada";
      return HttpResponse.json(r);
    }),
  ];
}

const textosDe = (prefijo: string, region: string) =>
  within(screen.getByRole("region", { name: region })).queryAllByText(
    new RegExp(`^Comentario ${prefijo} \\d+$`),
  );

describe("RF-111 / RF-112 la moderación no deja una página fuera de rango (H-03)", () => {
  it("21 publicadas, página 2: ocultar la única de esa página muestra la página 1 con 20", async () => {
    const usuario = userEvent.setup();
    renderConManejadores("admin", idHotelMock.llaoLlao, ...moderacionConEstado(21, 0));
    await screen.findByText("Comentario publicada 1");
    await usuario.click(screen.getByRole("button", { name: /siguiente/i }));
    const unica = await screen.findByText("Comentario publicada 21");
    expect(textosDe("publicada", "Reseñas")).toHaveLength(1);
    const fila = unica.closest("li") as HTMLElement;
    await usuario.click(fila.querySelector("button") as HTMLButtonElement);
    await usuario.type(await screen.findByRole("textbox", { name: /motivo/i }), "Spam");
    await usuario.click(screen.getByRole("button", { name: /confirmar/i }));
    expect(await screen.findByText("Comentario publicada 1")).toBeInTheDocument();
    await waitFor(() => {
      expect(textosDe("publicada", "Reseñas")).toHaveLength(20);
    });
  });

  it("21 ocultas, página 2: restaurar la única de esa página muestra la página 1 con 20", async () => {
    const usuario = userEvent.setup();
    renderConManejadores("admin", idHotelMock.llaoLlao, ...moderacionConEstado(0, 21));
    await screen.findByText("Comentario oculta 1");
    await usuario.click(screen.getByRole("button", { name: /siguiente/i }));
    await screen.findByText("Comentario oculta 21");
    expect(textosDe("oculta", "Reseñas ocultas")).toHaveLength(1);
    await usuario.click(screen.getByRole("button", { name: /restaurar/i }));
    expect(await screen.findByText("Comentario oculta 1")).toBeInTheDocument();
    await waitFor(() => {
      expect(textosDe("oculta", "Reseñas ocultas")).toHaveLength(20);
    });
  });

  it("si el total no reduce las páginas, se conserva la página elegida", async () => {
    const usuario = userEvent.setup();
    renderConManejadores("admin", idHotelMock.llaoLlao, ...moderacionConEstado(22, 0));
    await screen.findByText("Comentario publicada 1");
    await usuario.click(screen.getByRole("button", { name: /siguiente/i }));
    const primera = await screen.findByText("Comentario publicada 21");
    expect(textosDe("publicada", "Reseñas")).toHaveLength(2);
    const fila = primera.closest("li") as HTMLElement;
    await usuario.click(fila.querySelector("button") as HTMLButtonElement);
    await usuario.type(await screen.findByRole("textbox", { name: /motivo/i }), "Spam");
    await usuario.click(screen.getByRole("button", { name: /confirmar/i }));
    // La oculta conserva su comentario en «Reseñas ocultas»: se mira solo la lista de publicadas.
    const publicadas = within(screen.getByRole("region", { name: "Reseñas" }));
    await waitFor(() => {
      expect(publicadas.queryByText("Comentario publicada 21")).not.toBeInTheDocument();
    });
    expect(await publicadas.findByText("Comentario publicada 22")).toBeInTheDocument();
    expect(publicadas.getByText(/Página 2 de 2/)).toBeInTheDocument();
    expect(publicadas.queryByText("Comentario publicada 1")).not.toBeInTheDocument();
  });
});
