import { crearCliente } from "@rumbo/shared";
import { crearServidor, manejadoresAlertas } from "@rumbo/shared/mocks";
import { render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { App } from "@/app/App";

const servidor = crearServidor(...manejadoresAlertas);
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
// El «hoy» de los mocks (HOY_MOCK).
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-25T12:00:00-03:00") });
});
afterEach(() => {
  vi.useRealTimers();
});
afterAll(() => {
  servidor.close();
});

describe("RF-074 agenda como pantalla de inicio", () => {
  it("RF-074 la ruta /agenda muestra la agenda con las alertas del día", async () => {
    window.history.pushState({}, "", "/agenda");
    const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });
    render(<App cliente={cliente} />);

    expect(
      await screen.findByText(
        "Pedir el pasaporte vigente: Roma exige 6 meses de validez.",
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });
});
