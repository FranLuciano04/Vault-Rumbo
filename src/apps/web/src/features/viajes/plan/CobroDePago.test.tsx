import {
  crearCliente,
  formatearFecha,
  formatearImporte,
  type Pago,
  type Viaje,
} from "@rumbo/shared";
import {
  crearServidor,
  idViajeMock,
  manejadoresEconomia,
  manejadoresViajes,
  pagosPorViajeMock,
  viajesMock,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PlanDePagos } from "./PlanDePagos";

const servidor = crearServidor(...manejadoresViajes, ...manejadoresEconomia);
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

const viajeDe = (estado: keyof typeof idViajeMock): Viaje => {
  const v = viajesMock.find((x) => x.id === idViajeMock[estado]);
  if (!v) throw new Error(`Falta el viaje ${estado} en el mock`);
  return v;
};

function renderPlan(viaje: Viaje, editable = true) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PlanDePagos cliente={cliente} viaje={viaje} editable={editable} />
    </QueryClientProvider>,
  );
}

const problema = (status: number, detail: string) =>
  HttpResponse.json(
    { title: "Error", status, detail },
    { status, headers: { "content-type": "application/problem+json" } },
  );

/** La fila del plan (vista) con ese vencimiento `YYYY-MM-DD`. */
const filaDe = async (vencimiento: string) => {
  const fecha = await screen.findByText(formatearFecha(vencimiento));
  const item = fecha.closest("li");
  if (!item) throw new Error(`El vencimiento ${vencimiento} no está en una fila del plan`);
  return item;
};

/** Opción de un grupo de chips (forma de pago, moneda): radio o botón según el diseño. */
const opcion = (nombre: RegExp) =>
  screen.queryByRole("radio", { name: nombre }) ?? screen.getByRole("button", { name: nombre });

/** Abre el diálogo de cobro de la cuota del viaje reservado (300.000 ARS, vence 15/12/26). */
async function abrirCobroDeLaCuota() {
  const user = userEvent.setup();
  const cuota = await filaDe("2026-12-15");
  await user.click(within(cuota).getByRole("button", { name: /registrar cobro/i }));
  const dialogo = await screen.findByRole("dialog", { name: /registrar cobro/i });
  return { user, dialogo };
}

const cargarFecha = (dialogo: HTMLElement, fecha: string) => {
  fireEvent.change(within(dialogo).getByLabelText(/fecha efectiva/i), { target: { value: fecha } });
};

/** GET de pagos con estado propio: el cobro y la reversión del test lo modifican, como la API. */
function pagosConEstado(viaje: Viaje) {
  let pagos: Pago[] = [...(pagosPorViajeMock[viaje.id] ?? [])];
  return {
    manejador: http.get("*/api/viajes/:id/pagos", () => HttpResponse.json(pagos)),
    reemplazar(pago: Pago) {
      pagos = pagos.map((p) => (p.id === pago.id ? pago : p));
    },
  };
}

// El viaje "reservado" vende por $ 1.000.000,00 (ARS): seña 400.000 (01/11/26), cuota 300.000
// (15/12/26) y saldo 300.000 (15/01/27), todos sin cobrar. El "vendido" tiene la seña de 600.000
// cobrada (10/10/26, transferencia) y dos pagos de 600.000 pendientes. Hoy en los mocks: 25/10/26.

describe("RF-067 cobro", () => {
  it("ofrece «Registrar cobro» en los pagos sin cobrar y no en los cobrados", async () => {
    renderPlan(viajeDe("vendido"));

    const cobrada = await filaDe("2026-10-10");
    const pendiente = await filaDe("2026-12-10");
    expect(within(cobrada).queryByRole("button", { name: /registrar cobro/i })).toBeNull();
    expect(within(pendiente).getByRole("button", { name: /registrar cobro/i })).toBeInTheDocument();
  });

  it("no ofrece cobrar cuando el usuario no puede editar", async () => {
    renderPlan(viajeDe("reservado"), false);

    await filaDe("2026-12-15");
    expect(screen.queryByRole("button", { name: /registrar cobro/i })).not.toBeInTheDocument();
  });

  it("el diálogo muestra el pago a cobrar y las seis formas de pago", async () => {
    renderPlan(viajeDe("reservado"));
    const { dialogo } = await abrirCobroDeLaCuota();

    expect(within(dialogo).getByText(formatearImporte("300000.00", "ARS"))).toBeInTheDocument();
    expect(within(dialogo).getByText(formatearFecha("2026-12-15"))).toBeInTheDocument();
    for (const forma of [
      /efectivo/i,
      /transferencia/i,
      /tarjeta de crédito/i,
      /tarjeta de débito/i,
      /cheque/i,
      /depósito/i,
    ]) {
      expect(
        within(dialogo).queryByRole("radio", { name: forma }) ??
          within(dialogo).getByRole("button", { name: forma }),
      ).toBeInTheDocument();
    }
  });

  it("cobra en la moneda del viaje: POST con fecha, forma y moneda, sin tipo de cambio", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(
      http.post("*/api/pagos/:id/cobrar", async ({ request }) => {
        cuerpos.push((await request.clone().json()) as Record<string, unknown>);
        return undefined;
      }),
    );
    renderPlan(viajeDe("reservado"));
    const { user, dialogo } = await abrirCobroDeLaCuota();

    cargarFecha(dialogo, "2026-10-25");
    await user.click(opcion(/transferencia/i));
    await user.click(within(dialogo).getByRole("button", { name: /^registrar cobro$/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({
      fecha_cobro: "2026-10-25",
      forma_pago: "transferencia",
      moneda_pago: "ARS",
    });
    expect(cuerpos[0]?.["tipo_cambio"] ?? null).toBeNull();
  });

  it("tras cobrar cierra el diálogo y el pago figura como cobrado, sin acciones de cobro", async () => {
    const viaje = viajeDe("reservado");
    const estado = pagosConEstado(viaje);
    const cuotaDelMock = pagosPorViajeMock[viaje.id]?.find((p) => p.vencimiento === "2026-12-15");
    if (!cuotaDelMock) throw new Error("Falta la cuota del mock");
    servidor.use(
      estado.manejador,
      http.post("*/api/pagos/:id/cobrar", () => {
        estado.reemplazar({
          ...cuotaDelMock,
          estado: "pagado",
          forma_pago: "efectivo",
          moneda_pago: "ARS",
          monto_cobrado: cuotaDelMock.monto,
          fecha_cobro: "2026-10-25",
        });
        return HttpResponse.json({ ...cuotaDelMock, estado: "pagado" });
      }),
    );
    renderPlan(viaje);
    const { user, dialogo } = await abrirCobroDeLaCuota();

    cargarFecha(dialogo, "2026-10-25");
    await user.click(opcion(/efectivo/i));
    await user.click(within(dialogo).getByRole("button", { name: /^registrar cobro$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    const cuota = await filaDe("2026-12-15");
    await waitFor(() => {
      expect(within(cuota).getByText(/cobrado/i)).toBeInTheDocument();
    });
    expect(within(cuota).queryByRole("button", { name: /registrar cobro/i })).toBeNull();
    expect(within(cuota).getByRole("button", { name: /revertir cobro/i })).toBeInTheDocument();
  });

  it("no cobra sin elegir la fecha efectiva ni la forma de pago", async () => {
    const cuerpos: unknown[] = [];
    servidor.use(
      http.post("*/api/pagos/:id/cobrar", async ({ request }) => {
        cuerpos.push(await request.clone().json());
        return undefined;
      }),
    );
    renderPlan(viajeDe("reservado"));
    const { user, dialogo } = await abrirCobroDeLaCuota();

    await user.click(within(dialogo).getByRole("button", { name: /^registrar cobro$/i }));

    expect(await within(dialogo).findByRole("alert")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("muestra el error del servidor si el pago ya no se puede cobrar", async () => {
    servidor.use(
      http.post("*/api/pagos/:id/cobrar", () => problema(409, "No se cobra un pago pagado.")),
    );
    renderPlan(viajeDe("reservado"));
    const { user, dialogo } = await abrirCobroDeLaCuota();

    cargarFecha(dialogo, "2026-10-25");
    await user.click(opcion(/efectivo/i));
    await user.click(within(dialogo).getByRole("button", { name: /^registrar cobro$/i }));

    expect(await within(dialogo).findByRole("alert")).toHaveTextContent(/no se cobra/i);
  });

  it("Cancelar cierra el diálogo sin cobrar", async () => {
    const llamadas: string[] = [];
    servidor.use(
      http.post("*/api/pagos/:id/cobrar", ({ params }) => {
        llamadas.push(String(params["id"]));
        return undefined;
      }),
    );
    renderPlan(viajeDe("reservado"));
    const { user, dialogo } = await abrirCobroDeLaCuota();

    await user.click(within(dialogo).getByRole("button", { name: /cancelar/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(llamadas).toHaveLength(0);
  });
});

describe("RF-068 otra moneda", () => {
  it("con la moneda del viaje no pide tipo de cambio", async () => {
    renderPlan(viajeDe("reservado"));
    const { dialogo } = await abrirCobroDeLaCuota();

    expect(within(dialogo).queryByLabelText(/tipo de cambio/i)).not.toBeInTheDocument();
  });

  it("al elegir una moneda distinta a la del viaje pide el tipo de cambio", async () => {
    renderPlan(viajeDe("reservado"));
    const { user, dialogo } = await abrirCobroDeLaCuota();

    await user.click(opcion(/^usd$/i));

    expect(within(dialogo).getByLabelText(/tipo de cambio/i)).toBeInTheDocument();
  });

  it("muestra el monto cobrado calculado con el tipo de cambio", async () => {
    renderPlan(viajeDe("reservado"));
    const { user, dialogo } = await abrirCobroDeLaCuota();

    await user.click(opcion(/^usd$/i));
    await user.type(within(dialogo).getByLabelText(/tipo de cambio/i), "1250");

    // 300.000 ARS planificados a 1.250 ARS por USD son 240 USD.
    expect(within(dialogo).getByText(formatearImporte("240.00", "USD"))).toBeInTheDocument();
  });

  it("envía moneda_pago y tipo_cambio en el POST", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(
      http.post("*/api/pagos/:id/cobrar", async ({ request }) => {
        cuerpos.push((await request.clone().json()) as Record<string, unknown>);
        return undefined;
      }),
    );
    renderPlan(viajeDe("reservado"));
    const { user, dialogo } = await abrirCobroDeLaCuota();

    cargarFecha(dialogo, "2026-10-25");
    await user.click(opcion(/efectivo/i));
    await user.click(opcion(/^usd$/i));
    await user.type(within(dialogo).getByLabelText(/tipo de cambio/i), "1250");
    await user.click(within(dialogo).getByRole("button", { name: /^registrar cobro$/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({
      fecha_cobro: "2026-10-25",
      forma_pago: "efectivo",
      moneda_pago: "USD",
      tipo_cambio: expect.stringMatching(/^1250(\.0+)?$/) as string,
    });
  });

  it("interpreta 1.250,50 en es-AR como 1250.50: vista previa y POST", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(
      http.post("*/api/pagos/:id/cobrar", async ({ request }) => {
        cuerpos.push((await request.clone().json()) as Record<string, unknown>);
        return undefined;
      }),
    );
    renderPlan(viajeDe("reservado"));
    const { user, dialogo } = await abrirCobroDeLaCuota();

    cargarFecha(dialogo, "2026-10-25");
    await user.click(opcion(/efectivo/i));
    await user.click(opcion(/^usd$/i));
    const campo = within(dialogo).getByLabelText(/tipo de cambio/i);
    await user.type(campo, "1.250");
    // El punto agrupa miles: 300.000 ARS a 1.250 son 240 USD, no 240.000.
    expect(within(dialogo).getByText(formatearImporte("240.00", "USD"))).toBeInTheDocument();
    await user.clear(campo);
    await user.type(campo, "1.250,50");
    await user.click(within(dialogo).getByRole("button", { name: /^registrar cobro$/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({ tipo_cambio: "1250.50" });
  });

  it("no cobra en otra moneda sin tipo de cambio", async () => {
    const cuerpos: unknown[] = [];
    servidor.use(
      http.post("*/api/pagos/:id/cobrar", async ({ request }) => {
        cuerpos.push(await request.clone().json());
        return undefined;
      }),
    );
    renderPlan(viajeDe("reservado"));
    const { user, dialogo } = await abrirCobroDeLaCuota();

    cargarFecha(dialogo, "2026-10-25");
    await user.click(opcion(/efectivo/i));
    await user.click(opcion(/^usd$/i));
    await user.click(within(dialogo).getByRole("button", { name: /^registrar cobro$/i }));

    expect(await within(dialogo).findByRole("alert")).toHaveTextContent(/tipo de cambio/i);
    expect(cuerpos).toHaveLength(0);
  });

  it("no acepta un tipo de cambio en cero", async () => {
    const cuerpos: unknown[] = [];
    servidor.use(
      http.post("*/api/pagos/:id/cobrar", async ({ request }) => {
        cuerpos.push(await request.clone().json());
        return undefined;
      }),
    );
    renderPlan(viajeDe("reservado"));
    const { user, dialogo } = await abrirCobroDeLaCuota();

    cargarFecha(dialogo, "2026-10-25");
    await user.click(opcion(/efectivo/i));
    await user.click(opcion(/^usd$/i));
    await user.type(within(dialogo).getByLabelText(/tipo de cambio/i), "0");
    await user.click(within(dialogo).getByRole("button", { name: /^registrar cobro$/i }));

    expect(await within(dialogo).findByRole("alert")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });
});

describe("RF-070 revertir", () => {
  it("ofrece «Revertir cobro» solo en los pagos cobrados", async () => {
    renderPlan(viajeDe("vendido"));

    const cobrada = await filaDe("2026-10-10");
    const pendiente = await filaDe("2026-12-10");
    expect(within(cobrada).getByRole("button", { name: /revertir cobro/i })).toBeInTheDocument();
    expect(within(pendiente).queryByRole("button", { name: /revertir cobro/i })).toBeNull();
  });

  it("no ofrece revertir cuando el usuario no puede editar", async () => {
    renderPlan(viajeDe("vendido"), false);

    await filaDe("2026-10-10");
    expect(screen.queryByRole("button", { name: /revertir cobro/i })).not.toBeInTheDocument();
  });

  it("pide confirmación y no revierte hasta confirmar", async () => {
    const llamadas: string[] = [];
    servidor.use(
      http.post("*/api/pagos/:id/revertir-cobro", ({ params }) => {
        llamadas.push(String(params["id"]));
        return undefined;
      }),
    );
    renderPlan(viajeDe("vendido"));
    const user = userEvent.setup();
    const cobrada = await filaDe("2026-10-10");

    await user.click(within(cobrada).getByRole("button", { name: /revertir cobro/i }));

    expect(llamadas).toHaveLength(0);
    expect(screen.getByRole("button", { name: /confirmar/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /confirmar/i }));
    await waitFor(() => {
      expect(llamadas).toHaveLength(1);
    });
  });

  it("cancelar la confirmación no revierte", async () => {
    const llamadas: string[] = [];
    servidor.use(
      http.post("*/api/pagos/:id/revertir-cobro", ({ params }) => {
        llamadas.push(String(params["id"]));
        return undefined;
      }),
    );
    renderPlan(viajeDe("vendido"));
    const user = userEvent.setup();
    const cobrada = await filaDe("2026-10-10");

    await user.click(within(cobrada).getByRole("button", { name: /revertir cobro/i }));
    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(llamadas).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /confirmar/i })).not.toBeInTheDocument();
  });

  it("tras revertir el pago vuelve a estar sin cobrar y se puede cobrar de nuevo", async () => {
    const viaje = viajeDe("vendido");
    const estado = pagosConEstado(viaje);
    const sena = pagosPorViajeMock[viaje.id]?.find((p) => p.vencimiento === "2026-10-10");
    if (!sena) throw new Error("Falta la seña del mock");
    servidor.use(
      estado.manejador,
      http.post("*/api/pagos/:id/revertir-cobro", () => {
        const revertida: Pago = {
          ...sena,
          estado: "vencido",
          forma_pago: null,
          moneda_pago: null,
          tipo_cambio: null,
          monto_cobrado: null,
          fecha_cobro: null,
        };
        estado.reemplazar(revertida);
        return HttpResponse.json(revertida);
      }),
    );
    renderPlan(viaje);
    const user = userEvent.setup();
    const cobrada = await filaDe("2026-10-10");

    await user.click(within(cobrada).getByRole("button", { name: /revertir cobro/i }));
    await user.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(async () => {
      const fila = await filaDe("2026-10-10");
      expect(within(fila).getByText(/vencido/i)).toBeInTheDocument();
      expect(within(fila).getByRole("button", { name: /registrar cobro/i })).toBeInTheDocument();
    });
  });

  it("muestra el error si el pago ya no tiene un cobro que revertir", async () => {
    servidor.use(
      http.post("*/api/pagos/:id/revertir-cobro", () =>
        problema(409, "No hay un cobro que revertir en un pago pendiente."),
      ),
    );
    renderPlan(viajeDe("vendido"));
    const user = userEvent.setup();
    const cobrada = await filaDe("2026-10-10");

    await user.click(within(cobrada).getByRole("button", { name: /revertir cobro/i }));
    await user.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no hay un cobro que revertir/i);
  });
});

describe("RF-071 forma de pago", () => {
  it("el pago cobrado muestra con qué forma se cobró", async () => {
    renderPlan(viajeDe("vendido"));

    const cobrada = await filaDe("2026-10-10");
    expect(within(cobrada).getByText(/transferencia/i)).toBeInTheDocument();
  });

  it("las billeteras virtuales se registran como transferencia: el diálogo lo aclara", async () => {
    renderPlan(viajeDe("reservado"));
    const { dialogo } = await abrirCobroDeLaCuota();

    expect(within(dialogo).getByText(/billeteras virtuales.*transferencia/i)).toBeInTheDocument();
  });
});
