import { crearCliente } from "@rumbo/shared";
import {
  alertasMock,
  crearServidor,
  manejadoresAlertas,
  usuariosPorRol,
  type RolMock,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { PaginaAgenda } from "./PaginaAgenda";

const servidor = crearServidor(...manejadoresAlertas);
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
// El «hoy» de los mocks, para que la agenda no dependa del día real.
const HOY = new Date("2026-10-25T12:00:00-03:00");
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: HOY });
});
afterEach(() => {
  servidor.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => {
  servidor.close();
});

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });

const MANUAL_PROPIA = "Llamar a Ana por la cotización."; // próxima, de la empleada
const RECONTACTO = "Hace un año que Joaquín Ramos no viaja: ofrecele una escapada."; // automática

function renderAgenda(rol: RolMock = "empleado") {
  if (rol === "admin" || rol === "dueno") {
    servidor.use(http.get("*/api/usuarios/asesores", () => HttpResponse.json([])));
  }
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/agenda"]}>
        <PaginaAgenda cliente={cliente} usuario={usuariosPorRol[rol]} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const usuarioConReloj = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const verProximas = async (usuario: ReturnType<typeof usuarioConReloj>) => {
  await usuario.click(await screen.findByRole("tab", { name: /próximas/i }));
};
const campoDescripcion = () => screen.findByRole("textbox", { name: /descripci[oó]n/i });

describe("RF-080 recordatorio", () => {
  it("RF-080 el encabezado ofrece «Nuevo recordatorio» y abre el formulario", async () => {
    const usuario = usuarioConReloj();
    renderAgenda();

    await usuario.click(await screen.findByRole("button", { name: /nuevo recordatorio/i }));

    expect(await campoDescripcion()).toBeInTheDocument();
    expect(screen.getByLabelText(/^fecha/i)).toBeInTheDocument();
  });

  it("RF-080 crea un recordatorio personal desde la agenda y cierra el formulario", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(
      http.post("*/api/alertas", async ({ request }) => {
        cuerpos.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    const usuario = usuarioConReloj();
    renderAgenda();
    await usuario.click(await screen.findByRole("button", { name: /nuevo recordatorio/i }));
    await usuario.type(await campoDescripcion(), "Renovar el seguro");
    fireEvent.change(screen.getByLabelText(/^fecha/i), { target: { value: "2026-11-02" } });

    await usuario.click(screen.getByRole("button", { name: /^guardar/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({ descripcion: "Renovar el seguro", fecha: "2026-11-02" });
    await waitFor(() => {
      expect(screen.queryByRole("textbox", { name: /descripci[oó]n/i })).not.toBeInTheDocument();
    });
  });

  it("RF-080 el estado vacío ofrece «Crear recordatorio» habilitado", async () => {
    servidor.use(
      http.get("*/api/alertas", () =>
        HttpResponse.json({ items: [], total: 0, pagina: 1, por_pagina: 100 }),
      ),
    );
    const usuario = usuarioConReloj();
    renderAgenda();

    const boton = await screen.findByRole("button", { name: /^crear recordatorio$/i });
    expect(boton).toBeEnabled();
    await usuario.click(boton);

    expect(await campoDescripcion()).toBeInTheDocument();
  });
});

describe("RF-082 edición", () => {
  it("RF-082 un recordatorio manual pendiente propio se edita desde la agenda", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(
      http.patch("*/api/alertas/:id", async ({ request }) => {
        cuerpos.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({});
      }),
    );
    const usuario = usuarioConReloj();
    renderAgenda();
    await verProximas(usuario);

    await usuario.click(await screen.findByRole("button", { name: `Editar: ${MANUAL_PROPIA}` }));

    const campo = await campoDescripcion();
    expect(campo).toHaveValue(MANUAL_PROPIA);
    await usuario.clear(campo);
    await usuario.type(campo, "Llamar a Ana el viernes");
    await usuario.click(screen.getByRole("button", { name: /^guardar/i }));

    await waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({ descripcion: "Llamar a Ana el viernes" });
  });

  it("RF-082 no se ofrece editar una alerta automática", async () => {
    const usuario = usuarioConReloj();
    renderAgenda();
    await verProximas(usuario);
    await screen.findByText(MANUAL_PROPIA);
    await screen.findByText(RECONTACTO);

    expect(screen.queryByRole("button", { name: `Editar: ${RECONTACTO}` })).not.toBeInTheDocument();
  });

  it("RF-082 no se ofrece editar un recordatorio que ya no está pendiente", async () => {
    const manual = alertasMock.find((a) => a.tipo === "manual");
    if (!manual) throw new Error("falta un recordatorio manual en los mocks");
    const vista = { ...manual, estado: "vista" as const, fecha: "2026-10-25" };
    servidor.use(
      http.get("*/api/alertas", ({ request }) => {
        const esVistas = new URL(request.url).searchParams.get("estado") === "vista";
        const items = esVistas ? [vista] : [];
        return HttpResponse.json({ items, total: items.length, pagina: 1, por_pagina: 100 });
      }),
    );
    const usuario = usuarioConReloj();
    renderAgenda();
    await usuario.click(await screen.findByRole("switch", { name: /mostrar vistas/i }));
    await screen.findByText(vista.descripcion);

    expect(
      screen.queryByRole("button", { name: `Editar: ${vista.descripcion}` }),
    ).not.toBeInTheDocument();
  });

  it("RF-082 admin no ve «Editar» en el recordatorio de otra persona", async () => {
    const usuario = usuarioConReloj();
    renderAgenda("admin");
    await verProximas(usuario);
    await screen.findByText(MANUAL_PROPIA);

    expect(
      screen.queryByRole("button", { name: `Editar: ${MANUAL_PROPIA}` }),
    ).not.toBeInTheDocument();
  });
});
