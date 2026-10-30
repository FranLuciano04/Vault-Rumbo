import { crearCliente, formatearFecha, formatearImporte, type Viaje } from "@rumbo/shared";
import {
  crearServidor,
  idViajeMock,
  manejadoresEconomia,
  manejadoresViajes,
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

const viajeDe = (estado: keyof typeof idViajeMock, cambios: Partial<Viaje> = {}): Viaje => {
  const v = viajesMock.find((x) => x.id === idViajeMock[estado]);
  if (!v) throw new Error(`Falta el viaje ${estado} en el mock`);
  return { ...v, ...cambios };
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

const importe = (entero: string): unknown =>
  expect.stringMatching(new RegExp(`^${entero}(\\.00)?$`));

const problema = (status: number, detail: string) =>
  HttpResponse.json(
    { title: "Error", status, detail },
    { status, headers: { "content-type": "application/problem+json" } },
  );

/** Cuerpos de cada request al método y ruta dados; el handler del mock sigue respondiendo. */
function registrar(
  metodo: "put" | "patch" | "post",
  ruta: string,
  cuerpos: Record<string, unknown>[],
) {
  return http[metodo](ruta, async ({ request }) => {
    cuerpos.push((await request.clone().json()) as Record<string, unknown>);
    return undefined;
  });
}

/** La fila del plan (vista, no editor) que tiene ese vencimiento `YYYY-MM-DD`. */
const filaDe = async (vencimiento: string) => {
  const fecha = await screen.findByText(formatearFecha(vencimiento));
  const item = fecha.closest("li");
  if (!item) throw new Error(`El vencimiento ${vencimiento} no está en una fila del plan`);
  return item;
};

async function abrirEditor() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /editar plan/i }));
  return user;
}

async function cambiarMonto(user: ReturnType<typeof userEvent.setup>, indice: number, v: string) {
  const campo = screen.getAllByLabelText(/^monto/i)[indice];
  if (!campo) throw new Error(`No hay campo de monto ${String(indice)}`);
  await user.clear(campo);
  await user.type(campo, v);
}

// El viaje "reservado" vende por $ 1.000.000,00 (ARS) con un plan sin cobros: seña 400.000
// (01/11/26), cuota 300.000 (15/12/26) y saldo 300.000 (15/01/27). El "vendido" vende por
// $ 1.800.000,00 con la seña de 600.000 ya cobrada (10/10/26) y dos pagos de 600.000 pendientes
// (10/12/26 y 05/01/27). La fecha de hoy de los mocks es 25/10/26.

describe("RF-060 mostrar el plan de pagos", () => {
  it("lista cada pago con su tipo, monto y vencimiento", async () => {
    renderPlan(viajeDe("reservado"));

    const sena = await filaDe("2026-11-01");
    expect(within(sena).getByText(/seña/i)).toBeInTheDocument();
    expect(within(sena).getByText(formatearImporte("400000.00", "ARS"))).toBeInTheDocument();
    const saldo = await filaDe("2027-01-15");
    expect(within(saldo).getByText(/saldo/i)).toBeInTheDocument();
  });

  it("no ofrece editar el plan cuando el usuario no puede editar", async () => {
    renderPlan(viajeDe("reservado"), false);

    await filaDe("2026-11-01");
    expect(screen.queryByRole("button", { name: /editar plan/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /reprogramar|anular|dividir/i }),
    ).not.toBeInTheDocument();
  });
});

describe("RF-061 suma del plan", () => {
  it("con la suma igual al precio de venta deja guardar", async () => {
    renderPlan(viajeDe("reservado"));
    await abrirEditor();

    expect(screen.getByRole("button", { name: /guardar plan/i })).toBeEnabled();
    expect(screen.queryByText(/diferencia/i)).not.toBeInTheDocument();
  });

  it("A1: si la suma no coincide muestra la diferencia en vivo y no deja guardar", async () => {
    renderPlan(viajeDe("reservado"));
    const user = await abrirEditor();

    await cambiarMonto(user, 0, "500000");

    expect(screen.getByRole("button", { name: /guardar plan/i })).toBeDisabled();
    expect(screen.getByText(/diferencia/i)).toHaveTextContent(formatearImporte("100000.00", "ARS"));

    // Al volver a cuadrar desaparece la diferencia y se habilita guardar.
    await cambiarMonto(user, 1, "200000");
    expect(screen.getByRole("button", { name: /guardar plan/i })).toBeEnabled();
    expect(screen.queryByText(/diferencia/i)).not.toBeInTheDocument();
  });

  it("guarda el plan editado con un PUT de los pagos nuevos", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("put", "*/api/viajes/:id/pagos", cuerpos));
    renderPlan(viajeDe("reservado"));
    const user = await abrirEditor();

    await cambiarMonto(user, 0, "500000");
    await cambiarMonto(user, 1, "200000");
    await user.click(screen.getByRole("button", { name: /guardar plan/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toEqual({
      pagos: [
        {
          tipo: "sena",
          monto: importe("500000"),
          vencimiento: "2026-11-01",
        },
        {
          tipo: "cuota",
          monto: importe("200000"),
          vencimiento: "2026-12-15",
        },
        {
          tipo: "saldo",
          monto: importe("300000"),
          vencimiento: "2027-01-15",
        },
      ],
    });
  });

  it("cuenta los pagos ya cobrados en la suma y no los deja editar", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("put", "*/api/viajes/:id/pagos", cuerpos));
    renderPlan(viajeDe("vendido"));
    const user = await abrirEditor();

    // Solo los dos pagos sin cobrar tienen campos de monto.
    expect(screen.getAllByLabelText(/^monto/i)).toHaveLength(2);
    await cambiarMonto(user, 0, "700000");
    expect(screen.getByRole("button", { name: /guardar plan/i })).toBeDisabled();
    await cambiarMonto(user, 1, "500000");
    expect(screen.getByRole("button", { name: /guardar plan/i })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /guardar plan/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect((cuerpos[0] as { pagos: unknown[] }).pagos).toHaveLength(2);
  });

  it("muestra el error del servidor si rechaza el plan", async () => {
    servidor.use(
      http.put("*/api/viajes/:id/pagos", () =>
        problema(422, "La suma de los pagos tiene que ser igual al precio de venta."),
      ),
    );
    renderPlan(viajeDe("reservado"));
    const user = await abrirEditor();

    await user.click(screen.getByRole("button", { name: /guardar plan/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/suma de los pagos/i);
  });
});

describe("RF-064 pago único", () => {
  it("A2: «pago único» deja un solo saldo por el total y se guarda", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("put", "*/api/viajes/:id/pagos", cuerpos));
    renderPlan(viajeDe("reservado"));
    const user = await abrirEditor();

    await user.click(screen.getByRole("button", { name: /pago único/i }));

    expect(screen.getAllByLabelText(/^monto/i)).toHaveLength(1);
    expect(screen.getByRole("button", { name: /guardar plan/i })).toBeEnabled();
    const [vencimiento] = screen.getAllByLabelText(/^vencimiento/i);
    if (!vencimiento) throw new Error("Falta el vencimiento del pago único");
    fireEvent.change(vencimiento, { target: { value: "2026-12-30" } });
    await user.click(screen.getByRole("button", { name: /guardar plan/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toEqual({
      pagos: [
        {
          tipo: "saldo",
          monto: importe("1000000"),
          vencimiento: "2026-12-30",
        },
      ],
    });
  });
});

describe("RF-059 plan desbalanceado tras cambiar el precio (A5)", () => {
  it("avisa que hay que rebalancear cuando los pagos ya no suman el precio de venta", async () => {
    renderPlan(viajeDe("reservado", { precio_venta: "1200000.00" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/rebalance/i);
  });

  it("no avisa cuando el plan suma el precio de venta", async () => {
    renderPlan(viajeDe("reservado"));

    await filaDe("2026-11-01");
    expect(screen.queryByText(/rebalance/i)).not.toBeInTheDocument();
  });

  it("el editor controla la suma contra el precio de venta nuevo", async () => {
    renderPlan(viajeDe("reservado", { precio_venta: "1200000.00" }));
    await abrirEditor();

    expect(screen.getByRole("button", { name: /guardar plan/i })).toBeDisabled();
    expect(screen.getByText(/diferencia/i)).toHaveTextContent(formatearImporte("200000.00", "ARS"));
  });
});

describe("RF-065 reprogramar", () => {
  it("cambia el vencimiento de un pago sin cobrar con un PATCH", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("patch", "*/api/pagos/:id", cuerpos));
    renderPlan(viajeDe("reservado"));
    const user = userEvent.setup();
    const cuota = await filaDe("2026-12-15");

    await user.click(within(cuota).getByRole("button", { name: /reprogramar/i }));
    fireEvent.change(screen.getByLabelText(/nuevo vencimiento/i), {
      target: { value: "2026-12-30" },
    });
    await user.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => {
      expect(cuerpos).toEqual([{ vencimiento: "2026-12-30" }]);
    });
  });

  it("muestra el error si el servidor rechaza la fecha", async () => {
    renderPlan(viajeDe("reservado"));
    const user = userEvent.setup();
    const cuota = await filaDe("2026-12-15");

    await user.click(within(cuota).getByRole("button", { name: /reprogramar/i }));
    // El mock rechaza vencimientos que no son posteriores a hoy (25/10/26).
    fireEvent.change(screen.getByLabelText(/nuevo vencimiento/i), {
      target: { value: "2026-10-20" },
    });
    await user.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/posterior a hoy/i);
  });

  it("no ofrece reprogramar un pago ya cobrado", async () => {
    renderPlan(viajeDe("vendido"));
    const sena = await filaDe("2026-10-10");

    expect(within(sena).queryByRole("button", { name: /reprogramar/i })).not.toBeInTheDocument();
  });
});

describe("RF-066 anular", () => {
  it("anula un pago sin cobrar tras confirmar", async () => {
    const llamadas: string[] = [];
    servidor.use(
      http.post("*/api/pagos/:id/anular", ({ params }) => {
        llamadas.push(String(params["id"]));
        return undefined;
      }),
    );
    renderPlan(viajeDe("reservado"));
    const user = userEvent.setup();
    const cuota = await filaDe("2026-12-15");

    await user.click(within(cuota).getByRole("button", { name: /anular/i }));
    expect(llamadas).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => {
      expect(llamadas).toHaveLength(1);
    });
  });

  it("muestra el error si el pago ya no se puede anular", async () => {
    servidor.use(
      http.post("*/api/pagos/:id/anular", () => problema(409, "No se anula un pago pagado.")),
    );
    renderPlan(viajeDe("reservado"));
    const user = userEvent.setup();
    const cuota = await filaDe("2026-12-15");

    await user.click(within(cuota).getByRole("button", { name: /anular/i }));
    await user.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se anula/i);
  });

  it("no ofrece anular un pago ya cobrado", async () => {
    renderPlan(viajeDe("vendido"));
    const sena = await filaDe("2026-10-10");

    expect(within(sena).queryByRole("button", { name: /anular/i })).not.toBeInTheDocument();
  });
});

describe("CU-11 A6 dividir un pago", () => {
  it("divide un pago en el importe de ahora y el resto con su vencimiento", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("post", "*/api/pagos/:id/dividir", cuerpos));
    renderPlan(viajeDe("reservado"));
    const user = userEvent.setup();
    const cuota = await filaDe("2026-12-15");

    await user.click(within(cuota).getByRole("button", { name: /dividir/i }));
    await user.type(screen.getByLabelText(/monto (de )?ahora/i), "100000");
    fireEvent.change(screen.getByLabelText(/vencimiento del resto/i), {
      target: { value: "2027-01-10" },
    });
    await user.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => {
      expect(cuerpos).toEqual([
        {
          monto_ahora: importe("100000"),
          vencimiento_resto: "2027-01-10",
        },
      ]);
    });
  });

  it("no deja dividir con un importe igual o mayor al del pago", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("post", "*/api/pagos/:id/dividir", cuerpos));
    renderPlan(viajeDe("reservado"));
    const user = userEvent.setup();
    const cuota = await filaDe("2026-12-15");

    await user.click(within(cuota).getByRole("button", { name: /dividir/i }));
    await user.type(screen.getByLabelText(/monto (de )?ahora/i), "300000");
    fireEvent.change(screen.getByLabelText(/vencimiento del resto/i), {
      target: { value: "2027-01-10" },
    });
    await user.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/menor que el del pago/i);
    expect(cuerpos).toHaveLength(0);
  });
});

describe("T-103 fix de la review", () => {
  it("sin pagos vigentes no avisa que hay que rebalancear y ofrece definir el plan", async () => {
    servidor.use(http.get("*/api/viajes/:id/pagos", () => HttpResponse.json([])));
    renderPlan(viajeDe("reservado"));

    expect(await screen.findByText(/todavía no hay un plan/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("un plan vacío se arma con seña, cuota y saldo y se guarda con los tres tipos", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(
      http.get("*/api/viajes/:id/pagos", () => HttpResponse.json([])),
      registrar("put", "*/api/viajes/:id/pagos", cuerpos),
    );
    renderPlan(viajeDe("reservado"));
    const user = await abrirEditor();

    await user.click(screen.getByRole("button", { name: /agregar saldo/i }));
    await user.click(screen.getByRole("button", { name: /agregar cuota/i }));
    await user.click(screen.getByRole("button", { name: /agregar seña/i }));
    expect(screen.queryByRole("button", { name: /agregar seña/i })).not.toBeInTheDocument();
    await cambiarMonto(user, 0, "400000");
    await cambiarMonto(user, 1, "300000");
    await cambiarMonto(user, 2, "300000");
    for (const campo of screen.getAllByLabelText(/^vencimiento/i)) {
      fireEvent.change(campo, { target: { value: "2026-12-30" } });
    }
    await user.click(screen.getByRole("button", { name: /guardar plan/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect((cuerpos[0] as { pagos: { tipo: string }[] }).pagos.map((p) => p.tipo)).toEqual([
      "sena",
      "cuota",
      "saldo",
    ]);
  });

  it("no deja guardar con un monto en cero aunque la suma cuadre", async () => {
    renderPlan(viajeDe("reservado"));
    const user = await abrirEditor();

    await cambiarMonto(user, 0, "0");
    await cambiarMonto(user, 1, "700000");

    expect(screen.getByText(/cada pago tiene que ser mayor que cero/i)).toBeInTheDocument();
    expect(screen.queryByText(/coincide con el precio/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /guardar plan/i })).toBeDisabled();
  });

  it("sin saldo por planificar no ofrece el pago único", async () => {
    renderPlan(viajeDe("vendido", { precio_venta: "600000.00" }));
    await abrirEditor();

    expect(screen.queryByRole("button", { name: /pago único/i })).not.toBeInTheDocument();
    expect(screen.getByText(/no queda saldo por planificar/i)).toBeInTheDocument();
  });
});
