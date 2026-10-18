import { crearCliente } from "@rumbo/shared";
import { crearServidor } from "@rumbo/shared/mocks";
import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll } from "vitest";
import { App } from "@/app/App";

const servidor = crearServidor();
beforeAll(() => { servidor.listen({ onUnhandledRequest: "error" }); });
afterAll(() => { servidor.close(); });

describe("App", () => {
  it("muestra la marca de la aplicación en el shell con sesión", async () => {
    window.history.pushState({}, "", "/agenda");
    const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });
    render(<App cliente={cliente} />);
    expect(await screen.findByText("Rumbo")).toBeInTheDocument();
  });
});
