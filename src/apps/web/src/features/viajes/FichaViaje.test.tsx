import { crearCliente, formatearFecha, formatearImporte } from "@rumbo/shared";
import {
  crearServidor,
  idViajeMock,
  manejadoresAlertas,
  manejadoresClientes,
  manejadoresEconomia,
  manejadoresM1,
  manejadoresViajes,
  usuariosPorRol,
  viajesMock,
  type RolMock,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { FichaViaje } from "./FichaViaje";

const servidor = crearServidor(
  ...manejadoresViajes,
  ...manejadoresEconomia,
  ...manejadoresClientes,
  ...manejadoresAlertas,
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

function renderFicha(estado: keyof typeof idViajeMock, rol: RolMock = "empleado") {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/viajes/${idViajeMock[estado]}`]}>
        <FichaViaje cliente={cliente} usuario={usuariosPorRol[rol]} viajeId={idViajeMock[estado]} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const viaje = (estado: keyof typeof idViajeMock) => {
  const v = viajesMock.find((x) => x.id === idViajeMock[estado]);
  if (!v) throw new Error(`Falta el viaje ${estado} en el mock`);
  return v;
};

/** La sección «Economía» de la ficha, una vez cargado el viaje. */
async function seccionEconomia() {
  return screen.findByRole("region", { name: /economía/i });
}

/** El número que tiene un campo, sin depender de cómo lo formatee el input. */
function numero(campo: HTMLElement) {
  return Number((campo as HTMLInputElement).value);
}

/** Registra el cuerpo de cada `PUT /api/viajes/:id/economia` y sigue con el handler del mock. */
function registrarEconomia(cuerpos: Record<string, unknown>[]) {
  return http.put("*/api/viajes/:id/economia", async ({ request }) => {
    cuerpos.push((await request.clone().json()) as Record<string, unknown>);
    return undefined;
  });
}

describe("RF-037 encabezado de la ficha", () => {
  it("RF-037 muestra destino, estado, cliente, fechas y saldo del viaje", async () => {
    renderFicha("vendido");
    const v = viaje("vendido");

    expect(await screen.findByRole("heading", { level: 1, name: "Cusco" })).toBeInTheDocument();
    expect(screen.getByText("Vendido")).toBeInTheDocument();
    expect(await screen.findByText("Camila Benítez")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(formatearFecha(v.fecha_salida)))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(formatearFecha(v.fecha_regreso)))).toBeInTheDocument();
    expect(screen.getAllByText(formatearImporte(v.saldo_pendiente, "ARS")).length).toBeGreaterThan(
      0,
    );
  });

  it("RF-037 tiene secciones para economía, plan, itinerario y acciones", async () => {
    renderFicha("vendido");
    await screen.findByRole("heading", { level: 1, name: "Cusco" });

    expect(screen.getByRole("region", { name: /economía/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /plan de pagos/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /itinerario/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /acciones/i })).toBeInTheDocument();
  });

  it("RF-037 si el viaje no existe muestra un aviso en vez de la ficha", async () => {
    servidor.use(
      http.get("*/api/viajes/:id", () =>
        HttpResponse.json({ title: "No encontrado" }, { status: 404 }),
      ),
    );
    renderFicha("vendido");

    expect(await screen.findByRole("alert")).toHaveTextContent(/no encontramos el viaje/i);
    expect(screen.queryByRole("region", { name: /economía/i })).not.toBeInTheDocument();
  });

  it("RF-037 si falla la carga por otro motivo pide probar de nuevo", async () => {
    servidor.use(http.get("*/api/viajes/:id", () => HttpResponse.json({}, { status: 500 })));
    renderFicha("vendido");

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos cargar el viaje/i);
  });

  it("RF-037 muestra el porcentaje pagado sin perder un punto por el float (0.2900 es 29 %)", async () => {
    servidor.use(
      http.get("*/api/viajes/:id", () =>
        HttpResponse.json({ ...viaje("vendido"), porcentaje_pagado: "0.2900" }),
      ),
    );
    renderFicha("vendido");

    expect(await screen.findByText("29 %")).toBeInTheDocument();
  });
});

describe("RF-054 economía", () => {
  it("RF-054 precarga el formulario con el precio de venta y el costo del viaje", async () => {
    renderFicha("vendido");
    const economia = await seccionEconomia();

    expect(numero(await within(economia).findByLabelText(/precio de venta/i))).toBe(1800000);
    expect(numero(within(economia).getByLabelText(/costo/i))).toBe(1500000);
  });

  it("RF-054 muestra la moneda del viaje", async () => {
    renderFicha("confirmado");
    const economia = await seccionEconomia();

    expect(await within(economia).findByText("USD")).toBeInTheDocument();
  });

  it("RF-054 muestra la ganancia y el margen calculados a partir del precio y el costo", async () => {
    renderFicha("vendido");
    const economia = await seccionEconomia();

    expect(
      await within(economia).findByText(formatearImporte("300000.00", "ARS")),
    ).toBeInTheDocument();
    expect(within(economia).getByText(/16[.,]\d+\s?%|17\s?%/)).toBeInTheDocument();
  });

  it("RF-054 recalcula ganancia y margen al cambiar el precio de venta", async () => {
    renderFicha("vendido");
    const economia = await seccionEconomia();
    const precio = await within(economia).findByLabelText(/precio de venta/i);

    await userEvent.clear(precio);
    await userEvent.type(precio, "2000000");

    expect(
      await within(economia).findByText(formatearImporte("500000.00", "ARS")),
    ).toBeInTheDocument();
    expect(within(economia).getByText(/25\s?%/)).toBeInTheDocument();
  });

  it("RF-054 precarga la comisión del vendedor con el tipo y el valor que tiene el viaje", async () => {
    renderFicha("vendido");
    const economia = await seccionEconomia();

    expect(await within(economia).findByLabelText(/tipo de comisión/i)).toHaveValue("importe");
    expect(numero(within(economia).getByLabelText(/comisión del vendedor/i))).toBe(25000);
  });

  it("RF-054 permite pisar la comisión de este viaje y la manda al guardar (override)", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrarEconomia(cuerpos));
    renderFicha("vendido");
    const economia = await seccionEconomia();

    await userEvent.selectOptions(
      await within(economia).findByLabelText(/tipo de comisión/i),
      "porcentaje",
    );
    const comision = within(economia).getByLabelText(/comisión del vendedor/i);
    await userEvent.clear(comision);
    await userEvent.type(comision, "12");
    await userEvent.click(within(economia).getByRole("button", { name: /guardar economía/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["comision_tipo"]).toBe("porcentaje");
    expect(Number(cuerpos[0]?.["comision_vendedor"])).toBe(12);
  });

  it("RF-054 manda el operador y el vendedor del viaje en cada guardado", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrarEconomia(cuerpos));
    renderFicha("vendido");
    const economia = await seccionEconomia();

    await userEvent.click(
      await within(economia).findByRole("button", { name: /guardar economía/i }),
    );

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["operador_id"]).toBe(viaje("vendido").operador_id);
    expect(cuerpos[0]?.["vendedor_id"]).toBe(viaje("vendido").vendedor_id);
  });

  it("RF-056 al cambiar de vendedor precarga su comisión y, si no se toca, no la manda (RN-01)", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrarEconomia(cuerpos));
    renderFicha("vendido");
    const economia = await seccionEconomia();

    const vendedor = await within(economia).findByLabelText(/vendedor/i, { selector: "select" });
    await within(economia).findByRole("option", { name: /tomás roldán/i });
    await userEvent.selectOptions(vendedor, usuariosPorRol.freelance.id);

    expect(within(economia).getByLabelText(/tipo de comisión/i)).toHaveValue("importe");
    expect(numero(within(economia).getByLabelText(/comisión del vendedor/i))).toBe(15000);
    await userEvent.click(within(economia).getByRole("button", { name: /guardar economía/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["vendedor_id"]).toBe(usuariosPorRol.freelance.id);
    expect(cuerpos[0]).not.toHaveProperty("comision_tipo");
    expect(cuerpos[0]).not.toHaveProperty("comision_vendedor");
  });

  it("RF-056 sin vendedor la comisión queda deshabilitada (A2)", async () => {
    renderFicha("vendido");
    const economia = await seccionEconomia();

    const vendedor = await within(economia).findByLabelText(/vendedor/i, { selector: "select" });
    await userEvent.selectOptions(vendedor, "");

    expect(within(economia).getByLabelText(/tipo de comisión/i)).toBeDisabled();
    expect(within(economia).getByLabelText(/comisión del vendedor/i)).toBeDisabled();
  });

  it("RF-054 guarda el precio y el costo editados con PUT y confirma que se guardó", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrarEconomia(cuerpos));
    renderFicha("vendido");
    const economia = await seccionEconomia();

    const costo = await within(economia).findByLabelText(/costo/i);
    await userEvent.clear(costo);
    await userEvent.type(costo, "1400000");
    await userEvent.click(within(economia).getByRole("button", { name: /guardar economía/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(Number(cuerpos[0]?.["precio_venta"])).toBe(1800000);
    expect(Number(cuerpos[0]?.["costo"])).toBe(1400000);
    expect(await screen.findByRole("status")).toHaveTextContent(/economía guardada/i);
  });

  it("RF-054 si el servidor rechaza el guardado muestra el motivo y no confirma", async () => {
    servidor.use(
      http.put("*/api/viajes/:id/economia", () =>
        HttpResponse.json(
          { title: "Datos inválidos", status: 422, detail: "El costo no puede ser negativo." },
          { status: 422, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );
    renderFicha("vendido");
    const economia = await seccionEconomia();

    await userEvent.click(
      await within(economia).findByRole("button", { name: /guardar economía/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/el costo no puede ser negativo/i);
    expect(screen.queryByText(/economía guardada/i)).not.toBeInTheDocument();
  });

  it("RF-054 en un viaje finalizado la economía no se edita", async () => {
    renderFicha("finalizado");
    const economia = await seccionEconomia();

    expect(await within(economia).findByText(formatearImporte("400000.00", "ARS"))).toBeVisible();
    expect(within(economia).queryByRole("button", { name: /guardar economía/i })).toBeNull();
  });

  it("RF-054 avisa que hay que rebalancear el plan cuando el servidor lo advierte (A4)", async () => {
    servidor.use(
      http.put("*/api/viajes/:id/economia", () =>
        HttpResponse.json({
          ...viaje("vendido"),
          precio_venta: "2000000.00",
          ganancia: "500000.00",
          margen: "0.2500",
          advertencias: ["plan_desbalanceado"],
        }),
      ),
    );
    renderFicha("vendido");
    const economia = await seccionEconomia();

    const precio = await within(economia).findByLabelText(/precio de venta/i);
    await userEvent.clear(precio);
    await userEvent.type(precio, "2000000");
    await userEvent.click(within(economia).getByRole("button", { name: /guardar economía/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/rebalance/i);
  });
});

describe("RF-058 advertencia", () => {
  it("RF-058 no advierte nada cuando la ganancia es positiva", async () => {
    renderFicha("vendido");
    const economia = await seccionEconomia();
    await within(economia).findByLabelText(/precio de venta/i);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("RF-058 advierte ganancia y margen negativos cuando el costo supera al precio de venta", async () => {
    renderFicha("vendido");
    const economia = await seccionEconomia();

    const costo = await within(economia).findByLabelText(/costo/i);
    await userEvent.clear(costo);
    await userEvent.type(costo, "2000000");

    expect(await screen.findByRole("alert")).toHaveTextContent(/negativ/i);
    expect(within(economia).getByText(formatearImporte("-200000.00", "ARS"))).toBeInTheDocument();
    expect(within(economia).getByText(/[-−]11[.,]\d+\s?%|[-−]11\s?%/)).toBeInTheDocument();
  });

  it("RF-058 la advertencia no impide guardar (A3)", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrarEconomia(cuerpos));
    renderFicha("vendido");
    const economia = await seccionEconomia();

    const costo = await within(economia).findByLabelText(/costo/i);
    await userEvent.clear(costo);
    await userEvent.type(costo, "2000000");
    await screen.findByRole("alert");
    const guardar = within(economia).getByRole("button", { name: /guardar economía/i });
    expect(guardar).toBeEnabled();
    await userEvent.click(guardar);

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(Number(cuerpos[0]?.["costo"])).toBe(2000000);
  });

  it("RF-058 la advertencia desaparece al corregir el costo", async () => {
    renderFicha("vendido");
    const economia = await seccionEconomia();

    const costo = await within(economia).findByLabelText(/costo/i);
    await userEvent.clear(costo);
    await userEvent.type(costo, "2000000");
    await screen.findByRole("alert");
    await userEvent.clear(costo);
    await userEvent.type(costo, "1500000");

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("RF-058 muestra la advertencia de un viaje que ya tiene ganancia negativa al abrirlo", async () => {
    servidor.use(
      http.get("*/api/viajes/:id", () =>
        HttpResponse.json({
          ...viaje("vendido"),
          costo: "2000000.00",
          ganancia: "-200000.00",
          margen: "-0.1111",
        }),
      ),
    );
    renderFicha("vendido");

    expect(await screen.findByRole("alert")).toHaveTextContent(/negativ/i);
  });
});

describe("RF-037 vista del freelance (pantalla 43)", () => {
  it("RF-056 el freelance ve precio, costo y ganancia del viaje", async () => {
    renderFicha("vendido", "freelance");
    const economia = await seccionEconomia();

    expect(
      await within(economia).findByText(formatearImporte("1800000.00", "ARS")),
    ).toBeInTheDocument();
    expect(within(economia).getByText(formatearImporte("1500000.00", "ARS"))).toBeInTheDocument();
    expect(within(economia).getByText(formatearImporte("300000.00", "ARS"))).toBeInTheDocument();
  });

  it("RF-056 el freelance ve su comisión como porcentaje y como importe", async () => {
    renderFicha("reservado", "freelance");
    const economia = await seccionEconomia();

    const fila = (await within(economia).findByText(/comisión del vendedor/i)).parentElement;
    if (!fila) throw new Error("La comisión no está en una fila de la economía");
    expect(fila.textContent).toMatch(/10\s?%/);
    expect(fila.textContent).toContain(formatearImporte("20000.00", "ARS"));
  });

  it("RF-056 el freelance ve una comisión en importe tal cual está cargada", async () => {
    renderFicha("vendido", "freelance");
    const economia = await seccionEconomia();

    expect(
      await within(economia).findByText(formatearImporte("25000.00", "ARS")),
    ).toBeInTheDocument();
  });

  it("RF-056 el freelance no edita la economía: sin campos ni «Guardar economía»", async () => {
    renderFicha("vendido", "freelance");
    const economia = await seccionEconomia();
    await within(economia).findByText(formatearImporte("1800000.00", "ARS"));

    expect(within(economia).queryByRole("textbox")).toBeNull();
    expect(within(economia).queryByRole("spinbutton")).toBeNull();
    expect(within(economia).queryByRole("button", { name: /guardar economía/i })).toBeNull();
  });
});
