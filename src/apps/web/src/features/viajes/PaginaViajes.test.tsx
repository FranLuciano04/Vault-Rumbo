import { crearCliente, formatearFecha, formatearImporte } from "@rumbo/shared";
import {
  crearServidor,
  idViajeMock,
  manejadoresClientes,
  manejadoresM1,
  manejadoresViajes,
  usuariosPorRol,
  viajesMock,
  type RolMock,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll } from "vitest";
import { PaginaViajes } from "./PaginaViajes";

const servidor = crearServidor(...manejadoresViajes, ...manejadoresClientes, ...manejadoresM1);
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

function renderListado(rol: RolMock = "empleado") {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/viajes"]}>
        <PaginaViajes cliente={cliente} usuario={usuariosPorRol[rol]} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Registra los parámetros de cada `GET /api/viajes` y sigue con el handler del mock. */
function registrarListados(pedidos: URLSearchParams[]) {
  return http.get("*/api/viajes", ({ request }) => {
    pedidos.push(new URL(request.url).searchParams);
    return undefined;
  });
}

const viaje = (estado: keyof typeof idViajeMock) => {
  const v = viajesMock.find((x) => x.id === idViajeMock[estado]);
  if (!v) throw new Error(`Falta el viaje ${estado} en el mock`);
  return v;
};

/** La fila de la tabla que menciona ese destino. */
async function fila(destino: string) {
  const celda = await screen.findByText(destino);
  const tr = celda.closest("tr");
  if (!tr) throw new Error(`«${destino}» no está en una fila de la tabla`);
  return tr;
}

describe("RF-037 listado de viajes", () => {
  it("RF-037 muestra una tabla con una fila por viaje, con destino, cliente y estado", async () => {
    renderListado("empleado");

    expect(await screen.findByRole("table")).toBeInTheDocument();
    const reservado = await fila("Europa");
    expect(within(reservado).getByText("Joaquín Ramos")).toBeInTheDocument();
    expect(within(reservado).getByText("Reservado")).toBeInTheDocument();
    const confirmado = await fila("Brasil");
    expect(within(confirmado).getByText("Familia Sosa")).toBeInTheDocument();
    expect(within(confirmado).getByText("Confirmado")).toBeInTheDocument();
    const finalizado = await fila("Punta Cana");
    expect(within(finalizado).getByText("Camila Benítez")).toBeInTheDocument();
    expect(within(finalizado).getByText("Finalizado")).toBeInTheDocument();
    // un encabezado de cabecera más una fila por cada viaje del mock
    expect(screen.getAllByRole("row")).toHaveLength(viajesMock.length + 1);
  });

  it("RF-037 muestra las fechas de salida y regreso como dd/mm/aa", async () => {
    renderListado("empleado");

    const v = viaje("confirmado");
    const texto = (await fila("Brasil")).textContent ?? "";
    expect(texto).toContain(formatearFecha(v.fecha_salida));
    expect(texto).toContain(formatearFecha(v.fecha_regreso));
  });

  it("RF-037 muestra el saldo pendiente en la moneda del viaje y el porcentaje pagado", async () => {
    renderListado("empleado");

    const vendido = await fila("Cusco");
    expect(
      within(vendido).getByText(formatearImporte(viaje("vendido").saldo_pendiente, "ARS")),
    ).toBeInTheDocument();
    expect(within(vendido).getByText(/33\s?%/)).toBeInTheDocument();

    const confirmado = await fila("Brasil");
    expect(
      within(confirmado).getByText(formatearImporte(viaje("confirmado").saldo_pendiente, "USD")),
    ).toBeInTheDocument();
    expect(within(confirmado).getByText(/100\s?%/)).toBeInTheDocument();

    const reservado = await fila("Europa");
    expect(within(reservado).getByText(/\b0\s?%/)).toBeInTheDocument();
  });

  it("RF-037 cada viaje enlaza a su ficha", async () => {
    renderListado("empleado");

    const enlace = within(await fila("Brasil")).getByRole("link");
    expect(enlace).toHaveAttribute("href", `/viajes/${idViajeMock.confirmado}`);
  });

  it("RF-037 filtra por estado y pide solo ese estado al servidor", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(registrarListados(pedidos));
    renderListado("empleado");
    await fila("Europa");

    await userEvent.click(screen.getByRole("button", { name: "Reservado" }));

    await waitFor(() => expect(pedidos.at(-1)?.get("estado")).toBe("reservado"));
    await waitFor(() => expect(screen.queryByText("Brasil")).not.toBeInTheDocument());
    expect(screen.getByText("Europa")).toBeInTheDocument();
  });

  it("RF-037 filtra por fechas de salida y manda desde y hasta al servidor", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(registrarListados(pedidos));
    renderListado("empleado");
    await fila("Europa");

    fireEvent.change(screen.getByLabelText(/salida desde/i), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText(/salida hasta/i), { target: { value: "2026-11-30" } });

    await waitFor(() => {
      const ultimo = pedidos.at(-1);
      expect(ultimo?.get("desde")).toBe("2026-10-01");
      expect(ultimo?.get("hasta")).toBe("2026-11-30");
    });
    // entre el 01/10/26 y el 30/11/26 salen el viaje en curso (Salta) y el confirmado (Brasil)
    await waitFor(() => expect(screen.queryByText("Europa")).not.toBeInTheDocument());
    expect(screen.getByText("Salta")).toBeInTheDocument();
    expect(screen.getByText("Brasil")).toBeInTheDocument();
  });

  it("RF-037 «Mis viajes» pide mios=true y «Toda la agencia» lo saca", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(registrarListados(pedidos));
    renderListado("empleado");
    await fila("Europa");

    expect(screen.getByRole("tab", { name: "Mis viajes" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(pedidos.at(-1)?.get("mios")).toBe("true");

    await userEvent.click(screen.getByRole("tab", { name: "Toda la agencia" }));

    await waitFor(() => expect(pedidos.at(-1)?.has("mios")).toBe(false));
    expect(screen.getByRole("tab", { name: "Toda la agencia" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("RF-037 el dueño puede ver toda la agencia y volver a «Mis viajes»", async () => {
    const pedidos: URLSearchParams[] = [];
    servidor.use(registrarListados(pedidos));
    renderListado("dueno");
    await fila("Europa");

    await userEvent.click(screen.getByRole("tab", { name: "Mis viajes" }));

    await waitFor(() => expect(pedidos.at(-1)?.get("mios")).toBe("true"));
  });

  it("RF-037 el freelance ve el aviso de que solo ve lo suyo y no tiene «Toda la agencia»", async () => {
    const pedidos: URLSearchParams[] = [];
    // El servidor le devuelve solo sus viajes (visibilidad del freelance).
    servidor.use(
      registrarListados(pedidos),
      http.get("*/api/viajes", () => {
        const items = viajesMock.filter((v) => v.estado === "vendido" || v.estado === "confirmado");
        return HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 20 });
      }),
    );
    renderListado("freelance");

    expect(await screen.findByText("Cusco")).toBeInTheDocument();
    expect(screen.getByText("Brasil")).toBeInTheDocument();
    expect(screen.queryByText("Europa")).not.toBeInTheDocument();
    expect(screen.getByText(/estás viendo solo tus viajes/i)).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Toda la agencia" })).not.toBeInTheDocument();
    expect(pedidos.every((p) => p.get("mios") === "true")).toBe(true);
    expect(pedidos.length).toBeGreaterThan(0);
  });

  it("RF-037 el empleado no ve el aviso del freelance", async () => {
    renderListado("empleado");
    await fila("Europa");

    expect(screen.queryByText(/estás viendo solo tus viajes/i)).not.toBeInTheDocument();
  });

  it("RF-037 si el listado falla muestra un aviso en vez de la tabla", async () => {
    servidor.use(
      http.get("*/api/viajes", () => HttpResponse.json({ title: "Error" }, { status: 500 })),
    );
    renderListado("empleado");

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos cargar los viajes/i);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
