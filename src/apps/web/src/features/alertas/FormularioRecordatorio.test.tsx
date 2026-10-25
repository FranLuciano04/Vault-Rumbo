import { crearCliente, type Alerta } from "@rumbo/shared";
import { alertasMock, crearServidor, manejadoresAlertas } from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { FormularioRecordatorio, type AsociadoRecordatorio } from "./FormularioRecordatorio";

const servidor = crearServidor(...manejadoresAlertas);
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

const CLIENTE_ID = "3c1f6d2e-8a47-4b19-9e53-7d0a2b4c6e11";
const camila: AsociadoRecordatorio = {
  tipo: "cliente",
  id: CLIENTE_ID,
  etiqueta: "Camila Benítez",
};
const manual = alertasMock.find((a) => a.tipo === "manual" && a.estado === "pendiente");
if (!manual) throw new Error("falta un recordatorio manual pendiente en los mocks");

const problema = (status: number, extra: object) =>
  HttpResponse.json(
    { title: "Error", status, ...extra },
    { status, headers: { "content-type": "application/problem+json" } },
  );

function renderFormulario(propiedades: { asociado?: AsociadoRecordatorio; alerta?: Alerta } = {}) {
  const alCerrar = vi.fn();
  const alGuardar = vi.fn();
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <FormularioRecordatorio
        cliente={cliente}
        alCerrar={alCerrar}
        alGuardar={alGuardar}
        {...propiedades}
      />
    </QueryClientProvider>,
  );
  return { alCerrar, alGuardar };
}

const descripcion = () => screen.findByRole("textbox", { name: /descripci[oó]n/i });
const fecha = () => screen.getByLabelText(/^fecha/i);
const ponerFecha = (valor: string) => {
  fireEvent.change(fecha(), { target: { value: valor } });
};
const guardar = () => screen.getByRole("button", { name: /^guardar/i });

/** Captura el cuerpo del POST y responde 201. */
function altaCapturada(cuerpos: Record<string, unknown>[]) {
  return http.post("*/api/alertas", async ({ request }) => {
    const cuerpo = (await request.json()) as Record<string, unknown>;
    cuerpos.push(cuerpo);
    return HttpResponse.json({ ...manual, ...cuerpo, id: "n1" }, { status: 201 });
  });
}

describe("RF-080 recordatorio", () => {
  it("RF-080 pide descripción y fecha, sin asociación obligatoria", async () => {
    renderFormulario();

    expect(await descripcion()).toBeInTheDocument();
    expect(fecha()).toBeInTheDocument();
    expect(screen.queryByText(/asociado a/i)).not.toBeInTheDocument();
  });

  it("RF-080 sin descripción no manda el alta y marca el campo", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderFormulario();
    await descripcion();
    ponerFecha("2026-11-02");

    await usuario.click(guardar());

    expect(await screen.findByText("Escribí qué hay que hacer.")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-080 una descripción de solo espacios se rechaza", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderFormulario();
    await usuario.type(await descripcion(), "   ");
    ponerFecha("2026-11-02");

    await usuario.click(guardar());

    expect(await screen.findByText("Escribí qué hay que hacer.")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-080 sin fecha no manda el alta y marca el campo", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderFormulario();
    await usuario.type(await descripcion(), "Llamar a Ana");

    await usuario.click(guardar());

    expect(await screen.findByText("Elegí una fecha.")).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);
  });

  it("RF-080 crea un recordatorio personal sin asociación y avisa al guardar", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    const { alGuardar } = renderFormulario();
    await usuario.type(await descripcion(), "  Llamar a Ana  ");
    ponerFecha("2026-11-02");

    await usuario.click(guardar());

    await vi.waitFor(() => {
      expect(alGuardar).toHaveBeenCalledTimes(1);
    });
    expect(cuerpos).toHaveLength(1);
    expect(cuerpos[0]).toMatchObject({ descripcion: "Llamar a Ana", fecha: "2026-11-02" });
    expect(cuerpos[0]?.["cliente_id"] ?? null).toBeNull();
    expect(cuerpos[0]?.["oportunidad_id"] ?? null).toBeNull();
    expect(cuerpos[0]?.["viaje_id"] ?? null).toBeNull();
  });

  it("RF-080 con un cliente preseleccionado lo muestra y lo manda como asociación", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    renderFormulario({ asociado: camila });
    await usuario.type(await descripcion(), "Mandar el itinerario");
    ponerFecha("2026-11-03");
    expect(screen.getByText(/Camila Benítez/)).toBeInTheDocument();

    await usuario.click(guardar());

    await vi.waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({ cliente_id: CLIENTE_ID, fecha: "2026-11-03" });
    expect(cuerpos[0]?.["oportunidad_id"] ?? null).toBeNull();
    expect(cuerpos[0]?.["viaje_id"] ?? null).toBeNull();
  });

  it("RF-080 con un viaje preseleccionado manda solo esa asociación", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    const viaje = "f0a7c3d9-2b64-4e18-9c5d-8b1e6a4d2f55";
    renderFormulario({ asociado: { tipo: "viaje", id: viaje, etiqueta: "Brasil" } });
    await usuario.type(await descripcion(), "Pedir pasaportes");
    ponerFecha("2026-11-03");

    await usuario.click(guardar());

    await vi.waitFor(() => {
      expect(cuerpos).toHaveLength(1);
    });
    expect(cuerpos[0]).toMatchObject({ viaje_id: viaje });
    expect(cuerpos[0]?.["cliente_id"] ?? null).toBeNull();
  });

  it("RF-080 un 422 del servidor queda en el campo descripción", async () => {
    servidor.use(
      http.post("*/api/alertas", () =>
        problema(422, {
          errores: [{ campo: "descripcion", mensaje: "La descripción es demasiado larga." }],
        }),
      ),
    );
    const usuario = userEvent.setup();
    const { alGuardar } = renderFormulario();
    await usuario.type(await descripcion(), "Algo");
    ponerFecha("2026-11-02");

    await usuario.click(guardar());

    expect(await screen.findByText("La descripción es demasiado larga.")).toBeInTheDocument();
    expect(alGuardar).not.toHaveBeenCalled();
  });

  it("RF-080 si la entidad asociada no existe o no se ve, muestra el aviso del 404", async () => {
    servidor.use(
      http.post("*/api/alertas", () =>
        problema(404, { detail: "No encontramos el cliente asociado." }),
      ),
    );
    const usuario = userEvent.setup();
    const { alGuardar } = renderFormulario({ asociado: camila });
    await usuario.type(await descripcion(), "Llamar");
    ponerFecha("2026-11-02");

    await usuario.click(guardar());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No encontramos el cliente asociado.",
    );
    expect(alGuardar).not.toHaveBeenCalled();
  });

  it("RF-080 Cancelar cierra sin mandar nada", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(altaCapturada(cuerpos));
    const usuario = userEvent.setup();
    const { alCerrar } = renderFormulario();
    await descripcion();

    await usuario.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(alCerrar).toHaveBeenCalled();
    expect(cuerpos).toHaveLength(0);
  });
});

describe("RF-082 edición", () => {
  it("RF-082 precarga descripción y fecha del recordatorio", async () => {
    renderFormulario({ alerta: manual });

    expect(await descripcion()).toHaveValue(manual.descripcion);
    expect(fecha()).toHaveValue(manual.fecha);
  });

  it("RF-082 guarda los cambios con PATCH y avisa", async () => {
    const cuerpos: Record<string, unknown>[] = [];
    servidor.use(
      http.patch(`*/api/alertas/${manual.id}`, async ({ request }) => {
        const cuerpo = (await request.json()) as Record<string, unknown>;
        cuerpos.push(cuerpo);
        return HttpResponse.json({ ...manual, ...cuerpo });
      }),
    );
    const usuario = userEvent.setup();
    const { alGuardar } = renderFormulario({ alerta: manual });
    const campo = await descripcion();
    await usuario.clear(campo);
    await usuario.type(campo, "Llamar a Ana mañana");
    ponerFecha("2026-11-05");

    await usuario.click(guardar());

    await vi.waitFor(() => {
      expect(alGuardar).toHaveBeenCalledTimes(1);
    });
    expect(cuerpos[0]).toMatchObject({ descripcion: "Llamar a Ana mañana", fecha: "2026-11-05" });
  });

  it("RF-082 no deja guardar una descripción vacía", async () => {
    const usuario = userEvent.setup();
    renderFormulario({ alerta: manual });
    await usuario.clear(await descripcion());

    await usuario.click(guardar());

    expect(await screen.findByText("Escribí qué hay que hacer.")).toBeInTheDocument();
  });

  it("RF-082 un 409 (ya no está pendiente) muestra el mensaje del servidor", async () => {
    const detail = "El recordatorio ya no está pendiente: no se puede editar.";
    servidor.use(http.patch(`*/api/alertas/${manual.id}`, () => problema(409, { detail })));
    const usuario = userEvent.setup();
    renderFormulario({ alerta: manual });
    await descripcion();

    await usuario.click(guardar());

    expect(await screen.findByRole("alert")).toHaveTextContent(detail);
  });

  it("RF-082 un 403 (recordatorio ajeno) muestra el mensaje del servidor", async () => {
    const detail = "Solo quien creó el recordatorio puede editarlo.";
    servidor.use(http.patch(`*/api/alertas/${manual.id}`, () => problema(403, { detail })));
    const usuario = userEvent.setup();
    renderFormulario({ alerta: manual });
    await descripcion();

    await usuario.click(guardar());

    expect(await screen.findByRole("alert")).toHaveTextContent(detail);
  });
});
