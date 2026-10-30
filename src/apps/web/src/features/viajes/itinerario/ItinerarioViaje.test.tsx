import { crearCliente, formatearFecha } from "@rumbo/shared";
import {
  crearServidor,
  idHotelMock,
  idViajeMock,
  manejadoresHotelesPara,
  manejadoresM1,
  manejadoresViajes,
  tramosMock,
  viajesMock,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { ItinerarioViaje } from "./ItinerarioViaje";

const servidor = crearServidor(
  ...manejadoresViajes,
  ...manejadoresHotelesPara("empleado"),
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

const viajeDe = (estado: keyof typeof idViajeMock) => {
  const v = viajesMock.find((x) => x.id === idViajeMock[estado]);
  if (!v) throw new Error(`Falta el viaje ${estado} en el mock`);
  return v;
};

// El viaje confirmado sale el 01/11/26 y vuelve el 15/11/26; su itinerario del mock tiene dos
// tramos: Copacabana Palace (01-08/11, pagado) y Pousada do Sol (08-15/11, sin pagar).
const [tramo1, tramo2] = tramosMock;
if (!tramo1 || !tramo2) throw new Error("Faltan tramos en el mock");

function renderItinerario(estado: keyof typeof idViajeMock = "confirmado", editable = true) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <ItinerarioViaje cliente={cliente} viaje={viajeDe(estado)} editable={editable} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const problema = (status: number, extra: object) =>
  HttpResponse.json(
    { title: "Error", status, ...extra },
    { status, headers: { "content-type": "application/problem+json" } },
  );

/** Cuerpos de cada POST/PATCH al itinerario; el handler del mock sigue respondiendo. */
function registrar(metodo: "post" | "patch", ruta: string, cuerpos: Record<string, unknown>[]) {
  return http[metodo](ruta, async ({ request }) => {
    cuerpos.push((await request.clone().json()) as Record<string, unknown>);
    return undefined;
  });
}

/** La fila del itinerario que contiene ese hotel. */
const fila = async (hotel: string) => {
  const nombre = await screen.findByText(hotel);
  const item = nombre.closest("li");
  if (!item) throw new Error(`${hotel} no está en una fila del itinerario`);
  return item;
};

const ponerFecha = (campo: HTMLElement, valor: string) => {
  fireEvent.change(campo, { target: { value: valor } });
};

/** Abre el buscador y elige un hotel del catálogo: queda listo el formulario del tramo. */
async function elegirHotel(nombre: string) {
  await userEvent.click(await screen.findByRole("button", { name: /agregar hotel/i }));
  await userEvent.click(await screen.findByRole("button", { name: `Elegir ${nombre}` }));
}

/** Completa las fechas del formulario del tramo y lo manda. */
async function agregarConFechas(checkIn: string, checkOut: string) {
  ponerFecha(await screen.findByLabelText(/check-in/i), checkIn);
  ponerFecha(screen.getByLabelText(/check-out/i), checkOut);
  await userEvent.click(screen.getByRole("button", { name: /agregar al itinerario/i }));
}

describe("RF-043 itinerario", () => {
  it("RF-043 lista los tramos del viaje en orden con hotel y fechas de check-in y check-out", async () => {
    renderItinerario();

    const lista = await screen.findByRole("list", { name: /tramos del itinerario/i });
    const [primera, segunda, ...resto] = await within(lista).findAllByRole("listitem");
    if (!primera || !segunda || resto.length > 0) throw new Error("Se esperaban dos tramos");
    expect(await within(primera).findByText("Copacabana Palace")).toBeInTheDocument();
    expect(primera.textContent).toContain(formatearFecha(tramo1.check_in));
    expect(primera.textContent).toContain(formatearFecha(tramo1.check_out));
    expect(await within(segunda).findByText("Pousada do Sol")).toBeInTheDocument();
    expect(segunda.textContent).toContain(formatearFecha(tramo2.check_in));
  });

  it("RF-043 un viaje sin tramos invita a agregar el primer hotel", async () => {
    servidor.use(http.get("*/api/viajes/:id/itinerario", () => HttpResponse.json([])));
    renderItinerario();

    expect(await screen.findByText(/todavía no hay hoteles en el itinerario/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /agregar hotel/i })).toBeInTheDocument();
  });

  it("RF-043 si falla la carga del itinerario avisa y pide probar de nuevo", async () => {
    servidor.use(
      http.get("*/api/viajes/:id/itinerario", () => HttpResponse.json({}, { status: 500 })),
    );
    renderItinerario();

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos cargar el itinerario/i);
  });

  it("RF-043 el buscador muestra los hoteles activos del catálogo para elegir", async () => {
    renderItinerario();
    await userEvent.click(await screen.findByRole("button", { name: /agregar hotel/i }));

    expect(
      await screen.findByRole("button", { name: "Elegir Copacabana Palace" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elegir Pousada do Sol" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Elegir Hotel Llao Llao" })).toBeNull();
  });

  it("RF-043 agrega un tramo con el hotel elegido, las fechas y el orden siguiente", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("post", "*/api/viajes/:id/itinerario", cuerpos));
    renderItinerario();
    await elegirHotel("Pousada do Sol");

    await agregarConFechas("2026-11-10", "2026-11-12");

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({
      hotel_id: idHotelMock.pousada,
      check_in: "2026-11-10",
      check_out: "2026-11-12",
      orden: 3,
    });
  });

  it("RF-043 manda el vencimiento del pago al proveedor cuando se carga", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("post", "*/api/viajes/:id/itinerario", cuerpos));
    renderItinerario();
    await elegirHotel("Pousada do Sol");

    ponerFecha(await screen.findByLabelText(/check-in/i), "2026-11-10");
    ponerFecha(screen.getByLabelText(/check-out/i), "2026-11-12");
    ponerFecha(screen.getByLabelText(/vencimiento del pago/i), "2026-10-30");
    await userEvent.click(screen.getByRole("button", { name: /agregar al itinerario/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["vencimiento_pago_proveedor"]).toBe("2026-10-30");
  });

  it("RF-043 el tramo agregado aparece en la lista al recargar el itinerario", async () => {
    const nuevo = {
      id: "b3c4d5e6-f7a8-4b9c-8d0e-1f2a3b4c5d09",
      viaje_id: idViajeMock.confirmado,
      hotel_id: idHotelMock.pousada,
      check_in: "2026-11-10",
      check_out: "2026-11-12",
      orden: 3,
      vencimiento_pago_proveedor: null,
      pago_proveedor_realizado: false,
    };
    let agregado = false;
    servidor.use(
      http.get("*/api/viajes/:id/itinerario", () =>
        HttpResponse.json(agregado ? [tramo1, tramo2, nuevo] : [tramo1, tramo2]),
      ),
      http.post("*/api/viajes/:id/itinerario", () => {
        agregado = true;
        return HttpResponse.json(nuevo, { status: 201 });
      }),
    );
    renderItinerario();
    await elegirHotel("Pousada do Sol");
    await agregarConFechas("2026-11-10", "2026-11-12");

    const lista = await screen.findByRole("list", { name: /tramos del itinerario/i });
    await waitFor(() => {
      expect(within(lista).getAllByRole("listitem")).toHaveLength(3);
    });
    expect(within(lista).getAllByText("Pousada do Sol")).toHaveLength(2);
  });

  it("RF-043 sin permiso de edición el itinerario es de solo lectura", async () => {
    renderItinerario("confirmado", false);

    await fila("Copacabana Palace");
    expect(screen.queryByRole("button", { name: /agregar hotel/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /editar/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /quitar/i })).toBeNull();
  });
});

describe("RF-044 repetir hotel", () => {
  it("RF-044 permite repetir un hotel que ya está en el itinerario (A5)", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("post", "*/api/viajes/:id/itinerario", cuerpos));
    renderItinerario();
    await userEvent.click(await screen.findByRole("button", { name: /agregar hotel/i }));
    const elegir = await screen.findByRole("button", { name: "Elegir Copacabana Palace" });
    expect(elegir).toBeEnabled();
    await userEvent.click(elegir);

    await agregarConFechas("2026-11-10", "2026-11-12");

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]?.["hotel_id"]).toBe(tramo1.hotel_id);
  });
});

describe("RF-043 validación de fechas del tramo", () => {
  it("RF-043 no deja guardar un check-out anterior al check-in y no llama al servidor", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("post", "*/api/viajes/:id/itinerario", cuerpos));
    renderItinerario();
    await elegirHotel("Pousada do Sol");

    await agregarConFechas("2026-11-12", "2026-11-10");

    expect(
      await screen.findByText(/el check-out no puede ser anterior al check-in/i),
    ).toBeVisible();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-043 no deja guardar fechas fuera de las del viaje y no llama al servidor", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("post", "*/api/viajes/:id/itinerario", cuerpos));
    renderItinerario();
    await elegirHotel("Pousada do Sol");

    await agregarConFechas("2026-10-28", "2026-11-20");

    expect(await screen.findByText(/dentro de las fechas del viaje/i)).toBeVisible();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-043 exige check-in y check-out antes de guardar", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("post", "*/api/viajes/:id/itinerario", cuerpos));
    renderItinerario();
    await elegirHotel("Pousada do Sol");

    await userEvent.click(await screen.findByRole("button", { name: /agregar al itinerario/i }));

    expect(await screen.findAllByText(/ingresá la fecha/i)).not.toHaveLength(0);
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-043 un 422 de solapamiento del servidor queda en el campo check-in", async () => {
    servidor.use(
      http.post("*/api/viajes/:id/itinerario", () =>
        problema(422, {
          errores: [{ campo: "check_in", mensaje: "Las fechas se solapan con otro tramo." }],
        }),
      ),
    );
    renderItinerario();
    await elegirHotel("Pousada do Sol");
    await agregarConFechas("2026-11-05", "2026-11-10");

    expect(await screen.findByText("Las fechas se solapan con otro tramo.")).toBeVisible();
    expect(screen.getByLabelText(/check-in/i)).toHaveAccessibleDescription(
      "Las fechas se solapan con otro tramo.",
    );
  });

  it("RF-043 un 422 sobre el hotel (inexistente o cerrado) se muestra en el formulario", async () => {
    servidor.use(
      http.post("*/api/viajes/:id/itinerario", () =>
        problema(422, {
          errores: [{ campo: "hotel_id", mensaje: "El hotel está cerrado." }],
        }),
      ),
    );
    renderItinerario();
    await elegirHotel("Pousada do Sol");
    await agregarConFechas("2026-11-10", "2026-11-12");

    expect(await screen.findByText("El hotel está cerrado.")).toBeVisible();
  });

  it("RF-043 un 409 por viaje cancelado se muestra como aviso", async () => {
    servidor.use(
      http.post("*/api/viajes/:id/itinerario", () =>
        problema(409, { detail: "No se cambia el itinerario de un viaje cancelado." }),
      ),
    );
    renderItinerario();
    await elegirHotel("Pousada do Sol");
    await agregarConFechas("2026-11-10", "2026-11-12");

    expect(await screen.findByRole("alert")).toHaveTextContent(/viaje cancelado/i);
  });
});

describe("RF-046 edición y baja de tramos", () => {
  it("RF-046 edita las fechas de un tramo con PATCH y manda solo lo cambiado", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("patch", "*/api/tramos/:id", cuerpos));
    renderItinerario();
    await fila("Pousada do Sol");

    await userEvent.click(screen.getByRole("button", { name: "Editar Pousada do Sol" }));
    ponerFecha(await screen.findByLabelText(/check-out/i), "2026-11-14");
    await userEvent.click(screen.getByRole("button", { name: /guardar tramo/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toEqual({ check_out: "2026-11-14" });
  });

  it("RF-046 el formulario de edición viene precargado con las fechas del tramo", async () => {
    renderItinerario();
    await fila("Pousada do Sol");

    await userEvent.click(screen.getByRole("button", { name: "Editar Pousada do Sol" }));

    expect(await screen.findByLabelText(/check-in/i)).toHaveValue(tramo2.check_in);
    expect(screen.getByLabelText(/check-out/i)).toHaveValue(tramo2.check_out);
  });

  it("RF-046 al editar valida que el check-out no sea anterior al check-in", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("patch", "*/api/tramos/:id", cuerpos));
    renderItinerario();
    await fila("Pousada do Sol");

    await userEvent.click(screen.getByRole("button", { name: "Editar Pousada do Sol" }));
    ponerFecha(await screen.findByLabelText(/check-out/i), "2026-11-05");
    await userEvent.click(screen.getByRole("button", { name: /guardar tramo/i }));

    expect(
      await screen.findByText(/el check-out no puede ser anterior al check-in/i),
    ).toBeVisible();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-046 un 422 del servidor al editar queda en el campo", async () => {
    servidor.use(
      http.patch("*/api/tramos/:id", () =>
        problema(422, {
          errores: [{ campo: "check_out", mensaje: "Fuera de las fechas del viaje." }],
        }),
      ),
    );
    renderItinerario();
    await fila("Pousada do Sol");

    await userEvent.click(screen.getByRole("button", { name: "Editar Pousada do Sol" }));
    ponerFecha(await screen.findByLabelText(/check-out/i), "2026-11-14");
    await userEvent.click(screen.getByRole("button", { name: /guardar tramo/i }));

    expect(await screen.findByText("Fuera de las fechas del viaje.")).toBeVisible();
  });

  it("RF-046 quita un tramo con DELETE", async () => {
    const borrados: string[] = [];
    servidor.use(
      http.delete("*/api/tramos/:id", ({ params }) => {
        borrados.push(String(params["id"]));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderItinerario();
    await fila("Pousada do Sol");

    await userEvent.click(screen.getByRole("button", { name: "Quitar Pousada do Sol" }));

    await waitFor(() => {
      expect(borrados).toEqual([tramo2.id]);
    });
  });

  it("RF-046 si falla la baja avisa y el tramo sigue en la lista", async () => {
    servidor.use(
      http.delete("*/api/tramos/:id", () =>
        problema(409, { detail: "No se cambia el itinerario de un viaje cancelado." }),
      ),
    );
    renderItinerario();
    await fila("Pousada do Sol");

    await userEvent.click(screen.getByRole("button", { name: "Quitar Pousada do Sol" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/viaje cancelado/i);
    expect(screen.getByText("Pousada do Sol")).toBeInTheDocument();
  });
});

describe("RF-047 pago a proveedor", () => {
  it("RF-047 muestra el vencimiento del pago al proveedor y cuál tramo ya está pagado", async () => {
    renderItinerario();

    const pagado = await fila("Copacabana Palace");
    const pendiente = await fila("Pousada do Sol");
    expect(pagado.textContent).toContain(formatearFecha(tramo1.vencimiento_pago_proveedor ?? ""));
    expect(within(pagado).getByRole("checkbox", { name: /pagado al proveedor/i })).toBeChecked();
    expect(pendiente.textContent).toContain(
      formatearFecha(tramo2.vencimiento_pago_proveedor ?? ""),
    );
    expect(
      within(pendiente).getByRole("checkbox", { name: /pagado al proveedor/i }),
    ).not.toBeChecked();
  });

  it("RF-047 marca el tramo como pagado con PATCH pago_proveedor_realizado", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("patch", "*/api/tramos/:id", cuerpos));
    renderItinerario();
    const pendiente = await fila("Pousada do Sol");

    await userEvent.click(
      within(pendiente).getByRole("checkbox", { name: /pagado al proveedor/i }),
    );

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toEqual({ pago_proveedor_realizado: true });
  });

  it("RF-047 si falla la marca de pago avisa y deja el tramo sin pagar", async () => {
    servidor.use(http.patch("*/api/tramos/:id", () => problema(500, { detail: "Error interno." })));
    renderItinerario();
    const pendiente = await fila("Pousada do Sol");

    await userEvent.click(
      within(pendiente).getByRole("checkbox", { name: /pagado al proveedor/i }),
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      within(await fila("Pousada do Sol")).getByRole("checkbox", { name: /pagado al proveedor/i }),
    ).not.toBeChecked();
  });

  it("RF-047 sin permiso de edición la marca de pago no se puede cambiar", async () => {
    renderItinerario("confirmado", false);
    const pendiente = await fila("Pousada do Sol");

    expect(
      within(pendiente).getByRole("checkbox", { name: /pagado al proveedor/i }),
    ).toBeDisabled();
  });
});

describe("RF-043 buscador y alta de hotel (CU-09 A2)", () => {
  it("RF-043 ofrece dar de alta un hotel que no está en el catálogo", async () => {
    renderItinerario();
    await userEvent.click(await screen.findByRole("button", { name: /agregar hotel/i }));

    expect(await screen.findByRole("link", { name: /no está\? darlo de alta/i })).toHaveAttribute(
      "href",
      "/hoteles/nuevo",
    );
  });

  it("RF-043 sin permiso de edición no hay enlace de alta", async () => {
    renderItinerario("confirmado", false);

    await fila("Copacabana Palace");
    expect(screen.queryByRole("link", { name: /darlo de alta/i })).toBeNull();
  });

  it("RF-043 el buscador pide los hoteles activos del destino del viaje", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.events.on("request:start", ({ request }) => {
      const url = new URL(request.url);
      if (url.pathname === "/api/hoteles") pedidos.push(url.searchParams);
    });
    renderItinerario();
    await userEvent.click(await screen.findByRole("button", { name: /agregar hotel/i }));
    await screen.findByRole("button", { name: "Elegir Pousada do Sol" });

    servidor.events.removeAllListeners();
    expect(pedidos[0]?.get("destino_id")).toBe(viajeDe("confirmado").destino_id);
    expect(pedidos[0]?.get("estado") ?? "activo").toBe("activo");
  });

  it("RF-043 avisa cuando hay más hoteles de los que se muestran", async () => {
    servidor.use(
      http.get("*/api/hoteles", () =>
        HttpResponse.json({
          items: [],
          total: 150,
          pagina: 1,
          por_pagina: 100,
          alternativas: null,
        }),
      ),
    );
    renderItinerario();
    await userEvent.click(await screen.findByRole("button", { name: /agregar hotel/i }));

    expect(await screen.findByText(/hay más hoteles de los que se muestran/i)).toBeVisible();
  });

  it("RF-044 explica que se puede repetir un hotel en tramos no consecutivos", async () => {
    renderItinerario();
    await userEvent.click(await screen.findByRole("button", { name: /agregar hotel/i }));

    expect(
      await screen.findByText(/podés repetir un hotel en tramos no consecutivos/i),
    ).toBeVisible();
  });

  it("RF-043 no ofrece agregar hotel si falló la carga del itinerario", async () => {
    servidor.use(
      http.get("*/api/viajes/:id/itinerario", () => HttpResponse.json({}, { status: 500 })),
    );
    renderItinerario();

    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: /agregar hotel/i })).toBeNull();
  });
});

describe("RF-046 orden del tramo", () => {
  it("RF-046 cambia el orden de un tramo con PATCH y manda solo el orden", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("patch", "*/api/tramos/:id", cuerpos));
    renderItinerario();
    await fila("Pousada do Sol");

    await userEvent.click(screen.getByRole("button", { name: "Editar Pousada do Sol" }));
    expect(await screen.findByLabelText("Orden")).toHaveValue(2);
    fireEvent.change(screen.getByLabelText("Orden"), { target: { value: "5" } });
    await userEvent.click(screen.getByRole("button", { name: /guardar tramo/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toEqual({ orden: 5 });
  });

  it("RF-046 un 422 por orden repetido queda en el campo Orden", async () => {
    servidor.use(
      http.patch("*/api/tramos/:id", () =>
        problema(422, {
          errores: [{ campo: "orden", mensaje: "Ya hay otro tramo con ese orden." }],
        }),
      ),
    );
    renderItinerario();
    await fila("Pousada do Sol");

    await userEvent.click(screen.getByRole("button", { name: "Editar Pousada do Sol" }));
    fireEvent.change(await screen.findByLabelText("Orden"), { target: { value: "1" } });
    await userEvent.click(screen.getByRole("button", { name: /guardar tramo/i }));

    expect(await screen.findByText("Ya hay otro tramo con ese orden.")).toBeVisible();
    expect(screen.getByLabelText("Orden")).toHaveAccessibleDescription(
      "Ya hay otro tramo con ese orden.",
    );
  });

  it("RF-046 vaciar el vencimiento del pago al editar manda null", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(registrar("patch", "*/api/tramos/:id", cuerpos));
    renderItinerario();
    await fila("Pousada do Sol");

    await userEvent.click(screen.getByRole("button", { name: "Editar Pousada do Sol" }));
    ponerFecha(await screen.findByLabelText(/vencimiento del pago/i), "");
    await userEvent.click(screen.getByRole("button", { name: /guardar tramo/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toEqual({ vencimiento_pago_proveedor: null });
  });
});

describe("RF-047 estado de la alerta de pago", () => {
  it("RF-047 el tramo pagado tiene la alerta resuelta y el pendiente avisa un mes antes", async () => {
    renderItinerario();

    const pagado = await fila("Copacabana Palace");
    const pendiente = await fila("Pousada do Sol");
    expect(pagado.textContent).toContain("Pagado al proveedor · alerta resuelta");
    expect(pendiente.textContent).toContain("Alerta de pago un mes antes del vencimiento");
  });
});
