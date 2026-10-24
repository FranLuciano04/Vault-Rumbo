import { crearCliente } from "@rumbo/shared";
import { crearServidor } from "@rumbo/shared/mocks";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll } from "vitest";
import { App } from "@/app/App";

const servidor = crearServidor();
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  servidor.resetHandlers();
  vi.useRealTimers();
  window.history.pushState({}, "", "/");
});
afterAll(() => {
  servidor.close();
});

describe("RF-141 /auth/yo responde 200 con HTML (API apagada, index.html de Vite)", () => {
  it("RF-141 RutaProtegida muestra «No pudimos verificar tu sesión» y no el menú", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    servidor.use(
      http.get(
        "*/api/auth/yo",
        () =>
          new HttpResponse("<!doctype html><html><body></body></html>", {
            status: 200,
            headers: { "content-type": "text/html" },
          }),
      ),
    );
    window.history.pushState({}, "", "/agenda");
    const cliente = crearCliente({ baseURL: "http://localhost/api", obtenerToken: () => "token" });
    render(<App cliente={cliente} />);
    // useYo reintenta con espera creciente: se adelanta el reloj para llegar al error final.
    await vi.advanceTimersByTimeAsync(10_000);

    expect(await screen.findByText(/No pudimos verificar tu sesión/i)).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /principal/i })).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/agenda");
  });
});
