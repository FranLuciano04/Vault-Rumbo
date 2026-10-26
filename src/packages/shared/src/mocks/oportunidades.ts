import { http, HttpResponse, type RequestHandler } from "msw";
import type {
  Alerta,
  Cotizacion,
  CotizacionCrear,
  EstadoCotizacion,
  EstadoOportunidad,
  Insistencia,
  ItemCotizacion,
  Oportunidad,
  OportunidadCrear,
  OportunidadEditar,
  OportunidadPerder,
} from "../modelos";
import { respuestaProblema } from "./problema";
import { auditoriaMock } from "./viajes";

/** Ana Pérez, la empleada de `usuariosPorRol`; no se importa de ahí porque `index` carga este archivo. */
const responsable_id = "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03";
const camila = "3c1f6d2e-8a47-4b19-9e53-7d0a2b4c6e11";
const joaquin = "d4a8c6e2-5f19-4073-8b3a-2e1c9d7f0b33";
const sosa = "9e5b0a74-1c3d-4f68-a2b9-5c8d7e0f1a22";

/** Id de cada oportunidad ficticia según su estado; el de `cotizada` es el de las alertas ficticias (Joaquín Ramos, Europa). */
export const idOportunidadMock = {
  nueva: "6b2d9f08-7e41-4c5a-8d13-0a9e3c5b7f41",
  en_gestion: "6b2d9f08-7e41-4c5a-8d13-0a9e3c5b7f42",
  cotizada: "6b2d9f08-7e41-4c5a-8d13-0a9e3c5b7f44",
  ganada: "6b2d9f08-7e41-4c5a-8d13-0a9e3c5b7f45",
  perdida: "6b2d9f08-7e41-4c5a-8d13-0a9e3c5b7f46",
} as const satisfies Record<EstadoOportunidad, string>;

/** Punta Cana de Camila, ganada: la del historial del cliente (el viaje finalizado de `viajesMock`). */
const idPuntaCanaGanada = "6b2d9f08-7e41-4c5a-8d13-0a9e3c5b7f47";

/** Id de cada cotización ficticia: dos versiones de Europa (la primera rechazada, la segunda enviada) y la aceptada de Brasil. */
export const idCotizacionMock = {
  europa_v1: "2f8c1d4e-9a30-4b57-8e62-5d7a0c3b1f51",
  europa_v2: "2f8c1d4e-9a30-4b57-8e62-5d7a0c3b1f52",
  brasil: "2f8c1d4e-9a30-4b57-8e62-5d7a0c3b1f53",
} as const;

function oportunidad(
  parcial: Partial<Oportunidad> & Pick<Oportunidad, "id" | "cliente_id" | "destino_consultado">,
): Oportunidad {
  return {
    ...auditoriaMock,
    responsable_id,
    canal: "whatsapp",
    fecha_desde_tentativa: null,
    fecha_hasta_tentativa: null,
    pasajeros: 2,
    estado: "nueva",
    motivo_perdida: null,
    motivo_perdida_detalle: null,
    notas: null,
    ...parcial,
  };
}

/** Un embudo ficticio con una oportunidad en cada uno de los cinco estados (CU-05). */
export const oportunidadesMock: Oportunidad[] = [
  oportunidad({
    id: idOportunidadMock.nueva,
    cliente_id: camila,
    destino_consultado: "Cusco",
    canal: "instagram",
    fecha_desde_tentativa: "2027-03-05",
    fecha_hasta_tentativa: "2027-03-15",
    notas: "Escribió por Instagram; quiere conocer Machu Picchu.",
  }),
  oportunidad({
    id: idOportunidadMock.en_gestion,
    cliente_id: sosa,
    destino_consultado: "Mendoza",
    canal: "presencial",
    pasajeros: 4,
    estado: "en_gestion",
    notas: "Familia con dos chicos; pide opciones con bodegas.",
  }),
  oportunidad({
    id: idOportunidadMock.cotizada,
    cliente_id: joaquin,
    destino_consultado: "Europa",
    fecha_desde_tentativa: "2027-05-10",
    fecha_hasta_tentativa: "2027-05-30",
    estado: "cotizada",
    notas: "Compara con otra agencia; insistir esta semana.",
  }),
  oportunidad({
    id: idOportunidadMock.ganada,
    cliente_id: sosa,
    destino_consultado: "Brasil",
    pasajeros: 5,
    fecha_desde_tentativa: "2026-11-01",
    fecha_hasta_tentativa: "2026-11-15",
    estado: "ganada",
  }),
  oportunidad({
    id: idPuntaCanaGanada,
    cliente_id: camila,
    destino_consultado: "Punta Cana",
    fecha_desde_tentativa: "2026-09-01",
    fecha_hasta_tentativa: "2026-09-15",
    estado: "ganada",
  }),
  oportunidad({
    id: idOportunidadMock.perdida,
    cliente_id: camila,
    destino_consultado: "Miami",
    canal: "instagram",
    estado: "perdida",
    motivo_perdida: "precio",
    notas: "Encontró un paquete más barato.",
  }),
];

/** Suma de los ítems con dos decimales (DEC-0007): lo calcula la API, no el cliente. */
export function totalDeItems(items: ItemCotizacion[]): string {
  return items.reduce((suma, i) => suma + Number(i.precio), 0).toFixed(2);
}

function cotizacion(
  parcial: Partial<Cotizacion> & Pick<Cotizacion, "id" | "oportunidad_id" | "items">,
): Cotizacion {
  return {
    ...auditoriaMock,
    fecha: "2026-10-12",
    moneda: "ARS",
    total: totalDeItems(parcial.items),
    validez_hasta: "2026-11-12",
    estado: "borrador",
    ...parcial,
  };
}

/** Cotizaciones ficticias: las versiones de Europa (de la más antigua a la más reciente) y la aceptada de Brasil, en USD. */
export const cotizacionesMock: Cotizacion[] = [
  cotizacion({
    id: idCotizacionMock.europa_v1,
    oportunidad_id: idOportunidadMock.cotizada,
    estado: "rechazada",
    items: [
      { concepto: "Aéreo Buenos Aires - Madrid", precio: "2100000.00" },
      { concepto: "Alojamiento 20 noches", precio: "2400000.00" },
      { concepto: "Traslados y excursiones", precio: "300000.00" },
    ],
  }),
  cotizacion({
    id: idCotizacionMock.europa_v2,
    oportunidad_id: idOportunidadMock.cotizada,
    fecha: "2026-10-20",
    validez_hasta: "2026-11-20",
    estado: "enviada",
    items: [
      { concepto: "Aéreo Buenos Aires - Madrid", precio: "2100000.00" },
      { concepto: "Alojamiento 18 noches", precio: "2160000.00" },
      { concepto: "Traslados y excursiones", precio: "250000.00" },
    ],
  }),
  cotizacion({
    id: idCotizacionMock.brasil,
    oportunidad_id: idOportunidadMock.ganada,
    moneda: "USD",
    fecha: "2026-09-20",
    validez_hasta: "2026-10-20",
    estado: "aceptada",
    items: [
      { concepto: "Aéreo", precio: "1500.00" },
      { concepto: "Alojamiento", precio: "1700.00" },
    ],
  }),
];

const BASE = "*/api/oportunidades";
const BASE_COTIZACIONES = "*/api/cotizaciones";

export function oportunidadNoEncontrada() {
  return respuestaProblema(404, "No encontrado", {
    detail: "La oportunidad no existe o no la podés ver.",
  });
}

export function cotizacionNoEncontrada() {
  return respuestaProblema(404, "No encontrado", {
    detail: "La cotización no existe o no la podés ver.",
  });
}

function conflicto(detail: string) {
  return respuestaProblema(409, "Conflicto", { detail });
}

function pagina(todos: unknown[], url: URL) {
  const numero = Number(url.searchParams.get("pagina") ?? 1);
  const porPagina = Number(url.searchParams.get("por_pagina") ?? 20);
  const salto = (numero - 1) * porPagina;
  return HttpResponse.json({
    items: todos.slice(salto, salto + porPagina),
    total: todos.length,
    pagina: numero,
    por_pagina: porPagina,
  });
}

/** `POST /api/oportunidades/{id}/{accion}`: los estados de partida admitidos y el que resulta (CU-05). */
function transicion(
  accion: string,
  desde: EstadoOportunidad[],
  hacia: EstadoOportunidad,
  limpiar: Partial<Oportunidad> = {},
): RequestHandler {
  return http.post(`${BASE}/:id/${accion}`, ({ params }) => {
    const o = oportunidadesMock.find((x) => x.id === params["id"]);
    if (!o) return oportunidadNoEncontrada();
    if (!desde.includes(o.estado)) {
      return conflicto(`No se puede ${accion.replace("-", " ")} una oportunidad ${o.estado}.`);
    }
    return HttpResponse.json({ ...o, ...limpiar, estado: hacia });
  });
}

/** `POST /api/cotizaciones/{id}/{accion}`: el estado de partida exigido y el que resulta (CU-06). */
function transicionCotizacion(
  accion: string,
  desde: EstadoCotizacion,
  hacia: EstadoCotizacion,
): RequestHandler {
  return http.post(`${BASE_COTIZACIONES}/:id/${accion}`, ({ params }) => {
    const c = cotizacionesMock.find((x) => x.id === params["id"]);
    if (!c) return cotizacionNoEncontrada();
    if (c.estado !== desde) return conflicto(`No se puede ${accion} una cotización ${c.estado}.`);
    return HttpResponse.json({ ...c, estado: hacia });
  });
}

/** Alerta de insistencia que crea `POST /api/oportunidades/{id}/insistencias` (CU-05). */
function alertaDeInsistencia(o: Oportunidad, datos: Insistencia): Alerta {
  return {
    ...auditoriaMock,
    id: crypto.randomUUID(),
    propietario_id: o.responsable_id,
    viaje_id: null,
    pago_id: null,
    oportunidad_id: o.id,
    cliente_id: null,
    viaje_hotel_id: null,
    tipo: "insistencia",
    descripcion: datos.descripcion,
    fecha: datos.fecha,
    estado: "pendiente",
    resuelta_en: null,
    cerrada_por_cancelacion: false,
    responsable: { id: o.responsable_id, nombre: "Ana Pérez" },
    contexto: {
      cliente: null,
      oportunidad: { id: o.id, destino_consultado: o.destino_consultado, estado: o.estado },
      viaje: null,
      pago: null,
    },
  };
}

/** Handlers MSW de oportunidades y cotizaciones (CU-04, CU-05, CU-06). */
export const manejadoresOportunidades: RequestHandler[] = [
  http.get(BASE, ({ request }) => {
    const url = new URL(request.url);
    const estado = url.searchParams.get("estado");
    const clienteId = url.searchParams.get("cliente_id");
    const mios = url.searchParams.get("mios") === "true";
    return pagina(
      oportunidadesMock.filter(
        (o) =>
          (!estado || o.estado === estado) &&
          (!clienteId || o.cliente_id === clienteId) &&
          (!mios || o.responsable_id === responsable_id),
      ),
      url,
    );
  }),

  http.post(BASE, async ({ request }) => {
    const datos = (await request.json()) as OportunidadCrear;
    return HttpResponse.json(
      oportunidad({
        id: crypto.randomUUID(),
        cliente_id: datos.cliente_id,
        canal: datos.canal,
        destino_consultado: datos.destino_consultado,
        fecha_desde_tentativa: datos.fecha_desde_tentativa ?? null,
        fecha_hasta_tentativa: datos.fecha_hasta_tentativa ?? null,
        pasajeros: datos.pasajeros,
        notas: datos.notas ?? null,
      }),
      { status: 201 },
    );
  }),

  http.get(`${BASE}/:id`, ({ params }) => {
    const o = oportunidadesMock.find((x) => x.id === params["id"]);
    return o ? HttpResponse.json(o) : oportunidadNoEncontrada();
  }),

  http.patch(`${BASE}/:id`, async ({ params, request }) => {
    const o = oportunidadesMock.find((x) => x.id === params["id"]);
    if (!o) return oportunidadNoEncontrada();
    const cambios = (await request.json()) as OportunidadEditar;
    return HttpResponse.json({ ...o, ...cambios });
  }),

  transicion("en-gestion", ["nueva"], "en_gestion"),
  transicion("reactivar", ["perdida"], "en_gestion", {
    motivo_perdida: null,
    motivo_perdida_detalle: null,
  }),
  transicion("ganar", ["nueva", "en_gestion", "cotizada"], "ganada"),

  http.post(`${BASE}/:id/perder`, async ({ params, request }) => {
    const o = oportunidadesMock.find((x) => x.id === params["id"]);
    if (!o) return oportunidadNoEncontrada();
    if (o.estado === "ganada" || o.estado === "perdida") {
      return conflicto(`No se puede perder una oportunidad ${o.estado}.`);
    }
    const datos = (await request.json()) as OportunidadPerder;
    if (datos.motivo_perdida === "otro" && !datos.motivo_perdida_detalle) {
      return respuestaProblema(422, "Datos inválidos", {
        detail: "Contanos el motivo cuando es «otro».",
      });
    }
    return HttpResponse.json({
      ...o,
      estado: "perdida",
      motivo_perdida: datos.motivo_perdida,
      motivo_perdida_detalle: datos.motivo_perdida_detalle ?? null,
    });
  }),

  http.post(`${BASE}/:id/insistencias`, async ({ params, request }) => {
    const o = oportunidadesMock.find((x) => x.id === params["id"]);
    if (!o) return oportunidadNoEncontrada();
    return HttpResponse.json(alertaDeInsistencia(o, (await request.json()) as Insistencia), {
      status: 201,
    });
  }),

  http.get(`${BASE}/:id/cotizaciones`, ({ params, request }) => {
    if (!oportunidadesMock.some((x) => x.id === params["id"])) return oportunidadNoEncontrada();
    const versiones = cotizacionesMock.filter((c) => c.oportunidad_id === params["id"]);
    return pagina([...versiones].reverse(), new URL(request.url));
  }),

  http.post(`${BASE}/:id/cotizaciones`, async ({ params, request }) => {
    const o = oportunidadesMock.find((x) => x.id === params["id"]);
    if (!o) return oportunidadNoEncontrada();
    if (o.estado === "ganada" || o.estado === "perdida") {
      return conflicto(`No se cotiza una oportunidad ${o.estado}.`);
    }
    const datos = (await request.json()) as CotizacionCrear;
    return HttpResponse.json(
      cotizacion({
        id: crypto.randomUUID(),
        oportunidad_id: o.id,
        moneda: datos.moneda,
        items: datos.items,
      }),
      { status: 201 },
    );
  }),

  http.get(`${BASE_COTIZACIONES}/:id`, ({ params }) => {
    const c = cotizacionesMock.find((x) => x.id === params["id"]);
    return c ? HttpResponse.json(c) : cotizacionNoEncontrada();
  }),

  http.get(`${BASE_COTIZACIONES}/:id/documento`, ({ params }) => {
    if (!cotizacionesMock.some((x) => x.id === params["id"])) return cotizacionNoEncontrada();
    return new HttpResponse("%PDF-1.4\n%%EOF\n", {
      headers: { "content-type": "application/pdf" },
    });
  }),

  transicionCotizacion("enviar", "borrador", "enviada"),
  transicionCotizacion("aceptar", "enviada", "aceptada"),
  transicionCotizacion("rechazar", "enviada", "rechazada"),
];
