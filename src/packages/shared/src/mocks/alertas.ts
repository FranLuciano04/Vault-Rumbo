import { http, HttpResponse, type RequestHandler } from "msw";
import type { Alerta, AlertaCrear, AlertaEditar, AlertaPosponer, ProgresoDelDia } from "../modelos";
import { respuestaProblema } from "./problema";

/** El «hoy» de la agenda ficticia, `aaaa-mm-dd`. */
export const HOY_MOCK = "2026-10-25";

/** Ana Pérez, la empleada de `usuariosPorRol`; no se importa de ahí porque `index` carga este archivo. */
const propietario_id = "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03";
const sinOrigen = {
  viaje_id: null,
  pago_id: null,
  oportunidad_id: null,
  cliente_id: null,
  viaje_hotel_id: null,
};
const auditoria = {
  created_by: null,
  updated_by: null,
  created_at: "2026-10-20T00:00:00Z",
  updated_at: "2026-10-20T00:00:00Z",
};
const abierta = { resuelta_en: null, cerrada_por_cancelacion: false };

/** Tomás Roldán, el `freelance` de `usuariosPorRol` (mismo motivo que arriba). */
const otro_propietario_id = "e7b20d94-6a3f-4c15-9d8e-0b5a3f7c2e04";
const ana = { id: propietario_id, nombre: "Ana Pérez" };
const tomas = { id: otro_propietario_id, nombre: "Tomás Roldán" };

const camila = { id: "3c1f6d2e-8a47-4b19-9e53-7d0a2b4c6e11", nombre: "Camila Benítez" };
const joaquin = { id: "d4a8c6e2-5f19-4073-8b3a-2e1c9d7f0b33", nombre: "Joaquín Ramos" };
const sosa = { id: "a9e3b7c1-4d26-4f58-8c0a-6b1d2e3f4a57", nombre: "Familia Sosa" };
const viajeCamila = {
  id: "f0a7c3d9-2b64-4e18-9c5d-8b1e6a4d2f55",
  destino: "Punta Cana",
  estado: "finalizado",
  fecha_salida: "2026-09-01",
  fecha_regreso: "2026-09-15",
} as const;
const viajeSosa = {
  id: "e5f6a7b8-c9d0-4e1f-a2b3-c4d5e6f7a812",
  destino: "Brasil",
  estado: "confirmado",
  fecha_salida: "2026-11-01",
  fecha_regreso: "2026-11-15",
} as const;
const oportunidadJoaquin = {
  id: "6b2d9f08-7e41-4c5a-8d13-0a9e3c5b7f44",
  destino_consultado: "Europa",
  estado: "cotizada",
} as const;
const pagoCamila = {
  id: "b1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e11",
  tipo: "cuota",
  monto: "450000.00",
  moneda: "ARS",
  vencimiento: "2026-10-23",
  estado: "pendiente",
} as const;

/** Un recordatorio manual suelto: ninguno de los cuatro orígenes. */
const sinContexto = { cliente: null, oportunidad: null, viaje: null, pago: null };

/** Agenda ficticia de la empleada: una alerta de cada tipo, en distintos estados y fechas. */
export const alertasMock: Alerta[] = [
  {
    ...sinOrigen,
    ...abierta,
    ...auditoria,
    responsable: ana,
    contexto: { ...sinContexto, cliente: camila, viaje: viajeCamila, pago: pagoCamila },
    id: "c0a1f5d2-6e37-4b81-9a4c-1f2e3d4c5b01",
    propietario_id,
    tipo: "pago",
    descripcion: "Cobrar la cuota 2 de 3 de Camila Benítez (Punta Cana).",
    fecha: "2026-10-23",
    estado: "pendiente",
    pago_id: "b1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e11",
  },
  {
    ...sinOrigen,
    ...abierta,
    ...auditoria,
    responsable: ana,
    contexto: { ...sinContexto, cliente: camila, viaje: viajeCamila },
    id: "c0a1f5d2-6e37-4b81-9a4c-1f2e3d4c5b02",
    propietario_id,
    tipo: "formulario",
    descripcion: "Pedir el pasaporte vigente: Roma exige 6 meses de validez.",
    fecha: "2026-10-25",
    estado: "pendiente",
    viaje_id: "f0a7c3d9-2b64-4e18-9c5d-8b1e6a4d2f55",
  },
  {
    ...sinOrigen,
    ...abierta,
    ...auditoria,
    responsable: ana,
    contexto: { ...sinContexto, cliente: sosa, viaje: viajeSosa },
    id: "c0a1f5d2-6e37-4b81-9a4c-1f2e3d4c5b03",
    propietario_id,
    tipo: "salida",
    descripcion: "Sale en 7 días el viaje de la Familia Sosa a Brasil.",
    fecha: "2026-10-25",
    estado: "vista",
    viaje_id: "e5f6a7b8-c9d0-4e1f-a2b3-c4d5e6f7a812",
  },
  {
    ...sinOrigen,
    ...abierta,
    ...auditoria,
    responsable: ana,
    contexto: { ...sinContexto, cliente: joaquin, oportunidad: oportunidadJoaquin },
    id: "c0a1f5d2-6e37-4b81-9a4c-1f2e3d4c5b04",
    propietario_id,
    tipo: "insistencia",
    descripcion: "Insistir con la cotización a Joaquín Ramos (Europa).",
    fecha: "2026-10-24",
    estado: "pendiente",
    oportunidad_id: "6b2d9f08-7e41-4c5a-8d13-0a9e3c5b7f44",
  },
  {
    ...sinOrigen,
    ...auditoria,
    responsable: ana,
    contexto: { ...sinContexto, cliente: camila, viaje: viajeCamila },
    id: "c0a1f5d2-6e37-4b81-9a4c-1f2e3d4c5b05",
    propietario_id,
    tipo: "resena",
    descripcion: "Pedir la reseña del hotel a Camila Benítez, que volvió de Punta Cana.",
    fecha: "2026-10-25",
    estado: "resuelta",
    resuelta_en: "2026-10-25T13:05:00Z",
    cerrada_por_cancelacion: false,
    viaje_id: "f0a7c3d9-2b64-4e18-9c5d-8b1e6a4d2f55",
  },
  {
    ...sinOrigen,
    ...abierta,
    ...auditoria,
    responsable: ana,
    contexto: sinContexto,
    id: "c0a1f5d2-6e37-4b81-9a4c-1f2e3d4c5b06",
    propietario_id,
    tipo: "manual",
    descripcion: "Llamar a Ana por la cotización.",
    fecha: "2026-10-28",
    estado: "pendiente",
  },
  {
    ...sinOrigen,
    ...abierta,
    ...auditoria,
    responsable: ana,
    contexto: { ...sinContexto, cliente: joaquin },
    id: "c0a1f5d2-6e37-4b81-9a4c-1f2e3d4c5b07",
    propietario_id,
    tipo: "recontacto",
    descripcion: "Hace un año que Joaquín Ramos no viaja: ofrecele una escapada.",
    fecha: "2026-10-30",
    estado: "pendiente",
    cliente_id: "d4a8c6e2-5f19-4073-8b3a-2e1c9d7f0b33",
  },
  {
    ...sinOrigen,
    ...abierta,
    ...auditoria,
    responsable: ana,
    contexto: { ...sinContexto, cliente: sosa, viaje: viajeSosa },
    id: "c0a1f5d2-6e37-4b81-9a4c-1f2e3d4c5b08",
    propietario_id,
    tipo: "viaje",
    descripcion: "Hoy sale el viaje de la Familia Sosa: pasalo a «en curso».",
    fecha: "2026-10-25",
    estado: "pendiente",
    viaje_id: "e5f6a7b8-c9d0-4e1f-a2b3-c4d5e6f7a812",
  },
];

/** Alertas de otro responsable: solo las ven admin y dueño, con `propietario_id` (CU-14 A1). */
export const alertasAjenasMock: Alerta[] = [
  {
    ...sinOrigen,
    ...abierta,
    ...auditoria,
    responsable: tomas,
    contexto: { ...sinContexto, cliente: joaquin, oportunidad: oportunidadJoaquin },
    id: "d1b2a6e3-7f48-4c92-8b5d-2a3f4e5d6c01",
    propietario_id: otro_propietario_id,
    tipo: "insistencia",
    descripcion: "Insistir con la cotización a la Familia Sosa (Brasil).",
    fecha: "2026-10-24",
    estado: "pendiente",
    oportunidad_id: "6b2d9f08-7e41-4c5a-8d13-0a9e3c5b7f44",
  },
  {
    ...sinOrigen,
    ...abierta,
    ...auditoria,
    responsable: tomas,
    contexto: sinContexto,
    id: "d1b2a6e3-7f48-4c92-8b5d-2a3f4e5d6c02",
    propietario_id: otro_propietario_id,
    tipo: "manual",
    descripcion: "Mandarle el itinerario a Joaquín Ramos.",
    fecha: "2026-10-27",
    estado: "pendiente",
  },
  {
    ...sinOrigen,
    ...auditoria,
    responsable: tomas,
    contexto: { ...sinContexto, cliente: camila },
    id: "d1b2a6e3-7f48-4c92-8b5d-2a3f4e5d6c03",
    propietario_id: otro_propietario_id,
    tipo: "recontacto",
    descripcion: "Recontactar a Camila Benítez.",
    fecha: "2026-10-25",
    estado: "resuelta",
    resuelta_en: "2026-10-25T11:20:00Z",
    cerrada_por_cancelacion: false,
    cliente_id: "3c1f6d2e-8a47-4b19-9e53-7d0a2b4c6e11",
  },
];

/** Resueltas hoy sobre el total del día (las resueltas hoy más las que vencen hasta hoy). */
export function progresoMock(): ProgresoDelDia {
  const resueltas = alertasMock.filter((a) => a.estado === "resuelta").length;
  const pendientes = alertasMock.filter((a) => a.estado !== "resuelta" && a.fecha <= HOY_MOCK);
  return { resueltas_hoy: resueltas, total_del_dia: resueltas + pendientes.length };
}

const BASE = "*/api/alertas";

function noEncontrada() {
  return respuestaProblema(404, "No encontrado", {
    detail: "La alerta no existe o no la podés ver.",
  });
}

function transicionInvalida(alerta: Alerta, accion: string) {
  return respuestaProblema(409, "Conflicto", {
    detail: `No se puede ${accion} una alerta ${alerta.estado}.`,
  });
}

/** Handlers MSW de las rutas de `/api/alertas` (CU-14, CU-28, CU-30). */
export const manejadoresAlertas: RequestHandler[] = [
  http.get(BASE, ({ request }) => {
    const url = new URL(request.url);
    const estado = url.searchParams.get("estado");
    const tipo = url.searchParams.get("tipo");
    const proximas = url.searchParams.get("proximas") === "true";
    const desdeFecha = url.searchParams.get("desde");
    const hasta = url.searchParams.get("hasta");
    const pagina = Number(url.searchParams.get("pagina") ?? 1);
    const porPagina = Number(url.searchParams.get("por_pagina") ?? 20);
    const propietario = url.searchParams.get("propietario_id");
    const agenda = propietario ? [...alertasMock, ...alertasAjenasMock] : alertasMock;
    const filtradas = agenda.filter(
      (a) =>
        (!propietario || a.propietario_id === propietario) &&
        a.estado === (estado ?? "pendiente") &&
        (!tipo || a.tipo === tipo) &&
        (proximas ? a.fecha > HOY_MOCK : a.fecha <= HOY_MOCK) &&
        (!desdeFecha || a.fecha >= desdeFecha) &&
        (!hasta || a.fecha <= hasta),
    );
    const desde = (pagina - 1) * porPagina;
    return HttpResponse.json({
      items: filtradas.slice(desde, desde + porPagina),
      total: filtradas.length,
      pagina,
      por_pagina: porPagina,
    });
  }),

  http.post(BASE, async ({ request }) => {
    const datos = (await request.json()) as AlertaCrear;
    const asociadas = [datos.viaje_id, datos.cliente_id, datos.oportunidad_id].filter(Boolean);
    if (asociadas.length > 1) {
      return respuestaProblema(422, "Datos inválidos", {
        detail: "Asociá el recordatorio a una sola entidad.",
      });
    }
    const ahora = new Date().toISOString();
    const nueva: Alerta = {
      ...sinOrigen,
      ...abierta,
      responsable: ana,
      contexto: sinContexto,
      id: crypto.randomUUID(),
      propietario_id,
      tipo: "manual",
      descripcion: datos.descripcion,
      fecha: datos.fecha,
      estado: "pendiente",
      viaje_id: datos.viaje_id ?? null,
      cliente_id: datos.cliente_id ?? null,
      oportunidad_id: datos.oportunidad_id ?? null,
      created_by: propietario_id,
      updated_by: propietario_id,
      created_at: ahora,
      updated_at: ahora,
    };
    return HttpResponse.json(nueva, { status: 201 });
  }),

  // Antes que `/:id`: si no, «progreso-del-dia» se leería como un id.
  http.get(`${BASE}/progreso-del-dia`, () => HttpResponse.json(progresoMock())),

  http.get(`${BASE}/:id`, ({ params }) => {
    const alerta = alertasMock.find((a) => a.id === params["id"]);
    return alerta ? HttpResponse.json(alerta) : noEncontrada();
  }),

  http.patch(`${BASE}/:id`, async ({ params, request }) => {
    const alerta = alertasMock.find((a) => a.id === params["id"]);
    if (!alerta) return noEncontrada();
    if (alerta.tipo !== "manual") {
      return respuestaProblema(409, "Conflicto", {
        detail: "Solo se edita un recordatorio manual, no una alerta automática.",
      });
    }
    if (alerta.estado !== "pendiente") return transicionInvalida(alerta, "editar");
    return HttpResponse.json({ ...alerta, ...((await request.json()) as AlertaEditar) });
  }),

  http.post(`${BASE}/:id/vista`, ({ params }) => {
    const alerta = alertasMock.find((a) => a.id === params["id"]);
    if (!alerta) return noEncontrada();
    return alerta.estado === "pendiente"
      ? HttpResponse.json({ ...alerta, estado: "vista" })
      : transicionInvalida(alerta, "marcar como vista");
  }),

  http.post(`${BASE}/:id/resolver`, ({ params }) => {
    const alerta = alertasMock.find((a) => a.id === params["id"]);
    if (!alerta) return noEncontrada();
    if (alerta.estado === "resuelta") return transicionInvalida(alerta, "resolver");
    // El pago se resuelve al registrar el cobro, no a mano (CU-14 A2).
    if (alerta.tipo === "pago") {
      return respuestaProblema(409, "Conflicto", {
        detail: "La alerta de un pago se resuelve al registrar el cobro.",
      });
    }
    return HttpResponse.json({
      ...alerta,
      estado: "resuelta",
      resuelta_en: new Date().toISOString(),
    });
  }),

  http.post(`${BASE}/:id/posponer`, async ({ params, request }) => {
    const alerta = alertasMock.find((a) => a.id === params["id"]);
    if (!alerta) return noEncontrada();
    if (alerta.estado !== "pendiente") return transicionInvalida(alerta, "posponer");
    const { fecha } = (await request.json()) as AlertaPosponer;
    if (fecha <= (alerta.fecha > HOY_MOCK ? alerta.fecha : HOY_MOCK)) {
      return respuestaProblema(422, "Datos inválidos", {
        detail: "La nueva fecha tiene que ser posterior a hoy y a la actual.",
      });
    }
    return HttpResponse.json({ ...alerta, fecha });
  }),
];
