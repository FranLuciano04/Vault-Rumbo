import { crearCliente } from "@rumbo/shared";
import {
  contenidosMock,
  crearServidor,
  manejadoresRedes,
  usuariosPorRol,
  type RolMock,
} from "@rumbo/shared/mocks";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
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
const tituloIdea = contenidosMock[0]?.titulo ?? "";

function abrirComo(rol: RolMock, accesoRedes: boolean) {
  servidor.use(
    http.get("*/api/auth/yo", () =>
      HttpResponse.json({ ...usuariosPorRol[rol], acceso_redes: accesoRedes }),
    ),
    ...manejadoresRedes,
  );
  window.history.pushState({}, "", "/redes");
  render(<App cliente={cliente} />);
}

describe("RF-117 Redes solo con acceso a redes", () => {
  it("RF-117 un empleado con acceso ve el tablero de contenido", async () => {
    abrirComo("empleado", true);

    expect(await screen.findByText(tituloIdea)).toBeInTheDocument();
  });

  it("RF-117 un empleado sin acceso vuelve a la agenda", async () => {
    abrirComo("empleado", false);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/agenda");
    });
    expect(screen.queryByText(tituloIdea)).not.toBeInTheDocument();
  });

  it("RF-117 el freelance vuelve a la agenda aunque tenga la capacidad", async () => {
    abrirComo("freelance", true);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/agenda");
    });
  });
});
