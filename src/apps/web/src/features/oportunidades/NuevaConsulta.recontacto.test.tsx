import { crearCliente } from "@rumbo/shared";
import {
  clientesMock,
  crearServidor,
  manejadoresClientes,
  manejadoresOportunidades,
  oportunidadesMock,
  usuariosPorRol,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { NuevaConsulta } from "./NuevaConsulta";

// T-116 (CU-30 A2): «Crear consulta» desde la sugerencia abre el formulario con el cliente elegido.
const servidor = crearServidor(...manejadoresClientes, ...manejadoresOportunidades);
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
const joaquin = clientesMock.find((c) => c.nombre === "Joaquín Ramos");
if (!joaquin) throw new Error("falta Joaquín Ramos en los mocks");

const sinOportunidades = http.get("*/api/oportunidades", () =>
  HttpResponse.json({ items: [], total: 0, pagina: 1, por_pagina: 20 }),
);

function renderConsulta(ruta: string) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route
            path="/oportunidades/nueva"
            element={<NuevaConsulta cliente={cliente} usuario={usuariosPorRol.empleado} />}
          />
          <Route path="/oportunidades/:id" element={<p>Detalle de la oportunidad</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("RF-029 decisión de recontacto: formulario precargado", () => {
  it("RF-029 con ?cliente_id el formulario ya tiene elegido al cliente", async () => {
    servidor.use(sinOportunidades);
    renderConsulta(`/oportunidades/nueva?cliente_id=${joaquin.id}`);

    expect(await screen.findByText(joaquin.nombre)).toBeInTheDocument();
    expect(screen.queryByRole("searchbox", { name: /buscar cliente/i })).not.toBeInTheDocument();
  });

  it("RF-029 registrar la consulta precargada envía el cliente_id de la sugerencia", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(
      sinOportunidades,
      http.post("*/api/oportunidades", async ({ request }) => {
        const cuerpo = (await request.json()) as Record<string, unknown>;
        cuerpos.push(cuerpo);
        return HttpResponse.json({ ...oportunidadesMock[0], ...cuerpo, id: "n1" }, { status: 201 });
      }),
    );
    const usuario = userEvent.setup();
    renderConsulta(`/oportunidades/nueva?cliente_id=${joaquin.id}`);
    await screen.findByText(joaquin.nombre);
    await usuario.selectOptions(screen.getByRole("combobox", { name: /canal/i }), "whatsapp");
    await usuario.type(screen.getByRole("textbox", { name: /destino/i }), "Lisboa");
    await usuario.clear(screen.getByRole("spinbutton", { name: /pasajeros/i }));
    await usuario.type(screen.getByRole("spinbutton", { name: /pasajeros/i }), "1");

    await usuario.click(screen.getByRole("button", { name: /registrar consulta/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({ cliente_id: joaquin.id, destino_consultado: "Lisboa" });
  });

  it("RF-029 sin ?cliente_id el formulario sigue pidiendo buscar al cliente", async () => {
    renderConsulta("/oportunidades/nueva");

    expect(await screen.findByRole("searchbox", { name: /buscar cliente/i })).toBeInTheDocument();
  });
});
