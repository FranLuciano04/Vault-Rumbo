import { crearCliente } from "@rumbo/shared";
import { crearServidor, manejadorYo, type RolMock } from "@rumbo/shared/mocks";
import { render, screen, waitFor } from "@testing-library/react";
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

describe("RF-083 Configuración visible solo para admin y dueño", () => {
  it.each(["admin", "dueno"] as RolMock[])(
    "RF-083 el rol %s ve las pestañas en /configuracion",
    async (rol) => {
      servidor.use(manejadorYo(rol));
      abrir("/configuracion");

      expect(
        await screen.findByRole("tab", { name: /parámetros y comisiones/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /operadores/i })).toBeInTheDocument();
    },
  );

  it.each(["empleado", "freelance"] as RolMock[])(
    "RF-083 el rol %s no accede: vuelve a la agenda y no ve pestañas",
    async (rol) => {
      servidor.use(manejadorYo(rol));
      abrir("/configuracion");

      await waitFor(() => {
        expect(window.location.pathname).toBe("/agenda");
      });
      expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    },
  );
});
