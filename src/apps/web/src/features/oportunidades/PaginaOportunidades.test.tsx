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
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
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

const asesores = [
  { id: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03", nombre: "Ana Pérez" },
  { id: "e7b20d94-6a3f-4c15-9d8e-0b5a3f7c2e04", nombre: "Tomás Roldán" },
];

function renderEmbudo(rol: RolMock = "empleado") {
  servidor.use(http.get("*/api/usuarios/asesores", () => HttpResponse.json(asesores)));
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/oportunidades"]}>
        <PaginaOportunidades cliente={cliente} usuario={usuariosPorRol[rol]} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Registra los parámetros de cada listado y sigue con el handler del mock (devolver `undefined` pasa al siguiente). */
function registrarListados(pedidos: URLSearchParams[]) {
  return http.get("*/api/oportunidades", ({ request }) => {
    pedidos.push(new URL(request.url).searchParams);
    return undefined;
  });
}

/** Listado que solo tiene oportunidades de esos estados y respeta el filtro `estado` de cada columna. */
const soloEstados = (...estados: string[]) =>
  http.get("*/api/oportunidades", ({ request }) => {
    const estado = new URL(request.url).searchParams.get("estado");
    const items = oportunidadesMock.filter(
      (o) => estados.includes(o.estado) && (!estado || o.estado === estado),
    );
    return HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 20 });
  });

const columna = async (estado: string) => {
  const encabezado = await screen.findByRole("heading", { name: new RegExp(`^${estado}\\b`) });
  const seccion = encabezado.closest("section");
  if (!seccion) throw new Error(`La columna «${estado}» no es una sección`);
  return seccion;
};

describe("RF-016 embudo", () => {
  it("RF-016 muestra una columna por estado con su total", async () => {
    renderEmbudo("empleado");

    expect(await screen.findByRole("heading", { name: /^Nueva\s*1$/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^En gestión\s*1$/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Cotizada\s*1$/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Ganada\s*2$/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Perdida\s*1$/ })).toBeInTheDocument();
  });

  it("RF-016 cada columna pide su estado y muestra el total del servidor, no la cuenta de tarjetas", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(
      http.get("*/api/oportunidades", ({ request }) => {
        const p = new URL(request.url).searchParams;
        pedidos.push(p);
        const items = oportunidadesMock.filter((o) => o.estado === p.get("estado")).slice(0, 1);
        return HttpResponse.json({ items, total: 37, pagina: 1, por_pagina: 20 });
      }),
    );
    renderEmbudo("empleado");

    expect(await screen.findByRole("heading", { name: /^Nueva\s*37$/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Perdida\s*37$/ })).toBeInTheDocument();
    const estados = new Set(pedidos.map((p) => p.get("estado")));
    expect(estados).toEqual(
      new Set(["nueva", "en_gestion", "cotizada", "ganada", "perdida"]),
    );
  });

  it("RF-016 cada oportunidad es una tarjeta en la columna de su estado", async () => {
    renderEmbudo("empleado");

    expect(within(await columna("Nueva")).getByText("Cusco")).toBeInTheDocument();
    expect(within(await columna("En gestión")).getByText("Mendoza")).toBeInTheDocument();
    expect(within(await columna("Cotizada")).getByText("Europa")).toBeInTheDocument();
    const ganada = await columna("Ganada");
    expect(within(ganada).getByText("Brasil")).toBeInTheDocument();
    expect(within(ganada).getByText("Punta Cana")).toBeInTheDocument();
    expect(within(await columna("Perdida")).getByText("Miami")).toBeInTheDocument();
  });

  it("RF-016 la tarjeta muestra el cliente_nombre de la oportunidad y los pasajeros", async () => {
    servidor.use(
      http.get("*/api/oportunidades", ({ request }) => {
        const estado = new URL(request.url).searchParams.get("estado");
        const items = oportunidadesMock
          .filter((o) => !estado || o.estado === estado)
          .map((o) => ({ ...o, cliente_nombre: `Cliente de ${o.destino_consultado}` }));
        return HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 20 });
      }),
    );
    renderEmbudo("empleado");
    const nueva = await columna("Nueva");

    expect(await within(nueva).findByText("Cliente de Cusco")).toBeInTheDocument();
    expect(within(nueva).getByText(/2 pasajeros/)).toBeInTheDocument();
    expect(within(await columna("En gestión")).getByText(/4 pasajeros/)).toBeInTheDocument();
  });

  it("RF-016 no pide /api/clientes para armar las tarjetas", async () => {
    const pedidos: string[] = [];
    servidor.events.on("request:start", ({ request }) => {
      pedidos.push(new URL(request.url).pathname);
    });
    renderEmbudo("empleado");
    await columna("Nueva");
    await screen.findByText("Cusco");

    servidor.events.removeAllListeners();
    expect(pedidos.filter((p) => p.startsWith("/api/clientes"))).toEqual([]);
  });

  it("RF-016 la tarjeta de una perdida muestra el motivo", async () => {
    renderEmbudo("empleado");
    const perdida = await columna("Perdida");

    expect(within(perdida).getByText(/motivo: precio/i)).toBeInTheDocument();
  });

  it("RF-016 la tarjeta da acceso a la oportunidad", async () => {
    renderEmbudo("empleado");
    const nueva = await columna("Nueva");

    const enlace = within(nueva).getByRole("link", { name: /cusco/i });
    expect(enlace).toHaveAttribute("href", `/oportunidades/${idOportunidadMock.nueva}`);
  });

  it("RF-016 una columna sin oportunidades muestra el total en cero", async () => {
    servidor.use(soloEstados("nueva"));
    renderEmbudo("empleado");

    expect(await screen.findByRole("heading", { name: /^Nueva\s*1$/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Perdida\s*0$/ })).toBeInTheDocument();
    expect(screen.queryByText("Miami")).not.toBeInTheDocument();
  });

  it("RF-016 si falla la carga del embudo lo avisa", async () => {
    servidor.use(
      http.get("*/api/oportunidades", () =>
        HttpResponse.json(
          { type: "about:blank", title: "Error", status: 500, detail: "Falla." },
          { status: 500, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );
    renderEmbudo("empleado");

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos cargar/i);
  });
});

describe("RF-016 embudo: filtros y «lo mío»", () => {
  it("RF-016 el empleado arranca en «Mis oportunidades» y pide solo las suyas", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(registrarListados(pedidos));
    renderEmbudo("empleado");
    await columna("Nueva");

    expect(screen.getByRole("tab", { name: /mis oportunidades/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(pedidos.length).toBeGreaterThan(0);
    expect(pedidos.every((p) => p.get("mios") === "true")).toBe(true);
  });

  it("RF-016 «Toda la agencia» pide el embudo sin el filtro «mios»", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(registrarListados(pedidos));
    const usuario = userEvent.setup();
    renderEmbudo("empleado");
    await columna("Nueva");

    await usuario.click(screen.getByRole("tab", { name: /toda la agencia/i }));

    await waitFor(() => {
      expect(pedidos.some((p) => p.get("mios") !== "true")).toBe(true);
    });
    expect(screen.getByRole("tab", { name: /toda la agencia/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it.each<RolMock>(["admin", "dueno"])(
    "RF-016 %s filtra por responsable pidiendo el listado con responsable_id al servidor",
    async (rol) => {
      const pedidos: URLSearchParams[] = [];
      servidor.use(registrarListados(pedidos));
      const usuario = userEvent.setup();
      renderEmbudo(rol);
      await screen.findByRole("option", { name: "Tomás Roldán" });

      await usuario.selectOptions(
        screen.getByRole("combobox", { name: /responsable/i }),
        "Tomás Roldán",
      );

      await waitFor(() => {
        expect(pedidos.some((p) => p.get("responsable_id") === asesores[1]?.id)).toBe(true);
      });
    },
  );

  it("RF-016 al elegir responsable las tarjetas son las que devuelve el servidor", async () => {
    servidor.use(
      http.get("*/api/oportunidades", ({ request }) => {
        const p = new URL(request.url).searchParams;
        const deTomas = p.get("responsable_id") === asesores[1]?.id;
        const estado = p.get("estado");
        const items = oportunidadesMock
          .filter((o) => (deTomas ? o.destino_consultado === "Mendoza" : true))
          .filter((o) => !estado || o.estado === estado);
        return HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 20 });
      }),
    );
    const usuario = userEvent.setup();
    renderEmbudo("admin");
    await screen.findByText("Cusco");
    await screen.findByRole("option", { name: "Tomás Roldán" });

    await usuario.selectOptions(
      screen.getByRole("combobox", { name: /responsable/i }),
      "Tomás Roldán",
    );

    await waitFor(() => {
      expect(screen.queryByText("Cusco")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Mendoza")).toBeInTheDocument();
  });

  it("RF-016 el empleado no tiene el filtro «Responsable»", async () => {
    renderEmbudo("empleado");
    await columna("Nueva");

    expect(screen.queryByRole("combobox", { name: /responsable/i })).not.toBeInTheDocument();
  });
});

describe("RF-151 embudo del freelance (pantalla 34)", () => {
  it("RF-151 el freelance pide siempre solo lo suyo", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(registrarListados(pedidos));
    renderEmbudo("freelance");
    await columna("Nueva");

    expect(pedidos.length).toBeGreaterThan(0);
    expect(pedidos.every((p) => p.get("mios") === "true")).toBe(true);
  });

  it("RF-151 el freelance no tiene «Toda la agencia» ni el filtro «Responsable»", async () => {
    renderEmbudo("freelance");
    await columna("Nueva");

    expect(screen.getByRole("tab", { name: /mis oportunidades/i })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /toda la agencia/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /responsable/i })).not.toBeInTheDocument();
  });

  it("RF-151 el freelance ve el aviso de que solo ve lo suyo", async () => {
    renderEmbudo("freelance");

    expect(
      await screen.findByText(/estás viendo solo tus clientes, oportunidades y viajes/i),
    ).toBeInTheDocument();
  });

  it("RF-151 el empleado no ve ese aviso", async () => {
    renderEmbudo("empleado");
    await columna("Nueva");

    expect(screen.queryByText(/estás viendo solo tus clientes/i)).not.toBeInTheDocument();
  });

  it("RF-151 el freelance ve las columnas y totales de lo que devuelve la API", async () => {
    servidor.use(soloEstados("nueva", "perdida"));
    renderEmbudo("freelance");

    expect(await screen.findByRole("heading", { name: /^Nueva\s*1$/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Cotizada\s*0$/ })).toBeInTheDocument();
    expect(screen.queryByText("Europa")).not.toBeInTheDocument();
  });
});
