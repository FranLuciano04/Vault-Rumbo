import { crearCliente } from "@rumbo/shared";
import { crearServidor, manejadorYo } from "@rumbo/shared/mocks";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

type Rol = Parameters<typeof manejadorYo>[0];

async function montar(rol: Rol = "admin", ruta = "/agenda") {
  servidor.use(manejadorYo(rol));
  window.history.pushState({}, "", ruta);
  render(<App cliente={cliente} />);
  const menu = await screen.findByRole("navigation", { name: /principal/i });
  const boton = screen.getByRole("button", { name: /men[uú]/i });
  return { menu, boton };
}

/** jsdom no aplica media queries: el panel colapsado se reconoce por la clase `hidden` (con `md:flex` para escritorio). */
function panelDe(boton: HTMLElement): HTMLElement {
  const id = boton.getAttribute("aria-controls");
  expect(id).toBeTruthy();
  const panel = document.getElementById(id as string);
  expect(panel).not.toBeNull();
  return panel as HTMLElement;
}

const estaOculto = (el: HTMLElement) => el.classList.contains("hidden");

describe("RNF-14 barra lateral en pantallas angostas", () => {
  it("RNF-14 hay un botón con nombre accesible, cerrado por defecto (aria-expanded=false)", async () => {
    const { boton } = await montar();
    expect(boton).toHaveAttribute("aria-expanded", "false");
  });

  it("RNF-14 el botón apunta con aria-controls al panel que contiene la navegación", async () => {
    const { boton, menu } = await montar();
    expect(panelDe(boton)).toContainElement(menu);
  });

  it("RNF-14 cerrada, la barra queda oculta por debajo de md y visible desde md (hidden md:flex)", async () => {
    const { boton } = await montar();
    const panel = panelDe(boton);
    expect(estaOculto(panel)).toBe(true);
    expect(panel.className).toMatch(/(^|\s)md:flex(\s|$)/);
  });

  it("RNF-14 el botón solo se muestra por debajo de md (md:hidden)", async () => {
    const { boton } = await montar();
    expect(boton.className).toMatch(/(^|\s)md:hidden(\s|$)/);
  });

  it("RNF-14 el botón abre la navegación (aria-expanded=true y el panel deja de estar oculto)", async () => {
    const usuario = userEvent.setup();
    const { boton } = await montar();

    await usuario.click(boton);

    expect(boton).toHaveAttribute("aria-expanded", "true");
    expect(estaOculto(panelDe(boton))).toBe(false);
  });

  it("RNF-14 el botón vuelve a cerrar la navegación", async () => {
    const usuario = userEvent.setup();
    const { boton } = await montar();

    await usuario.click(boton);
    await usuario.click(boton);

    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(estaOculto(panelDe(boton))).toBe(true);
  });

  it("RNF-14 elegir una sección cierra la navegación y navega a esa sección", async () => {
    const usuario = userEvent.setup();
    const { boton, menu } = await montar("admin", "/agenda");

    await usuario.click(boton);
    await usuario.click(within(menu).getByRole("link", { name: "Clientes" }));

    expect(window.location.pathname).toBe("/clientes");
    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(estaOculto(panelDe(boton))).toBe(true);
  });

  it("RNF-14 la navegación por rol de T-020 no cambia: el admin sigue viendo las 11 secciones", async () => {
    const { menu } = await montar("admin");
    expect(within(menu).getAllByRole("link")).toHaveLength(11);
  });

  it("RNF-14 la navegación por rol de T-020 no cambia: el empleado no ve Dashboard, Reportes ni Configuración", async () => {
    const { menu } = await montar("empleado");
    for (const etiqueta of ["Dashboard", "Reportes", "Configuración"]) {
      expect(within(menu).queryByRole("link", { name: etiqueta })).toBeNull();
    }
    expect(within(menu).getByRole("link", { name: "Clientes" })).toBeInTheDocument();
  });
});
