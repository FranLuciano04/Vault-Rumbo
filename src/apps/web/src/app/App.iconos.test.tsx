import { crearCliente } from "@rumbo/shared";
import { crearServidor, manejadorYo } from "@rumbo/shared/mocks";
import { render, screen, within } from "@testing-library/react";
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

const etiquetas = [
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

async function abrirMenu(ruta = "/agenda") {
  servidor.use(manejadorYo("admin"));
  window.history.pushState({}, "", ruta);
  render(<App cliente={cliente} />);
  return within(await screen.findByRole("navigation", { name: /principal/i }));
}

describe("RNF-11 íconos de la navegación", () => {
  it("RNF-11 el admin ve las 11 secciones, cada una con su enlace", async () => {
    const menu = await abrirMenu();
    expect(menu.getAllByRole("link")).toHaveLength(11);
  });

  it.each(etiquetas)(
    "RNF-11 el enlace «%s» tiene un ícono decorativo con aria-hidden",
    async (etiqueta) => {
      const menu = await abrirMenu();
      const enlace = menu.getByRole("link", { name: etiqueta });

      const icono = enlace.querySelector("svg");
      expect(icono).not.toBeNull();
      expect(icono).toHaveAttribute("aria-hidden", "true");
    },
  );

  it("RNF-11 el ícono no altera el nombre accesible: sigue siendo la etiqueta", async () => {
    const menu = await abrirMenu();
    for (const etiqueta of etiquetas) {
      expect(menu.getByRole("link", { name: etiqueta })).toHaveAccessibleName(etiqueta);
    }
  });

  it("RNF-11 cada sección usa un ícono distinto", async () => {
    const menu = await abrirMenu();
    const clases = menu
      .getAllByRole("link")
      .map((enlace) => enlace.querySelector("svg")?.getAttribute("class") ?? "");
    expect(clases.every((c) => c.includes("lucide"))).toBe(true);
    expect(new Set(clases).size).toBe(11);
  });

  it("RNF-11 el ítem activo se marca con aria-current=page y solo ese", async () => {
    const menu = await abrirMenu("/clientes");
    const activos = menu
      .getAllByRole("link")
      .filter((a) => a.getAttribute("aria-current") === "page");
    expect(activos).toHaveLength(1);
    expect(activos[0]).toHaveAccessibleName("Clientes");
  });

  it("RNF-11 el ítem activo se distingue con una señal no cromática (peso de fuente)", async () => {
    const menu = await abrirMenu("/clientes");
    const activo = menu.getByRole("link", { name: "Clientes" });
    const inactivo = menu.getByRole("link", { name: "Agenda" });

    // El color nunca es la única señal (WCAG AA): el activo tiene además un peso de fuente mayor.
    expect(activo.className).toMatch(/\bfont-(semibold|bold)\b/);
    expect(inactivo.className).not.toMatch(/\bfont-(semibold|bold)\b/);
  });
});
