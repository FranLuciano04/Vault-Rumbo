import { crearCliente } from "@rumbo/shared";
import {
  alertasAjenasMock,
  alertasMock,
  crearServidor,
  manejadoresAlertas,
  usuariosPorRol,
  type RolMock,
} from "@rumbo/shared/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { PaginaAgenda } from "./PaginaAgenda";

const servidor = crearServidor(...manejadoresAlertas);
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
});
const HOY_ISO = "2026-10-25";
const AYER_ISO = "2026-10-24";
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

const TOMAS_ID = "e7b20d94-6a3f-4c15-9d8e-0b5a3f7c2e04";
const asesores = [
  { id: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03", nombre: "Ana Pérez" },
  { id: TOMAS_ID, nombre: "Tomás Roldán" },
];

const PAGO = "Cobrar la cuota 2 de 3 de Camila Benítez (Punta Cana).";
const INSISTENCIA = "Insistir con la cotización a Joaquín Ramos (Europa).";
const FORMULARIO = "Pedir el pasaporte vigente: Roma exige 6 meses de validez.";
const VIAJE = "Hoy sale el viaje de la Familia Sosa: pasalo a «en curso».";
const MANUAL_PROXIMA = "Llamar a Ana por la cotización.";

/**
 * Totales «reales» del servidor, deliberadamente MÁS GRANDES que la página que devuelve, para
 * probar que la pantalla muestra `total` y no cuenta lo cargado.
 * Agencia: atrasadas 37, de hoy 15 (hasta hoy = 52), próximas 9.
 * Un responsable filtrado (`propietario_id`): atrasadas 3, de hoy 1 (hasta hoy = 4), próximas 2.
 */
const TOTALES = {
  agencia: { atrasadas: 37, hoy: 15, proximas: 9 },
  responsable: { atrasadas: 3, hoy: 1, proximas: 2 },
};

const todasLasAlertas = [...alertasMock, ...alertasAjenasMock];

/** GET /api/alertas con `total` propio y `items` según los filtros; registra cada pedido. */
function servidorConTotales(pedidos: URLSearchParams[]) {
  servidor.use(
    http.get("*/api/alertas", ({ request }) => {
      const p = new URL(request.url).searchParams;
      pedidos.push(p);
      const pagina = Number(p.get("pagina") ?? 1);
      const porPagina = Number(p.get("por_pagina") ?? 20);
      const propietario = p.get("propietario_id");
      const proximas = p.get("proximas") === "true";
      const hasta = p.get("hasta");
      const desde = p.get("desde");
      if (p.get("estado") === "vista") {
        return HttpResponse.json({ items: [], total: 0, pagina, por_pagina: porPagina });
      }
      const t = propietario ? TOTALES.responsable : TOTALES.agencia;
      const total = proximas
        ? t.proximas
        : desde === HOY_ISO && hasta === HOY_ISO
          ? t.hoy
          : hasta === AYER_ISO
            ? t.atrasadas
            : t.atrasadas + t.hoy;
      const items = todasLasAlertas
        .filter(
          (a) =>
            a.estado === "pendiente" &&
            (!propietario || a.propietario_id === propietario) &&
            (!desde || a.fecha >= desde) &&
            (proximas
              ? a.fecha > HOY_ISO
              : a.fecha <= (hasta && hasta < HOY_ISO ? hasta : HOY_ISO)),
        )
        .slice((pagina - 1) * porPagina, pagina * porPagina);
      return HttpResponse.json({ items, total, pagina, por_pagina: porPagina });
    }),
  );
}

function renderAgenda(rol: RolMock = "empleado") {
  if (rol === "admin" || rol === "dueno") {
    servidor.use(http.get("*/api/usuarios/asesores", () => HttpResponse.json(asesores)));
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

/**
 * Las tarjetas «Atrasadas N» y «Para hoy N» (pantallas 3 y 49) viven en un `role="group"` con el
 * nombre «Totales de la agenda»; cada una tiene su rótulo («Atrasadas», «Para hoy») y su número
 * en el mismo contenedor.
 */
function tarjeta(rotulo: "Atrasadas" | "Para hoy") {
  const grupo = screen.getByRole("group", { name: /totales de la agenda/i });
  const texto = within(grupo).getByText(new RegExp(`^${rotulo}$`, "i"));
  return texto.parentElement as HTMLElement;
}

const pestana = (nombre: string) => screen.getByRole("tab", { name: new RegExp(`^${nombre}\\b`) });

describe("RF-074 totales de la agenda", () => {
  it("RF-074 la tarjeta «Atrasadas» muestra el total del servidor, no lo cargado en la página", async () => {
    servidorConTotales([]);
    renderAgenda("empleado");

    await waitFor(() => {
      expect(tarjeta("Atrasadas")).toHaveTextContent("37");
    });
  });

  it("RF-074 la tarjeta «Para hoy» muestra el total de hoy: lo de hasta hoy menos lo atrasado", async () => {
    servidorConTotales([]);
    renderAgenda("empleado");

    await waitFor(() => {
      expect(tarjeta("Para hoy")).toHaveTextContent("15");
    });
  });

  it("RF-074 los totales se leen del servidor con hasta=ayer y hasta=hoy", async () => {
    const pedidos: URLSearchParams[] = [];
    servidorConTotales(pedidos);
    renderAgenda("empleado");

    await waitFor(() => {
      expect(pedidos.some((p) => p.get("hasta") === AYER_ISO && !p.get("proximas"))).toBe(true);
      expect(pedidos.some((p) => p.get("hasta") === HOY_ISO && !p.get("proximas"))).toBe(true);
    });
  });

  it.each<RolMock>(["admin", "dueno"])(
    "RF-074 %s sin filtrar ve los totales de la agencia (sin propietario_id)",
    async (rol) => {
      const pedidos: URLSearchParams[] = [];
      servidorConTotales(pedidos);
      renderAgenda(rol);

      await waitFor(() => {
        expect(tarjeta("Atrasadas")).toHaveTextContent("37");
        expect(tarjeta("Para hoy")).toHaveTextContent("15");
      });
      expect(pedidos.every((p) => !p.get("propietario_id"))).toBe(true);
    },
  );

  it("RF-074 admin que filtra por responsable ve los totales de ese responsable", async () => {
    const pedidos: URLSearchParams[] = [];
    servidorConTotales(pedidos);
    const usuario = userEvent.setup();
    renderAgenda("admin");
    await screen.findByRole("option", { name: "Tomás Roldán" });

    await usuario.selectOptions(
      screen.getByRole("combobox", { name: /responsable/i }),
      "Tomás Roldán",
    );

    await waitFor(() => {
      expect(tarjeta("Atrasadas")).toHaveTextContent("3");
      expect(tarjeta("Para hoy")).toHaveTextContent("1");
    });
    expect(tarjeta("Atrasadas")).not.toHaveTextContent("37");
    expect(
      pedidos.some((p) => p.get("propietario_id") === TOMAS_ID && p.get("hasta") === AYER_ISO),
    ).toBe(true);
  });

  it("RF-074 el empleado no manda propietario_id al leer los totales", async () => {
    const pedidos: URLSearchParams[] = [];
    servidorConTotales(pedidos);
    renderAgenda("empleado");
    await waitFor(() => {
      expect(tarjeta("Atrasadas")).toHaveTextContent("37");
    });

    expect(pedidos.every((p) => !p.get("propietario_id"))).toBe(true);
  });
});

describe("RF-154 pestañas con contador", () => {
  it("RF-154 hay cuatro pestañas «Todas», «Atrasadas», «Hoy» y «Próximas», cada una con su contador", async () => {
    servidorConTotales([]);
    renderAgenda("empleado");

    await waitFor(() => {
      expect(pestana("Todas")).toHaveTextContent("52");
    });
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(pestana("Atrasadas")).toHaveTextContent("37");
    expect(pestana("Hoy")).toHaveTextContent("15");
    expect(pestana("Próximas")).toHaveTextContent("9");
  });

  it("RF-154 ya no existe la pestaña «Pendientes» y «Todas» arranca seleccionada", async () => {
    servidorConTotales([]);
    renderAgenda("empleado");
    await screen.findByText(PAGO);

    expect(screen.queryByRole("tab", { name: /pendientes/i })).not.toBeInTheDocument();
    expect(pestana("Todas")).toHaveAttribute("aria-selected", "true");
  });

  it("RF-154 «Todas» lista las atrasadas y las de hoy, no las próximas", async () => {
    servidorConTotales([]);
    renderAgenda("empleado");

    for (const d of [PAGO, INSISTENCIA, FORMULARIO, VIAJE]) {
      expect(await screen.findByText(d)).toBeInTheDocument();
    }
    expect(screen.queryByText(MANUAL_PROXIMA)).not.toBeInTheDocument();
  });

  it("RF-154 «Atrasadas» pide hasta=ayer y lista solo las atrasadas", async () => {
    const pedidos: URLSearchParams[] = [];
    servidorConTotales(pedidos);
    const usuario = userEvent.setup();
    renderAgenda("empleado");
    await screen.findByText(FORMULARIO);
    pedidos.length = 0;

    await usuario.click(pestana("Atrasadas"));

    expect(await screen.findByText(PAGO)).toBeInTheDocument();
    expect(screen.getByText(INSISTENCIA)).toBeInTheDocument();
    expect(screen.queryByText(FORMULARIO)).not.toBeInTheDocument();
    expect(screen.queryByText(VIAJE)).not.toBeInTheDocument();
    expect(
      pedidos.some(
        (p) => p.get("por_pagina") === "100" && p.get("hasta") === AYER_ISO && !p.get("proximas"),
      ),
    ).toBe(true);
  });

  /**
   * Decisión: «Hoy» pide `desde=<hoy>&hasta=<hoy>` (sin `proximas`) y muestra lo que devuelve el
   * servidor, sin filtrar en el cliente. Su contador es el `total` de ese mismo pedido.
   */
  it("RF-154 «Hoy» pide desde=hoy y hasta=hoy y lista solo las de la fecha de hoy", async () => {
    const pedidos: URLSearchParams[] = [];
    servidorConTotales(pedidos);
    const usuario = userEvent.setup();
    renderAgenda("empleado");
    await screen.findByText(PAGO);
    pedidos.length = 0;

    await usuario.click(pestana("Hoy"));

    await waitFor(() => {
      expect(screen.queryByText(PAGO)).not.toBeInTheDocument();
    });
    expect(screen.getByText(FORMULARIO)).toBeInTheDocument();
    expect(screen.getByText(VIAJE)).toBeInTheDocument();
    expect(screen.queryByText(INSISTENCIA)).not.toBeInTheDocument();
    expect(
      pedidos.some(
        (p) =>
          p.get("por_pagina") === "100" &&
          p.get("desde") === HOY_ISO &&
          p.get("hasta") === HOY_ISO &&
          !p.get("proximas"),
      ),
    ).toBe(true);
  });

  it("RF-154 «Hoy» lista las de hoy aunque haya más de 100 atrasadas", async () => {
    const modelo = alertasMock.find((a) => a.fecha === HOY_ISO && a.estado === "pendiente");
    if (!modelo) throw new Error("falta una alerta de hoy en el mock");
    const atrasadas = Array.from({ length: 150 }, (_, i) => ({
      ...modelo,
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      fecha: AYER_ISO,
      descripcion: `Atrasada ${String(i)}`,
    }));
    const deHoy = {
      ...modelo,
      id: "ffffffff-0000-4000-8000-000000000001",
      descripcion: "Única de hoy",
    };
    const todas = [...atrasadas, deHoy];
    servidor.use(
      http.get("*/api/alertas", ({ request }) => {
        const p = new URL(request.url).searchParams;
        const pagina = Number(p.get("pagina") ?? 1);
        const porPagina = Number(p.get("por_pagina") ?? 20);
        const desde = p.get("desde");
        const hasta = p.get("hasta") ?? HOY_ISO;
        const filtradas =
          p.get("estado") === "vista" || p.get("proximas") === "true"
            ? []
            : todas.filter((a) => (!desde || a.fecha >= desde) && a.fecha <= hasta);
        return HttpResponse.json({
          items: filtradas.slice((pagina - 1) * porPagina, pagina * porPagina),
          total: filtradas.length,
          pagina,
          por_pagina: porPagina,
        });
      }),
    );
    const usuario = userEvent.setup();
    renderAgenda("empleado");
    await waitFor(() => {
      expect(pestana("Hoy")).toHaveTextContent("1");
    });

    await usuario.click(pestana("Hoy"));

    expect(await screen.findByText("Única de hoy")).toBeInTheDocument();
    expect(screen.queryByText("Atrasada 0")).not.toBeInTheDocument();
  });

  it("RF-154 «Próximas» pide proximas=true y lista las posteriores a hoy", async () => {
    const pedidos: URLSearchParams[] = [];
    servidorConTotales(pedidos);
    const usuario = userEvent.setup();
    renderAgenda("empleado");
    await screen.findByText(PAGO);
    pedidos.length = 0;

    await usuario.click(pestana("Próximas"));

    expect(await screen.findByText(MANUAL_PROXIMA)).toBeInTheDocument();
    expect(screen.queryByText(PAGO)).not.toBeInTheDocument();
    expect(pedidos.some((p) => p.get("por_pagina") === "100" && p.get("proximas") === "true")).toBe(
      true,
    );
  });

  it("RF-154 volver a «Todas» muestra de nuevo atrasadas y de hoy", async () => {
    servidorConTotales([]);
    const usuario = userEvent.setup();
    renderAgenda("empleado");
    await screen.findByText(PAGO);
    await usuario.click(pestana("Próximas"));
    await screen.findByText(MANUAL_PROXIMA);

    await usuario.click(pestana("Todas"));

    expect(await screen.findByText(PAGO)).toBeInTheDocument();
    expect(screen.getByText(FORMULARIO)).toBeInTheDocument();
    expect(screen.queryByText(MANUAL_PROXIMA)).not.toBeInTheDocument();
  });

  it("RF-154 los contadores de las pestañas siguen al responsable filtrado", async () => {
    servidorConTotales([]);
    const usuario = userEvent.setup();
    renderAgenda("dueno");
    await screen.findByRole("option", { name: "Tomás Roldán" });

    await usuario.selectOptions(
      screen.getByRole("combobox", { name: /responsable/i }),
      "Tomás Roldán",
    );

    await waitFor(() => {
      expect(pestana("Todas")).toHaveTextContent("4");
    });
    expect(pestana("Atrasadas")).toHaveTextContent("3");
    expect(pestana("Hoy")).toHaveTextContent("1");
    expect(pestana("Próximas")).toHaveTextContent("2");
  });
});
