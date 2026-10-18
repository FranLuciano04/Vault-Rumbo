import { crearCliente } from "@rumbo/shared";
import { crearServidor, manejadorYo, type RolMock, usuariosPorRol } from "@rumbo/shared/mocks";
import { render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll } from "vitest";
import { App } from "@/app/App";

const servidor = crearServidor();
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  servidor.resetHandlers();
  window.history.pushState({}, "", "/");
});
afterAll(() => {
  servidor.close();
});

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });

function abrir(ruta: string) {
  window.history.pushState({}, "", ruta);
  render(<App cliente={cliente} />);
}

const sinAdmin = [
  "Agenda",
  "Calendario",
  "Clientes",
  "Oportunidades",
  "Cotizaciones",
  "Viajes",
  "Hoteles",
  "Dashboard",
];
const todas = [
  "Agenda",
  "Calendario",
  "Clientes",
  "Oportunidades",
  "Cotizaciones",
  "Viajes",
  "Hoteles",
  "Redes",
  "Dashboard",
  "Reportes",
  "Configuración",
];
const etiquetasPorRol: Record<RolMock, string[]> = {
  empleado: sinAdmin,
  admin: todas,
  dueno: todas,
  freelance: sinAdmin,
};

const sinSesion = () =>
  http.get("*/api/auth/yo", () =>
    HttpResponse.json(
      { title: "No autenticado", status: 401 },
      { status: 401, headers: { "content-type": "application/problem+json" } },
    ),
  );

describe("RF-141 navegación por rol", () => {
  it.each(Object.keys(etiquetasPorRol) as RolMock[])(
    "RF-141 el rol %s ve exactamente sus secciones en la barra lateral",
    async (rol) => {
      servidor.use(manejadorYo(rol));
      abrir("/agenda");

      const menu = await screen.findByRole("navigation", { name: /principal/i });
      const visibles = within(menu)
        .getAllByRole("link")
        .map((a) => a.textContent.trim());
      expect(visibles).toEqual(etiquetasPorRol[rol]);
    },
  );

  it("RF-141 el encabezado muestra el nombre y el rol de la sesión", async () => {
    servidor.use(manejadorYo("admin"));
    abrir("/agenda");

    const encabezado = await screen.findByRole("banner");
    expect(within(encabezado).getByText(usuariosPorRol.admin.nombre)).toBeInTheDocument();
    expect(within(encabezado).getByText(/admin/i)).toBeInTheDocument();
  });

  it("RF-141 la raíz redirige a la agenda de un usuario con sesión", async () => {
    servidor.use(manejadorYo("empleado"));
    abrir("/");

    await screen.findByRole("navigation", { name: /principal/i });
    expect(window.location.pathname).toBe("/agenda");
  });
});

describe("RF-141 rutas protegidas (CU-24)", () => {
  it.each(["/", "/agenda", "/clientes", "/configuracion"])(
    "RF-141 sin sesión (401 de /auth/yo) %s redirige al login",
    async (ruta) => {
      servidor.use(sinSesion());
      abrir(ruta);

      await vi.waitFor(() => {
        expect(window.location.pathname).toBe("/login");
      });
      expect(screen.queryByRole("navigation", { name: /principal/i })).not.toBeInTheDocument();
    },
  );

  it("RF-141 mientras consulta /auth/yo no muestra el contenido protegido", () => {
    servidor.use(http.get("*/api/auth/yo", () => new Promise(() => {})));
    abrir("/clientes");

    expect(screen.queryByRole("navigation", { name: /principal/i })).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/clientes");
  });
});

describe("RF-141 error de /auth/yo que no es 401", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("RF-141 un 500 muestra un aviso y no la navegación ni el login", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    servidor.use(
      http.get("*/api/auth/yo", () =>
        HttpResponse.json(
          { title: "Error interno", status: 500 },
          { status: 500, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    );
    abrir("/agenda");
    // useYo reintenta con espera creciente: se adelanta el reloj para llegar al error final.
    await vi.advanceTimersByTimeAsync(10_000);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /principal/i })).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/agenda");
  });
});
