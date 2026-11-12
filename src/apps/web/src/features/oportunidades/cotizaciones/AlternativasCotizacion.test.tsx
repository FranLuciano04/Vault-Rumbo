/**
 * T-178: las cotizaciones de una oportunidad se muestran como alternativas, no como versiones
 * (RF-024, RF-025, DEC-0028). «Cotización 1» es la primera emitida; «Aceptar» se ofrece en
 * cualquier cotización enviada, no solo en la última.
 */
import { crearCliente } from "@rumbo/shared";
import {
  cotizacionesMock,
  crearServidor,
  idCotizacionMock,
  idOportunidadMock,
  manejadoresOportunidades,
  usuariosPorRol,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll } from "vitest";
import { CotizacionesOportunidad } from "./CotizacionesOportunidad";

const servidor = crearServidor(...manejadoresOportunidades);
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

/** Las dos cotizaciones de Europa, ambas enviadas, de la más reciente a la más antigua. */
function dosEnviadas() {
  return http.get("*/api/oportunidades/:id/cotizaciones", () =>
    HttpResponse.json({
      items: [
        { ...cotizacionesMock[1], estado: "enviada" },
        { ...cotizacionesMock[0], estado: "enviada" },
      ],
      total: 2,
      pagina: 1,
      por_pagina: 100,
    }),
  );
}

function renderCotizaciones() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CotizacionesOportunidad
        cliente={cliente}
        usuario={usuariosPorRol.empleado}
        oportunidadId={idOportunidadMock.cotizada}
      />
    </QueryClientProvider>,
  );
}

const fila = async (nombre: string) => {
  const li = (await screen.findByText(new RegExp(`^${nombre}\\b`))).closest("li");
  if (!li) throw new Error(`«${nombre}» no está en un li`);
  return li;
};

describe("RF-025 aceptar una alternativa", () => {
  it("RF-024 muestra «Cotización 1» y «Cotización 2» y no habla de versiones", async () => {
    renderCotizaciones();

    expect(await fila("Cotización 1")).toBeInTheDocument();
    expect(await fila("Cotización 2")).toBeInTheDocument();
    expect(screen.queryByText(/versi[oó]n/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /versi[oó]n/i })).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: /cotizaciones/i })).toBeInTheDocument();
  });

  it("RF-025 con dos cotizaciones enviadas, las dos ofrecen «Aceptar»", async () => {
    servidor.use(dosEnviadas());
    renderCotizaciones();

    for (const nombre of ["Cotización 1", "Cotización 2"]) {
      expect(
        within(await fila(nombre)).getByRole("button", { name: /aceptar/i }),
      ).toBeInTheDocument();
    }
  });

  it("RF-025 aceptar una alternativa anterior llama a /aceptar con el id de esa cotización", async () => {
    const llamadas: string[] = [];
    servidor.use(
      dosEnviadas(),
      http.post("*/api/cotizaciones/:id/aceptar", ({ params }) => {
        llamadas.push(String(params["id"]));
        return HttpResponse.json({ ...cotizacionesMock[0], estado: "aceptada" });
      }),
    );
    const usuario = userEvent.setup();
    renderCotizaciones();

    await usuario.click(
      within(await fila("Cotización 1")).getByRole("button", { name: /aceptar/i }),
    );

    await waitFor(() => {
      expect(llamadas).toEqual([idCotizacionMock.europa_v1]);
    });
  });

  it("RF-025 una cotización rechazada no ofrece «Aceptar» y la enviada sí", async () => {
    renderCotizaciones();

    expect(
      within(await fila("Cotización 1")).queryByRole("button", { name: /aceptar/i }),
    ).not.toBeInTheDocument();
    expect(
      within(await fila("Cotización 2")).getByRole("button", { name: /aceptar/i }),
    ).toBeInTheDocument();
  });
});
