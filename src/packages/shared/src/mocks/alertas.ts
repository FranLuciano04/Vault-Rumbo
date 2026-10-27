import { http, HttpResponse, type RequestHandler } from "msw";
import type { Alerta, AlertaCrear, AlertaEditar, AlertaPosponer, ProgresoDelDia } from "../modelos";
import { respuestaProblema } from "./problema";
import { type RolMock, usuariosPorRol } from "./usuarios";

/** El «hoy» de la agenda ficticia, `aaaa-mm-dd`. */
export const HOY_MOCK = "2026-10-25";

/** Ana Pérez, la empleada de `usuariosPorRol`. */
const propietario_id = usuariosPorRol.empleado.id;
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

/** Tomás Roldán, el `freelance` de `usuariosPorRol`. */
const otro_propietario_id = usuariosPorRol.freelance.id;
const ana = { id: propietario_id, nombre: usuariosPorRol.empleado.nombre };
const tomas = { id: otro_propietario_id, nombre: usuariosPorRol.freelance.nombre };

const camila = { id: "3c1f6d2e-8a47-4b19-9e53-7d0a2b4c6e11", nombre: "Camila Benítez" };
const joaquin = { id: "d4a8c6e2-5f19-4073-8b3a-2e1c9d7f0b33", nombre: "Joaquín Ramos" };
const sosa = { id: "9e5b0a74-1c3d-4f68-a2b9-5c8d7e0f1a22", nombre: "Familia Sosa" };
const viajeCamila = {
  id: "f0a7c3d9-2b64-4e18-9c5d-8b1e6a4d2f55",
  destino_id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e05",
  destino: "Punta Cana",
  estado: "finalizado",
  fecha_salida: "2026-09-01",
  fecha_regreso: "2026-09-15",
} as const;
const viajeSosa = {
  id: "e5f6a7b8-c9d0-4e1f-a2b3-c4d5e6f7a812",
  destino_id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e03",
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
    descripcion: "Insistir con la cotización de Europa a Joaquín Ramos.",
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
export function progresoMock(alertas: Alerta[] = alertasMock): ProgresoDelDia {
  const resueltas = alertas.filter((a) => a.estado === "resuelta").length;
  const pendientes = alertas.filter((a) => a.estado !== "resuelta" && a.fecha <= HOY_MOCK);
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

/** Quién llama: su identidad y qué alcanza de la agenda ajena (RF-078, DEC-0005). */
type ActorMock = {
  id: string;
  nombre: string;
  /** Atiende (detalle, vista, resolver, posponer) las alertas de otros: admin y dueño. */
  atiendeAjenas: boolean;
  /** Respeta `propietario_id` en el listado; si no, lista solo las propias. */
  listaAjenas: boolean;
  /** Sin `propietario_id`, el listado abarca toda la agencia en vez de la agenda propia. */
  veAgencia: boolean;
};

const alertasDelBackend = () => [...alertasMock, ...alertasAjenasMock];

/** Handlers MSW de las rutas de `/api/alertas` (CU-14, CU-28, CU-30) para el actor dado. */
function manejadoresDe(actor: ActorMock): RequestHandler[] {
  const alcanzables = () =>
    alertasDelBackend().filter((a) => actor.atiendeAjenas || a.propietario_id === actor.id);
  const visible = (id: unknown) => alcanzables().find((a) => a.id === id);
  return [
    http.get(BASE, ({ request }) => {
      const url = new URL(request.url);
      const estado = url.searchParams.get("estado");
      const tipo = url.searchParams.get("tipo");
      const oportunidad = url.searchParams.get("oportunidad_id");
      const proximas = url.searchParams.get("proximas") === "true";
      const desdeFecha = url.searchParams.get("desde");
      const hasta = url.searchParams.get("hasta");
      const pagina = Number(url.searchParams.get("pagina") ?? 1);
      const porPagina = Number(url.searchParams.get("por_pagina") ?? 20);
      const pedido = actor.listaAjenas ? url.searchParams.get("propietario_id") : null;
      const propietario = pedido ?? (actor.veAgencia ? null : actor.id);
      const filtradas = alertasDelBackend().filter(
        (a) =>
          (!propietario || a.propietario_id === propietario) &&
          a.estado === (estado ?? "pendiente") &&
          (!tipo || a.tipo === tipo) &&
          (!oportunidad || a.oportunidad_id === oportunidad) &&
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
        responsable: { id: actor.id, nombre: actor.nombre },
        contexto: sinContexto,
        id: crypto.randomUUID(),
        propietario_id: actor.id,
        tipo: "manual",
        descripcion: datos.descripcion,
        fecha: datos.fecha,
        estado: "pendiente",
        viaje_id: datos.viaje_id ?? null,
        cliente_id: datos.cliente_id ?? null,
        oportunidad_id: datos.oportunidad_id ?? null,
        created_by: actor.id,
        updated_by: actor.id,
        created_at: ahora,
        updated_at: ahora,
      };
      return HttpResponse.json(nueva, { status: 201 });
    }),

    // Antes que `/:id`: si no, «progreso-del-dia» se leería como un id.
    http.get(`${BASE}/progreso-del-dia`, () => HttpResponse.json(progresoMock(alcanzables()))),

    http.get(`${BASE}/:id`, ({ params }) => {
      const alerta = visible(params["id"]);
      return alerta ? HttpResponse.json(alerta) : noEncontrada();
    }),

    http.patch(`${BASE}/:id`, async ({ params, request }) => {
      const alerta = visible(params["id"]);
      if (!alerta) return noEncontrada();
      if (alerta.propietario_id !== actor.id) {
        return respuestaProblema(403, "Sin permiso", {
          detail: "No podés modificar este registro",
        });
      }
      if (alerta.tipo !== "manual") {
        return respuestaProblema(409, "Conflicto", {
          detail: "Solo se edita un recordatorio manual, no una alerta automática.",
        });
      }
      if (alerta.estado !== "pendiente") return transicionInvalida(alerta, "editar");
      return HttpResponse.json({ ...alerta, ...((await request.json()) as AlertaEditar) });
    }),

    http.post(`${BASE}/:id/vista`, ({ params }) => {
      const alerta = visible(params["id"]);
      if (!alerta) return noEncontrada();
      return alerta.estado === "pendiente"
        ? HttpResponse.json({ ...alerta, estado: "vista" })
        : transicionInvalida(alerta, "marcar como vista");
    }),

    http.post(`${BASE}/:id/resolver`, ({ params }) => {
      const alerta = visible(params["id"]);
      if (!alerta) return noEncontrada();
      // El pago se resuelve al cobrar, no a mano (CU-14 A2).
      if (alerta.tipo === "pago") {
        const cuando = alerta.viaje_hotel_id
          ? "al registrar el pago al proveedor"
          : "al cobrar el pago";
        return respuestaProblema(409, "Conflicto", {
          detail: `Una alerta de pago no se resuelve a mano: se resuelve ${cuando}.`,
        });
      }
      if (alerta.estado === "resuelta") return transicionInvalida(alerta, "resolver");
      return HttpResponse.json({
        ...alerta,
        estado: "resuelta",
        resuelta_en: new Date().toISOString(),
      });
    }),

    http.post(`${BASE}/:id/posponer`, async ({ params, request }) => {
      const alerta = visible(params["id"]);
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
}

/** Handlers de Ana Pérez, la empleada de la agenda ficticia; su `propietario_id` abre el listado ajeno. */
export const manejadoresAlertas: RequestHandler[] = manejadoresDe({
  ...ana,
  atiendeAjenas: false,
  listaAjenas: true,
  veAgencia: false,
});

/** Handlers según el rol del actor, con la matriz de permisos del backend (RF-078, CU-28 A2). */
export function manejadoresAlertasPara(rol: RolMock): RequestHandler[] {
  const direccion = rol === "admin" || rol === "dueno";
  const { id, nombre } = usuariosPorRol[rol];
  return manejadoresDe({
    id,
    nombre,
    atiendeAjenas: direccion,
    listaAjenas: direccion,
    veAgencia: direccion,
  });
}
