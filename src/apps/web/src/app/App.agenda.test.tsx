import { crearCliente } from "@rumbo/shared";
import { crearServidor, manejadoresAlertas } from "@rumbo/shared/mocks";
import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll } from "vitest";
import { App } from "@/app/App";

const servidor = crearServidor(...manejadoresAlertas);
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
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
      await screen.findByText("Pedir el pasaporte vigente: Roma exige 6 meses de validez."),
    ).toBeInTheDocument();
  });
});
