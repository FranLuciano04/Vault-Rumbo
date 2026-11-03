import { crearCliente } from "@rumbo/shared";
import {
  crearServidor,
  manejadorYo,
  manejadoresDashboardPara,
  type RolMock,
} from "@rumbo/shared/mocks";
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

describe("RF-131 Reportes visible solo para admin y dueño", () => {
  it.each(["admin", "dueno"] as RolMock[])("RF-131 el rol %s ve los reportes", async (rol) => {
    servidor.use(manejadorYo(rol), ...manejadoresDashboardPara(rol));
    abrir("/reportes");

    expect(await screen.findByRole("heading", { level: 1, name: "Reportes" })).toBeInTheDocument();
  });

  it.each(["empleado", "freelance"] as RolMock[])(
    "RF-131 el rol %s no accede: vuelve a la agenda",
    async (rol) => {
      servidor.use(manejadorYo(rol));
      abrir("/reportes");

      await waitFor(() => {
        expect(window.location.pathname).toBe("/agenda");
      });
      expect(screen.queryByRole("heading", { level: 1, name: "Reportes" })).not.toBeInTheDocument();
    },
  );
});
