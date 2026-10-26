import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { HistorialCliente } from "../cliente";
import { alertasAjenasMock, alertasMock } from "./alertas";
import { clientesMock, manejadoresClientes } from "./clientes";
import { crearServidor } from "./index";
import { cotizacionesMock, oportunidadesMock } from "./oportunidades";
import { viajesMock } from "./viajes";

const servidor = crearServidor(...manejadoresClientes);
beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const nombreDe = new Map(clientesMock.map((c) => [c.id, c.nombre] as const));
const todasLasAlertas = [...alertasMock, ...alertasAjenasMock];

async function historialDe(clienteId: string): Promise<HistorialCliente> {
  const res = await fetch(`http://localhost/api/clientes/${clienteId}/historial`);
  return (await res.json()) as HistorialCliente;
}

describe("RF-031 consistencia referencial de los mocks: clientes", () => {
  it("RF-031 todo cliente_id de las oportunidades existe en clientesMock", () => {
    for (const o of oportunidadesMock) {
      expect(nombreDe.has(o.cliente_id), `oportunidad ${o.id}: cliente ${o.cliente_id}`).toBe(true);
    }
  });

  it("RF-031 todo cliente_id de los viajes existe en clientesMock", () => {
    for (const v of viajesMock) {
      expect(nombreDe.has(v.cliente_id), `viaje ${v.id}: cliente ${v.cliente_id}`).toBe(true);
    }
  });

  it("RF-031 todo cliente de las alertas (cliente_id y contexto.cliente) existe con el mismo nombre", () => {
    for (const a of todasLasAlertas) {
      if (a.cliente_id) {
        expect(nombreDe.has(a.cliente_id), `alerta ${a.id}: cliente_id ${a.cliente_id}`).toBe(true);
      }
      const c = a.contexto.cliente;
      if (c) {
        expect(nombreDe.get(c.id), `alerta ${a.id}: contexto.cliente ${c.id}`).toBe(c.nombre);
      }
    }
  });
});

describe("RF-031 consistencia referencial de los mocks: oportunidades", () => {
  it("RF-031 toda cotización cuelga de una oportunidad del embudo", () => {
    const ids = new Set(oportunidadesMock.map((o) => o.id));
    for (const c of cotizacionesMock) expect(ids.has(c.oportunidad_id), c.id).toBe(true);
  });

  it("RF-031 las oportunidades del historial de cada cliente son las del embudo, del mismo cliente", async () => {
    for (const cliente of clientesMock) {
      const { oportunidades } = await historialDe(cliente.id);
      for (const h of oportunidades) {
        const o = oportunidadesMock.find((x) => x.id === h.id);
        expect(o, `${cliente.nombre}: oportunidad ${h.id} (${h.destino_consultado})`).toBeDefined();
        expect(o?.cliente_id, `${cliente.nombre}: ${h.id}`).toBe(cliente.id);
        expect(o?.destino_consultado, `${cliente.nombre}: ${h.id}`).toBe(h.destino_consultado);
        expect(o?.estado, `${cliente.nombre}: ${h.id}`).toBe(h.estado);
      }
    }
  });

  it("RF-031 las oportunidades de las alertas (oportunidad_id y contexto) son las del embudo, del mismo cliente", () => {
    for (const a of todasLasAlertas) {
      const ctx = a.contexto.oportunidad;
      for (const id of [a.oportunidad_id, ctx?.id]) {
        if (!id) continue;
        expect(
          oportunidadesMock.some((o) => o.id === id),
          `alerta ${a.id}: oportunidad ${id}`,
        ).toBe(true);
      }
      const o = oportunidadesMock.find((x) => x.id === (a.oportunidad_id ?? ctx?.id));
      if (!o) continue;
      expect(a.contexto.cliente?.id, `alerta ${a.id}: cliente del contexto`).toBe(o.cliente_id);
      if (ctx) {
        expect(ctx.destino_consultado, `alerta ${a.id}`).toBe(o.destino_consultado);
        expect(ctx.estado, `alerta ${a.id}`).toBe(o.estado);
      }
    }
  });
});

describe("RF-031 consistencia referencial de los mocks: viajes", () => {
  it("RF-031 los viajes de las alertas y del historial existen en viajesMock, del mismo cliente", async () => {
    for (const a of todasLasAlertas) {
      const id = a.viaje_id ?? a.contexto.viaje?.id;
      if (!id) continue;
      const v = viajesMock.find((x) => x.id === id);
      expect(v, `alerta ${a.id}: viaje ${id}`).toBeDefined();
      expect(a.contexto.cliente?.id, `alerta ${a.id}: cliente del viaje`).toBe(v?.cliente_id);
    }
    for (const cliente of clientesMock) {
      for (const h of (await historialDe(cliente.id)).viajes) {
        const v = viajesMock.find((x) => x.id === h.id);
        expect(v, `${cliente.nombre}: viaje ${h.id}`).toBeDefined();
        expect(v?.cliente_id, `${cliente.nombre}: viaje ${h.id}`).toBe(cliente.id);
      }
    }
  });
});
