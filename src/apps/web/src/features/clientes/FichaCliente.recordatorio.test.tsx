import { crearCliente } from "@rumbo/shared";
import {
  clientesMock,
  crearServidor,
  manejadoresClientes,
  manejadoresM1,
  usuariosPorRol,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { FichaCliente } from "./FichaCliente";

const servidor = crearServidor(
  http.get("*/api/usuarios/asesores", () => HttpResponse.json([])),
  ...manejadoresClientes,
  ...manejadoresM1,
);
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  servidor.resetHandlers();
});
afterAll(() => {
  servidor.close();
});

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });
const [camila] = clientesMock;
if (!camila) throw new Error("falta un cliente mock");

describe("RF-080 recordatorio desde la ficha", () => {
  it("RF-080 abre el formulario asociado al cliente, lo guarda con su id y lo cierra", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(
      http.post("*/api/alertas", async ({ request }) => {
        cuerpos.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    const usuario = userEvent.setup();
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={[`/clientes/${camila.id}`]}>
          <Routes>
            <Route
              path="/clientes/:id"
              element={<FichaCliente cliente={cliente} usuario={usuariosPorRol.empleado} />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const nuevo = await screen.findByRole("button", { name: /nuevo recordatorio/i });
    await usuario.click(nuevo);

    expect(await screen.findByText(`Asociado a: ${camila.nombre}`)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /descripci[oó]n/i })).toHaveFocus();
    await usuario.type(screen.getByRole("textbox", { name: /descripci[oó]n/i }), "Mandar fotos");
    fireEvent.change(screen.getByLabelText(/^fecha/i), { target: { value: "2026-11-02" } });
    await usuario.click(screen.getByRole("button", { name: /^guardar/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({ cliente_id: camila.id, descripcion: "Mandar fotos" });
    expect(await screen.findByText("Recordatorio creado para el 02/11/26")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /descripci[oó]n/i })).not.toBeInTheDocument();
    expect(nuevo).toHaveFocus();
  });
});
