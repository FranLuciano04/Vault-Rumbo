import { crearCliente, type UsuarioActual } from "@rumbo/shared";
import {
  cotizacionesMock,
  crearServidor,
  destinosMock,
  idOportunidadMock,
  manejadoresAlertas,
  manejadoresM1,
  manejadoresOportunidades,
  manejadoresViajes,
  usuariosPorRol,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes, useParams } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { DetalleOportunidad } from "./DetalleOportunidad";

const servidor = crearServidor(
  ...manejadoresOportunidades,
  ...manejadoresAlertas,
  ...manejadoresM1,
  ...manejadoresViajes,
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

function FichaDelViaje() {
  const { id } = useParams();
  return <p>Ficha del viaje {id}</p>;
}

function renderDetalle(id: string, usuarioActual: UsuarioActual = usuariosPorRol.empleado) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/oportunidades/${id}`]}>
        <Routes>
          <Route
            path="/oportunidades/:id"
            element={<DetalleOportunidad cliente={cliente} usuario={usuarioActual} />}
          />
          <Route path="/viajes/:id" element={<FichaDelViaje />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const roma = destinosMock[2];
const aceptadas = cotizacionesMock.filter((c) => c.estado === "aceptada");

/** La cotizada de Europa con una cotización aceptada: la reserva se confirma desde una oportunidad abierta (CU-07 flujo principal). */
const CON_ACEPTADA = idOportunidadMock.cotizada;
const conCotizacionAceptada = () =>
  http.get(`*/api/oportunidades/${CON_ACEPTADA}/cotizaciones`, () =>
    HttpResponse.json({
      items: aceptadas.map((c) => ({ ...c, oportunidad_id: CON_ACEPTADA })),
      total: aceptadas.length,
      pagina: 1,
      por_pagina: 20,
    }),
  );
/** Venta directa: oportunidad ganada sin ninguna cotización (CU-07 A1). */
const sinCotizaciones = (id: string) =>
  http.get(`*/api/oportunidades/${id}/cotizaciones`, () =>
    HttpResponse.json({ items: [], total: 0, pagina: 1, por_pagina: 20 }),
  );

/** Registra el cuerpo del POST y deja seguir con el handler del mock. */
function registrarReserva(cuerpos: Record<string, unknown>[]) {
  return http.post("*/api/oportunidades/:id/confirmar-reserva", async ({ request }) => {
    cuerpos.push((await request.clone().json()) as Record<string, unknown>);
    return undefined;
  });
}

type Usuario = ReturnType<typeof userEvent.setup>;

async function abrirDialogo(usuario: Usuario) {
  await usuario.click(await screen.findByRole("button", { name: /confirmar reserva/i }));
  return screen.findByRole("dialog", { name: /confirmar reserva/i });
}

async function completarDatos(
  dialogo: HTMLElement,
  usuario: Usuario,
  { destino = true, fechas = true }: { destino?: boolean; fechas?: boolean } = {},
) {
  const d = within(dialogo);
  if (destino) {
    await usuario.selectOptions(await d.findByLabelText(/destino/i), roma.id);
  }
  if (fechas) {
    fireEvent.change(d.getByLabelText(/salida/i), { target: { value: "2026-12-01" } });
    fireEvent.change(d.getByLabelText(/regreso/i), { target: { value: "2026-12-15" } });
  }
  await usuario.selectOptions(d.getByLabelText(/categoría/i), "individual");
}

const confirmar = (dialogo: HTMLElement) =>
  within(dialogo).getByRole("button", { name: /^confirmar/i });

describe("RF-032 confirmar reserva", () => {
  it("RF-032 una oportunidad abierta con cotización aceptada ofrece «Confirmar reserva»", async () => {
    servidor.use(conCotizacionAceptada());
    renderDetalle(CON_ACEPTADA);

    expect(await screen.findByRole("button", { name: /confirmar reserva/i })).toBeInTheDocument();
  });

  it("RF-032 sin cotización aceptada y sin estar ganada no ofrece confirmar la reserva", async () => {
    renderDetalle(idOportunidadMock.en_gestion);
    await screen.findByRole("heading", { name: /mendoza/i });

    expect(screen.queryByRole("button", { name: /confirmar reserva/i })).not.toBeInTheDocument();
  });

  it("RF-032 una oportunidad perdida no ofrece confirmar la reserva", async () => {
    renderDetalle(idOportunidadMock.perdida);
    await screen.findByRole("heading", { name: /miami/i });

    expect(screen.queryByRole("button", { name: /confirmar reserva/i })).not.toBeInTheDocument();
  });

  it("RF-032 el diálogo pide destino, fechas de salida y regreso, categoría y responsable", async () => {
    servidor.use(conCotizacionAceptada());
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const d = within(await abrirDialogo(usuario));

    expect(d.getByLabelText(/destino/i)).toBeInTheDocument();
    expect(d.getByLabelText(/salida/i)).toBeInTheDocument();
    expect(d.getByLabelText(/regreso/i)).toBeInTheDocument();
    expect(d.getByLabelText(/categoría/i)).toBeInTheDocument();
    expect(d.getByLabelText(/responsable/i)).toBeInTheDocument();
  });

  it("RF-032 envía destino, fechas y categoría al confirmar", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(conCotizacionAceptada(), registrarReserva(cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const dialogo = await abrirDialogo(usuario);
    await completarDatos(dialogo, usuario);
    await usuario.click(confirmar(dialogo));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({
      destino_id: roma.id,
      fecha_salida: "2026-12-01",
      fecha_regreso: "2026-12-15",
      categoria: "individual",
    });
  });

  it("RF-032 cancelar el diálogo no crea la reserva", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(conCotizacionAceptada(), registrarReserva(cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const dialogo = await abrirDialogo(usuario);
    await usuario.click(within(dialogo).getByRole("button", { name: /cancelar/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-032 si la API rechaza la reserva muestra el motivo y no navega", async () => {
    servidor.use(
      conCotizacionAceptada(),
      http.post("*/api/oportunidades/:id/confirmar-reserva", () =>
        HttpResponse.json(
          {
            type: "about:blank",
            title: "Conflicto",
            status: 409,
            detail: "La oportunidad ya tiene un viaje.",
          },
          { status: 409, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const dialogo = await abrirDialogo(usuario);
    await completarDatos(dialogo, usuario);
    await usuario.click(confirmar(dialogo));

    expect(await screen.findByText(/ya tiene un viaje/i)).toBeInTheDocument();
    expect(screen.queryByText(/ficha del viaje/i)).not.toBeInTheDocument();
  });
});

describe("RF-032 venta directa sin cotización (A1)", () => {
  const ganadaDirecta = idOportunidadMock.ganada;

  it("RF-032 una oportunidad ganada sin cotizaciones ofrece «Confirmar reserva»", async () => {
    servidor.use(sinCotizaciones(ganadaDirecta));
    renderDetalle(ganadaDirecta);

    expect(await screen.findByRole("button", { name: /confirmar reserva/i })).toBeInTheDocument();
  });

  it("RF-032 la venta directa confirma el viaje con los mismos datos", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(sinCotizaciones(ganadaDirecta), registrarReserva(cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(ganadaDirecta);

    const dialogo = await abrirDialogo(usuario);
    await completarDatos(dialogo, usuario);
    await usuario.click(confirmar(dialogo));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({ destino_id: roma.id });
  });
});

describe("RF-033 datos faltantes", () => {
  it("RF-033 sin destino no confirma y pide completarlo", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(conCotizacionAceptada(), registrarReserva(cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const dialogo = await abrirDialogo(usuario);
    await completarDatos(dialogo, usuario, { destino: false });
    await usuario.click(confirmar(dialogo));

    expect(await within(dialogo).findByText(/elegí un destino|destino.*(obligatori|requerid)/i)).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("RF-033 sin fechas no confirma y pide completarlas", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(conCotizacionAceptada(), registrarReserva(cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const dialogo = await abrirDialogo(usuario);
    await completarDatos(dialogo, usuario, { fechas: false });
    await usuario.click(confirmar(dialogo));

    expect(
      await within(dialogo).findAllByText(/(ingresá|elegí).*fecha|fecha.*(obligatori|requerid)/i),
    ).not.toHaveLength(0);
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-033 un regreso anterior a la salida no se confirma", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(conCotizacionAceptada(), registrarReserva(cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const dialogo = await abrirDialogo(usuario);
    await completarDatos(dialogo, usuario);
    fireEvent.change(within(dialogo).getByLabelText(/regreso/i), {
      target: { value: "2026-11-20" },
    });
    await usuario.click(confirmar(dialogo));

    expect(
      await within(dialogo).findByText(/regreso.*anterior|anterior.*salida/i),
    ).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });
});

describe("RF-036 tras confirmar sigue la ficha del viaje", () => {
  it("RF-036 navega a /viajes/{id} con el id del viaje creado", async () => {
    const viajeId = "0b7d6a5c-1111-4222-8333-444455556666";
    servidor.use(
      conCotizacionAceptada(),
      http.post("*/api/oportunidades/:id/confirmar-reserva", () =>
        HttpResponse.json({ id: viajeId, estado: "reservado" }, { status: 201 }),
      ),
    );
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const dialogo = await abrirDialogo(usuario);
    await completarDatos(dialogo, usuario);
    await usuario.click(confirmar(dialogo));

    expect(await screen.findByText(`Ficha del viaje ${viajeId}`)).toBeInTheDocument();
  });
});
