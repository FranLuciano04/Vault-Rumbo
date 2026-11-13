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
  oportunidadesMock,
  usuariosPorRol,
  viajesMock,
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

const destinoActivo = destinosMock[1];
const aceptadas = cotizacionesMock.filter((c) => c.estado === "aceptada");
const total = aceptadas[0]?.total ?? "";

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

const VENCIMIENTO = "2030-01-15";
/** Menor que el total de las cotizaciones aceptadas del mock (3200.00): el primer pago no puede superar el precio. */
const MONTO_PRIMER_PAGO = "1000.00";

async function completarDatos(
  dialogo: HTMLElement,
  usuario: Usuario,
  {
    destino = true,
    fechas = true,
    precio,
    costo = "1500000.00",
    monto = MONTO_PRIMER_PAGO,
    tipo = "sena",
    vencimiento = VENCIMIENTO,
  }: {
    destino?: boolean;
    fechas?: boolean;
    precio?: string;
    costo?: string;
    monto?: string;
    tipo?: string;
    vencimiento?: string;
  } = {},
) {
  const d = within(dialogo);
  // El diálogo viene precargado: «sin destino» y «sin fechas» hay que vaciarlos a propósito.
  await usuario.selectOptions(await d.findByLabelText(/destino/i), destino ? destinoActivo.id : "");
  fireEvent.change(d.getByLabelText(/salida/i), { target: { value: fechas ? "2026-12-01" : "" } });
  fireEvent.change(d.getByLabelText(/regreso/i), {
    target: { value: fechas ? "2026-12-15" : "" },
  });
  await usuario.selectOptions(d.getByLabelText(/categoría/i), "individual");
  if (precio !== undefined) {
    const campo = d.getByLabelText(/precio de venta/i);
    await usuario.clear(campo);
    await usuario.type(campo, precio);
  }
  if (costo) await usuario.type(d.getByLabelText(/costo/i), costo);
  if (monto) await usuario.type(d.getByLabelText(/monto/i), monto);
  await usuario.selectOptions(d.getByLabelText(/tipo de pago/i), tipo);
  if (vencimiento) {
    fireEvent.change(d.getByLabelText(/vencimiento/i), { target: { value: vencimiento } });
  }
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
      destino_id: destinoActivo.id,
      fecha_salida: "2026-12-01",
      fecha_regreso: "2026-12-15",
      categoria: "individual",
      economia: { precio_venta: total, costo: "1500000.00" },
      plan_de_pagos: {
        pagos: [{ monto: MONTO_PRIMER_PAGO, tipo: "sena", vencimiento: VENCIMIENTO }],
      },
    });
    // La moneda se toma de la cotización aceptada: no se envía.
    expect(cuerpos[0]).not.toHaveProperty("moneda");
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
    await usuario.selectOptions(within(dialogo).getByLabelText(/moneda/i), "USD");
    await completarDatos(dialogo, usuario, { precio: "2000000.00" });
    await usuario.click(confirmar(dialogo));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({
      destino_id: destinoActivo.id,
      moneda: "USD",
      economia: { precio_venta: "2000000.00", costo: "1500000.00" },
    });
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

    expect(
      await within(dialogo).findByText(/elegí un destino|destino.*(obligatori|requerid)/i),
    ).toBeInTheDocument();
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

describe("RF-032 economía y primer pago del diálogo", () => {
  it("RF-032 el costo y el vencimiento arrancan vacíos y el precio trae el total de la cotización aceptada", async () => {
    servidor.use(conCotizacionAceptada());
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const d = within(await abrirDialogo(usuario));

    expect(d.getByLabelText(/precio de venta/i)).toHaveValue(total);
    expect(d.getByLabelText(/costo/i)).toHaveValue("");
    expect(d.getByLabelText(/vencimiento/i)).toHaveValue("");
  });

  it("RF-032 en la venta directa el precio de venta arranca vacío y se pide la moneda", async () => {
    servidor.use(sinCotizaciones(idOportunidadMock.ganada));
    const usuario = userEvent.setup();
    renderDetalle(idOportunidadMock.ganada);

    const d = within(await abrirDialogo(usuario));

    expect(d.getByLabelText(/precio de venta/i)).toHaveValue("");
    expect(d.getByLabelText(/moneda/i)).toBeInTheDocument();
  });

  it("RF-032 el precio de venta tiene que ser mayor que cero", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(sinCotizaciones(idOportunidadMock.ganada), registrarReserva(cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(idOportunidadMock.ganada);

    const dialogo = await abrirDialogo(usuario);
    await completarDatos(dialogo, usuario, { precio: "0" });
    await usuario.click(confirmar(dialogo));

    await waitFor(() => {
      expect(within(dialogo).getByLabelText(/precio de venta/i)).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-032 sin costo no confirma", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(conCotizacionAceptada(), registrarReserva(cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const dialogo = await abrirDialogo(usuario);
    await completarDatos(dialogo, usuario, { costo: "" });
    await usuario.click(confirmar(dialogo));

    await waitFor(() => {
      expect(within(dialogo).getByLabelText(/costo/i)).toHaveAttribute("aria-invalid", "true");
    });
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-032 sin vencimiento no confirma", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(conCotizacionAceptada(), registrarReserva(cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const dialogo = await abrirDialogo(usuario);
    await completarDatos(dialogo, usuario, { vencimiento: "" });
    await usuario.click(confirmar(dialogo));

    await waitFor(() => {
      expect(within(dialogo).getByLabelText(/vencimiento/i)).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-032 un vencimiento anterior a hoy no se confirma", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(conCotizacionAceptada(), registrarReserva(cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const dialogo = await abrirDialogo(usuario);
    await completarDatos(dialogo, usuario, { vencimiento: "2020-01-01" });
    await usuario.click(confirmar(dialogo));

    expect(await within(dialogo).findByText(/vencimiento.*(anterior|pasad)/i)).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });
});

describe("RF-032 oportunidad que ya tiene viaje", () => {
  const viajeExistente = {
    ...viajesMock[0],
    id: "0b7d6a5c-2222-4333-8444-555566667777",
    oportunidad_id: CON_ACEPTADA,
  };
  const conViaje = () =>
    http.get("*/api/viajes", () =>
      HttpResponse.json({ items: [viajeExistente], total: 1, pagina: 1, por_pagina: 20 }),
    );

  it("RF-032 no ofrece «Confirmar reserva» y ofrece «Ver viaje» a la ficha", async () => {
    servidor.use(conCotizacionAceptada(), conViaje());
    renderDetalle(CON_ACEPTADA);

    const enlace = await screen.findByRole("link", { name: /ver viaje/i });

    expect(enlace).toHaveAttribute("href", `/viajes/${viajeExistente.id}`);
    expect(screen.queryByRole("button", { name: /confirmar reserva/i })).not.toBeInTheDocument();
  });
});

describe("RF-032 ganada con cotizaciones sin ninguna aceptada", () => {
  const ganada = idOportunidadMock.ganada;
  const soloRechazada = () =>
    http.get(`*/api/oportunidades/${ganada}/cotizaciones`, () =>
      HttpResponse.json({
        items: aceptadas.map((c) => ({ ...c, estado: "rechazada" })),
        total: aceptadas.length,
        pagina: 1,
        por_pagina: 20,
      }),
    );

  it("RF-032 se confirma como venta directa y pide la moneda", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(soloRechazada(), registrarReserva(cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(ganada);

    const dialogo = await abrirDialogo(usuario);
    await usuario.selectOptions(within(dialogo).getByLabelText(/moneda/i), "USD");
    await completarDatos(dialogo, usuario, { precio: "3200.00" });
    await usuario.click(confirmar(dialogo));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({ moneda: "USD", economia: { precio_venta: "3200.00" } });
  });
});

/** Reemplaza la oportunidad que devuelve la API (para probar otros textos de destino o fechas). */
const oportunidadCon = (id: string, cambios: Record<string, unknown>) =>
  http.get(`*/api/oportunidades/${id}`, () => {
    const original = oportunidadesMock.find((o) => o.id === id);
    return HttpResponse.json({ ...original, ...cambios });
  });

/** Catálogo con dos destinos activos cuyo nombre coincide con «Europa» (sin distinguir mayúsculas). */
const catalogoConEuropaRepetida = () =>
  http.get("*/api/destinos", () => {
    const europa = destinosMock.find((d) => d.nombre === "Europa");
    const items = [
      ...destinosMock,
      { ...europa, id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4eff", nombre: "EUROPA", pais: "Otro" },
    ];
    return HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 100 });
  });

const idEuropa = destinosMock.find((d) => d.nombre === "Europa")?.id ?? "";
const idCancun = destinosMock.find((d) => d.nombre === "Cancún")?.id ?? "";

describe("RF-032 reserva precargada con la cotización", () => {
  it("RF-032 la salida y el regreso salen de las fechas tentativas de la oportunidad", async () => {
    servidor.use(conCotizacionAceptada());
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const d = within(await abrirDialogo(usuario));

    expect(d.getByLabelText(/salida/i)).toHaveValue("2027-05-10");
    expect(d.getByLabelText(/regreso/i)).toHaveValue("2027-05-30");
  });

  it("RF-032 sin fechas tentativas en la oportunidad, la salida y el regreso quedan vacíos", async () => {
    servidor.use(
      conCotizacionAceptada(),
      oportunidadCon(CON_ACEPTADA, { fecha_desde_tentativa: null, fecha_hasta_tentativa: null }),
    );
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const d = within(await abrirDialogo(usuario));

    expect(d.getByLabelText(/salida/i)).toHaveValue("");
    expect(d.getByLabelText(/regreso/i)).toHaveValue("");
  });

  it("RF-032 el precio de venta es el total de la cotización aceptada y la moneda es la suya, sin poder cambiarla", async () => {
    servidor.use(conCotizacionAceptada());
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const d = within(await abrirDialogo(usuario));

    expect(d.getByLabelText(/precio de venta/i)).toHaveValue(total);
    expect(d.getByLabelText(/precio de venta \(USD\)/i)).toBeInTheDocument();
    expect(d.queryByLabelText(/^moneda/i)).not.toBeInTheDocument();
  });

  it("RF-032 preelige el destino del catálogo que coincide con el destino consultado", async () => {
    servidor.use(conCotizacionAceptada());
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const d = within(await abrirDialogo(usuario));

    expect(d.getByLabelText(/destino/i)).toHaveValue(idEuropa);
  });

  it("RF-032 el destino coincide sin distinguir mayúsculas ni acentos", async () => {
    servidor.use(
      conCotizacionAceptada(),
      oportunidadCon(CON_ACEPTADA, { destino_consultado: "CANCUN" }),
    );
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const d = within(await abrirDialogo(usuario));

    expect(d.getByLabelText(/destino/i)).toHaveValue(idCancun);
  });

  it("RF-032 con dos destinos del catálogo que coinciden, el destino queda para elegir", async () => {
    servidor.use(conCotizacionAceptada(), catalogoConEuropaRepetida());
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const d = within(await abrirDialogo(usuario));

    expect(d.getByLabelText(/destino/i)).toHaveValue("");
  });

  it("RF-032 si ningún destino del catálogo coincide, el destino queda para elegir", async () => {
    servidor.use(
      conCotizacionAceptada(),
      oportunidadCon(CON_ACEPTADA, { destino_consultado: "Atlántida" }),
    );
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const d = within(await abrirDialogo(usuario));

    expect(d.getByLabelText(/destino/i)).toHaveValue("");
  });

  it("RF-032 la venta directa también precarga el destino y las fechas de la oportunidad", async () => {
    servidor.use(sinCotizaciones(idOportunidadMock.ganada));
    const usuario = userEvent.setup();
    renderDetalle(idOportunidadMock.ganada);

    const d = within(await abrirDialogo(usuario));

    expect(d.getByLabelText(/destino/i)).toHaveValue(
      destinosMock.find((x) => x.nombre === "Brasil")?.id,
    );
    expect(d.getByLabelText(/salida/i)).toHaveValue("2026-11-01");
    expect(d.getByLabelText(/regreso/i)).toHaveValue("2026-11-15");
    expect(d.getByLabelText(/precio de venta/i)).toHaveValue("");
  });

  it("RF-032 sin tocar los datos precargados se manda lo precargado", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(conCotizacionAceptada(), registrarReserva(cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const dialogo = await abrirDialogo(usuario);
    const d = within(dialogo);
    await usuario.selectOptions(d.getByLabelText(/categoría/i), "grupal");
    await usuario.type(d.getByLabelText(/costo/i), "1500000.00");
    await usuario.type(d.getByLabelText(/monto/i), MONTO_PRIMER_PAGO);
    await usuario.selectOptions(d.getByLabelText(/tipo de pago/i), "sena");
    fireEvent.change(d.getByLabelText(/vencimiento/i), { target: { value: VENCIMIENTO } });
    await usuario.click(confirmar(dialogo));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({
      destino_id: idEuropa,
      fecha_salida: "2027-05-10",
      fecha_regreso: "2027-05-30",
      economia: { precio_venta: total },
    });
  });

  it("RF-032 se puede cambiar el destino, las fechas y el precio de venta precargados", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(conCotizacionAceptada(), registrarReserva(cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);

    const dialogo = await abrirDialogo(usuario);
    await completarDatos(dialogo, usuario, { precio: "2800.00" });
    await usuario.click(confirmar(dialogo));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({
      destino_id: idCancun,
      fecha_salida: "2026-12-01",
      fecha_regreso: "2026-12-15",
      economia: { precio_venta: "2800.00" },
    });
  });
});

describe("RF-033 primer pago", () => {
  const abrirConAceptada = async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(conCotizacionAceptada(), registrarReserva(cuerpos));
    const usuario = userEvent.setup();
    renderDetalle(CON_ACEPTADA);
    const dialogo = await abrirDialogo(usuario);
    return { cuerpos, usuario, dialogo };
  };

  it("RF-033 «Economía» pide solo precio de venta y costo, sin tipo de pago", async () => {
    const { dialogo } = await abrirConAceptada();

    const economia = within(within(dialogo).getByRole("group", { name: /^economía$/i }));

    expect(economia.getByLabelText(/precio de venta/i)).toBeInTheDocument();
    expect(economia.getByLabelText(/costo/i)).toBeInTheDocument();
    expect(economia.queryByLabelText(/tipo de pago/i)).not.toBeInTheDocument();
    expect(economia.queryByLabelText(/monto|vencimiento/i)).not.toBeInTheDocument();
  });

  it("RF-033 «Primer pago» pide monto, tipo (seña, cuota o saldo) y vencimiento", async () => {
    const { dialogo } = await abrirConAceptada();

    const primerPago = within(within(dialogo).getByRole("group", { name: /^primer pago$/i }));

    expect(primerPago.getByLabelText(/monto/i)).toBeInTheDocument();
    expect(primerPago.getByLabelText(/vencimiento/i)).toBeInTheDocument();
    const tipos = within(primerPago.getByLabelText(/tipo de pago/i)).getAllByRole("option");
    expect(tipos.map((o) => o.textContent)).toEqual(
      expect.arrayContaining(["Seña", "Cuota", "Saldo"]),
    );
  });

  it("RF-033 aclara que el resto del plan de pagos se completa desde el viaje", async () => {
    const { dialogo } = await abrirConAceptada();

    expect(
      within(dialogo).getByText(/resto del plan de pagos.*(desde el viaje|ficha del viaje)/i),
    ).toBeInTheDocument();
  });

  it("RF-033 sin monto del primer pago no confirma", async () => {
    const { cuerpos, usuario, dialogo } = await abrirConAceptada();
    await completarDatos(dialogo, usuario, { monto: "" });
    await usuario.click(confirmar(dialogo));

    await waitFor(() => {
      expect(within(dialogo).getByLabelText(/monto/i)).toHaveAttribute("aria-invalid", "true");
    });
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-033 un monto de cero no se confirma", async () => {
    const { cuerpos, usuario, dialogo } = await abrirConAceptada();
    await completarDatos(dialogo, usuario, { monto: "0" });
    await usuario.click(confirmar(dialogo));

    await waitFor(() => {
      expect(within(dialogo).getByLabelText(/monto/i)).toHaveAttribute("aria-invalid", "true");
    });
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-033 un monto mayor que el precio de venta no se confirma y lo explica", async () => {
    const { cuerpos, usuario, dialogo } = await abrirConAceptada();
    await completarDatos(dialogo, usuario, { monto: "3200.01" });
    await usuario.click(confirmar(dialogo));

    expect(
      await within(dialogo).findByText(/monto.*(superar|supere).*precio de venta/i),
    ).toBeInTheDocument();
    expect(within(dialogo).getByLabelText(/monto/i)).toHaveAttribute("aria-invalid", "true");
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-033 el monto se compara con el precio de venta editado, no con el de la cotización", async () => {
    const { cuerpos, usuario, dialogo } = await abrirConAceptada();
    await completarDatos(dialogo, usuario, { precio: "2000.00", monto: "2500.00" });
    await usuario.click(confirmar(dialogo));

    expect(
      await within(dialogo).findByText(/monto.*(superar|supere).*precio de venta/i),
    ).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-033 un monto igual al precio de venta se confirma (el plan puede ser de un solo pago)", async () => {
    const { cuerpos, usuario, dialogo } = await abrirConAceptada();
    await completarDatos(dialogo, usuario, { monto: total, tipo: "saldo" });
    await usuario.click(confirmar(dialogo));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({
      plan_de_pagos: { pagos: [{ monto: total, tipo: "saldo", vencimiento: VENCIMIENTO }] },
    });
  });

  it("RF-033 manda el primer pago como único ítem del plan, con su tipo elegido, y la economía sin tipo", async () => {
    const { cuerpos, usuario, dialogo } = await abrirConAceptada();
    await completarDatos(dialogo, usuario, { monto: "1200.50", tipo: "cuota" });
    await usuario.click(confirmar(dialogo));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["plan_de_pagos"]).toEqual({
      pagos: [{ monto: "1200.50", tipo: "cuota", vencimiento: VENCIMIENTO }],
    });
    expect(cuerpos[0]?.["economia"]).toEqual({ precio_venta: total, costo: "1500000.00" });
  });
});
