import { http, HttpResponse, type RequestHandler } from "msw";
import type {
  Cancelacion,
  ConfirmarReserva,
  EstadoViaje,
  Tramo,
  TramoCrear,
  TramoEditar,
  Viaje,
} from "../modelos";
import { respuestaProblema } from "./problema";

/** Ana Pérez, la empleada de `usuariosPorRol`; no se importa de ahí porque `index` carga este archivo. */
const responsable_id = "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03";
export const auditoriaMock = {
  created_by: responsable_id,
  updated_by: responsable_id,
  created_at: "2026-09-01T12:00:00Z",
  updated_at: "2026-09-01T12:00:00Z",
};

const camila = "3c1f6d2e-8a47-4b19-9e53-7d0a2b4c6e11";
const joaquin = "d4a8c6e2-5f19-4073-8b3a-2e1c9d7f0b33";
const sosa = "9e5b0a74-1c3d-4f68-a2b9-5c8d7e0f1a22";
const operador_id = "c8b7a6f5-e4d3-4c2b-9a10-f9e8d7c6b5a4";
const vendedor_id = responsable_id;

/** Id de cada viaje ficticio según su estado; el de `confirmado` es el de las alertas ficticias (Familia Sosa, Brasil) y el de `finalizado`, el de Camila (Punta Cana). */
export const idViajeMock = {
  reservado: "7a1e5c10-2b3d-4e5f-8a6b-1c2d3e4f5a01",
  vendido: "7a1e5c10-2b3d-4e5f-8a6b-1c2d3e4f5a02",
  confirmado: "e5f6a7b8-c9d0-4e1f-a2b3-c4d5e6f7a812",
  en_curso: "7a1e5c10-2b3d-4e5f-8a6b-1c2d3e4f5a04",
  finalizado: "f0a7c3d9-2b64-4e18-9c5d-8b1e6a4d2f55",
  cancelado: "7a1e5c10-2b3d-4e5f-8a6b-1c2d3e4f5a06",
} as const;

/** Nombre de los clientes ficticios de `clientesMock`, para `cliente_nombre` (no se importa: ver arriba). */
const nombreDeCliente: Record<string, string> = {
  [camila]: "Camila Benítez",
  [sosa]: "Familia Sosa",
  [joaquin]: "Joaquín Ramos",
};

/** Nombre de los destinos ficticios de `destinosMock`, para `destino_nombre` (ídem). */
const nombreDeDestino: Record<string, string> = {
  "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e01": "Europa",
  "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e02": "Cusco",
  "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e03": "Brasil",
  "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e04": "Salta",
  "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e05": "Punta Cana",
  "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e06": "Lisboa",
  "3f6a1c20-8b4d-4e57-a9c1-5d2e7b9f0a11": "Bariloche",
  "9c2d4e61-1a7f-4b38-8d05-6e3f1a2b4c22": "Cancún",
  "d4b81f93-5c2e-4a60-b7d9-0f8e6c1a3d33": "Roma",
};

function nombrePorId(nombres: Record<string, string>, id: string): string {
  const nombre = nombres[id];
  if (nombre === undefined) throw new Error(`Falta el nombre de ${id} en los mocks de viajes`);
  return nombre;
}

/** Un viaje ficticio: ARS, ganancia 20 %, comisión del 10 % sobre la ganancia, sin cobros. */
function viaje(parcial: Partial<Viaje> & Pick<Viaje, "id" | "cliente_id" | "destino_id">): Viaje {
  return {
    ...auditoriaMock,
    cliente_nombre: nombrePorId(nombreDeCliente, parcial.cliente_id),
    destino_nombre: nombrePorId(nombreDeDestino, parcial.destino_id),
    oportunidad_id: null,
    operador_id,
    responsable_id,
    vendedor_id,
    fecha_salida: "2027-02-10",
    fecha_regreso: "2027-02-20",
    categoria: "individual",
    estado: "reservado",
    estado_previo: null,
    motivo_cancelacion: null,
    fecha_cancelacion: null,
    moneda: "ARS",
    precio_venta: "1000000.00",
    costo: "800000.00",
    ganancia: "200000.00",
    margen: "0.2000",
    comision_tipo: "porcentaje",
    comision_vendedor: "10.00",
    saldo_pendiente: "1000000.00",
    porcentaje_pagado: "0.0000",
    ...parcial,
  };
}

/** Un viaje ficticio en cada uno de los seis estados (CU-08), en el orden del ciclo de vida. */
export const viajesMock: Viaje[] = [
  viaje({
    id: idViajeMock.reservado,
    cliente_id: joaquin,
    destino_id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e01",
    estado: "reservado",
  }),
  viaje({
    id: idViajeMock.vendido,
    cliente_id: camila,
    destino_id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e02",
    estado: "vendido",
    fecha_salida: "2027-01-10",
    fecha_regreso: "2027-01-24",
    precio_venta: "1800000.00",
    costo: "1500000.00",
    ganancia: "300000.00",
    margen: "0.1667",
    comision_tipo: "importe",
    comision_vendedor: "25000.00",
    saldo_pendiente: "1200000.00",
    porcentaje_pagado: "0.3333",
  }),
  // El viaje de la Familia Sosa a Brasil es el de las alertas ficticias; en USD, cobrado en pesos y en dólares.
  viaje({
    id: idViajeMock.confirmado,
    cliente_id: sosa,
    destino_id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e03",
    estado: "confirmado",
    categoria: "grupal",
    fecha_salida: "2026-11-01",
    fecha_regreso: "2026-11-15",
    moneda: "USD",
    precio_venta: "3200.00",
    costo: "2600.00",
    ganancia: "600.00",
    margen: "0.1875",
    comision_tipo: "importe",
    comision_vendedor: "150.00",
    saldo_pendiente: "0.00",
    porcentaje_pagado: "1.0000",
  }),
  viaje({
    id: idViajeMock.en_curso,
    cliente_id: camila,
    destino_id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e04",
    estado: "en_curso",
    fecha_salida: "2026-10-20",
    fecha_regreso: "2026-10-30",
    precio_venta: "900000.00",
    costo: "700000.00",
    ganancia: "200000.00",
    margen: "0.2222",
    comision_vendedor: "8.00",
    saldo_pendiente: "0.00",
    porcentaje_pagado: "1.0000",
  }),
  // El viaje de Camila a Punta Cana es el de las alertas ficticias.
  viaje({
    id: idViajeMock.finalizado,
    cliente_id: camila,
    destino_id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e05",
    estado: "finalizado",
    fecha_salida: "2026-09-01",
    fecha_regreso: "2026-09-15",
    precio_venta: "2400000.00",
    costo: "2000000.00",
    ganancia: "400000.00",
    margen: "0.1667",
    saldo_pendiente: "0.00",
    porcentaje_pagado: "1.0000",
  }),
  viaje({
    id: idViajeMock.cancelado,
    cliente_id: joaquin,
    destino_id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e06",
    estado: "cancelado",
    estado_previo: "vendido",
    motivo_cancelacion: "El cliente desistió por motivos laborales.",
    fecha_cancelacion: "2026-10-18",
    fecha_salida: "2026-12-05",
    fecha_regreso: "2026-12-12",
    precio_venta: "600000.00",
    costo: "480000.00",
    ganancia: "120000.00",
    comision_tipo: "importe",
    comision_vendedor: "12000.00",
    saldo_pendiente: "0.00",
    porcentaje_pagado: "0.3333",
  }),
];

/** Itinerario ficticio del viaje de la Familia Sosa, con los nombres de CU-09 y del ER. */
export const tramosMock: Tramo[] = [
  {
    id: "b3c4d5e6-f7a8-4b9c-8d0e-1f2a3b4c5d01",
    viaje_id: idViajeMock.confirmado,
    hotel_id: "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a01",
    check_in: "2026-11-01",
    check_out: "2026-11-08",
    orden: 1,
    vencimiento_pago_proveedor: "2026-10-15",
    pago_proveedor_realizado: true,
  },
  {
    id: "b3c4d5e6-f7a8-4b9c-8d0e-1f2a3b4c5d02",
    viaje_id: idViajeMock.confirmado,
    hotel_id: "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a02",
    check_in: "2026-11-08",
    check_out: "2026-11-15",
    orden: 2,
    vencimiento_pago_proveedor: "2026-10-30",
    pago_proveedor_realizado: false,
  },
];

const BASE = "*/api/viajes";

export function viajeNoEncontrado() {
  return respuestaProblema(404, "No encontrado", {
    detail: "El viaje no existe o no lo podés ver.",
  });
}

function viajeDelTramo(tramo: Tramo) {
  return viajesMock.find((v) => v.id === tramo.viaje_id);
}

function itinerarioCancelado() {
  return conflicto("No se cambia el itinerario de un viaje cancelado.");
}

function conflicto(detail: string) {
  return respuestaProblema(409, "Conflicto", { detail });
}

/** `POST /api/viajes/{id}/{accion}`: el estado de partida exigido y el que resulta (CU-08, CU-27). */
function transicion(
  accion: string,
  desde: EstadoViaje,
  hacia: (v: Viaje) => Partial<Viaje>,
): RequestHandler {
  return http.post(`${BASE}/:id/${accion}`, ({ params }) => {
    const v = viajesMock.find((x) => x.id === params["id"]);
    if (!v) return viajeNoEncontrado();
    if (v.estado !== desde) {
      return conflicto(`No se puede ${accion.replace("-", " ")} un viaje ${v.estado}.`);
    }
    return HttpResponse.json({ ...v, ...hacia(v) });
  });
}

/** Estados a los que se puede volver por un error de carga: `en_curso` y `finalizado` (EST-Viaje T7). */
const corregibles: Partial<Record<EstadoViaje, EstadoViaje>> = {
  en_curso: "confirmado",
  finalizado: "en_curso",
};

/** Ganancia y margen del viaje (DEC-0007); el margen es `null` con precio de venta 0. */
export function ganancia(precio_venta: string, costo: string) {
  const g = Number(precio_venta) - Number(costo);
  return {
    ganancia: g.toFixed(2),
    margen: Number(precio_venta) === 0 ? null : (g / Number(precio_venta)).toFixed(4),
  };
}

/** Handlers MSW de viajes e itinerario (CU-07, CU-08, CU-09, CU-27). */
export const manejadoresViajes: RequestHandler[] = [
  http.post("*/api/oportunidades/:id/confirmar-reserva", async ({ params, request }) => {
    const datos = (await request.json()) as ConfirmarReserva;
    if (datos.fecha_regreso < datos.fecha_salida) {
      return respuestaProblema(422, "Datos inválidos", {
        detail: "El regreso no puede ser anterior a la salida.",
      });
    }
    const { precio_venta, costo, operador_id: operador, vendedor_id: vendedor } = datos.economia;
    return HttpResponse.json(
      viaje({
        id: crypto.randomUUID(),
        oportunidad_id: String(params["id"]),
        cliente_id: joaquin,
        responsable_id: datos.responsable_id ?? responsable_id,
        operador_id: operador ?? operador_id,
        vendedor_id: vendedor ?? vendedor_id,
        destino_id: datos.destino_id,
        fecha_salida: datos.fecha_salida,
        fecha_regreso: datos.fecha_regreso,
        categoria: datos.categoria,
        moneda: datos.moneda ?? "ARS",
        precio_venta,
        costo,
        ...ganancia(precio_venta, costo),
        comision_tipo: datos.economia.comision_tipo ?? "porcentaje",
        comision_vendedor: datos.economia.comision_vendedor ?? "10.00",
        saldo_pendiente: precio_venta,
      }),
      { status: 201 },
    );
  }),

  http.get(BASE, ({ request }) => {
    const url = new URL(request.url);
    const estado = url.searchParams.get("estado");
    const clienteId = url.searchParams.get("cliente_id");
    const desde = url.searchParams.get("desde");
    const hasta = url.searchParams.get("hasta");
    const pagina = Number(url.searchParams.get("pagina") ?? 1);
    const porPagina = Number(url.searchParams.get("por_pagina") ?? 20);
    const filtrados = viajesMock.filter(
      (v) =>
        (!estado || v.estado === estado) &&
        (!clienteId || v.cliente_id === clienteId) &&
        (!desde || v.fecha_salida >= desde) &&
        (!hasta || v.fecha_salida <= hasta),
    );
    const salto = (pagina - 1) * porPagina;
    return HttpResponse.json({
      items: filtrados.slice(salto, salto + porPagina),
      total: filtrados.length,
      pagina,
      por_pagina: porPagina,
    });
  }),

  http.get(`${BASE}/:id`, ({ params }) => {
    const v = viajesMock.find((x) => x.id === params["id"]);
    return v ? HttpResponse.json(v) : viajeNoEncontrado();
  }),

  transicion("iniciar", "confirmado", () => ({ estado: "en_curso" })),
  transicion("finalizar", "en_curso", () => ({ estado: "finalizado" })),

  http.post(`${BASE}/:id/corregir-estado`, ({ params }) => {
    const v = viajesMock.find((x) => x.id === params["id"]);
    if (!v) return viajeNoEncontrado();
    const anterior = corregibles[v.estado];
    if (!anterior) return conflicto(`No se corrige el estado de un viaje ${v.estado}.`);
    return HttpResponse.json({ ...v, estado: anterior });
  }),

  http.post(`${BASE}/:id/cancelar`, async ({ params, request }) => {
    const v = viajesMock.find((x) => x.id === params["id"]);
    if (!v) return viajeNoEncontrado();
    if (v.estado === "cancelado" || v.estado === "finalizado") {
      return conflicto(`No se puede cancelar un viaje ${v.estado}.`);
    }
    const datos = (await request.json()) as Cancelacion;
    return HttpResponse.json({
      ...v,
      estado: "cancelado",
      estado_previo: v.estado,
      motivo_cancelacion: datos.motivo_cancelacion,
      fecha_cancelacion: datos.fecha_cancelacion,
    });
  }),

  transicion("revertir-cancelacion", "cancelado", (v) => ({
    estado: v.estado_previo ?? "reservado",
    estado_previo: null,
    motivo_cancelacion: null,
    fecha_cancelacion: null,
  })),

  http.get(`${BASE}/:id/itinerario`, ({ params }) => {
    if (!viajesMock.some((x) => x.id === params["id"])) return viajeNoEncontrado();
    return HttpResponse.json(tramosMock.filter((t) => t["viaje_id"] === params["id"]));
  }),

  http.post(`${BASE}/:id/itinerario`, async ({ params, request }) => {
    const v = viajesMock.find((x) => x.id === params["id"]);
    if (!v) return viajeNoEncontrado();
    if (v.estado === "cancelado") return itinerarioCancelado();
    const datos = (await request.json()) as TramoCrear;
    return HttpResponse.json(
      {
        vencimiento_pago_proveedor: null,
        ...datos,
        pago_proveedor_realizado: false,
        id: crypto.randomUUID(),
        viaje_id: v.id,
      },
      { status: 201 },
    );
  }),

  http.patch("*/api/tramos/:id", async ({ params, request }) => {
    const tramo = tramosMock.find((t) => t["id"] === params["id"]);
    if (!tramo) return tramoNoEncontrado();
    if (viajeDelTramo(tramo)?.estado === "cancelado") return itinerarioCancelado();
    return HttpResponse.json({ ...tramo, ...((await request.json()) as TramoEditar) });
  }),

  http.delete("*/api/tramos/:id", ({ params }) => {
    const tramo = tramosMock.find((t) => t["id"] === params["id"]);
    if (!tramo) return tramoNoEncontrado();
    if (viajeDelTramo(tramo)?.estado === "cancelado") return itinerarioCancelado();
    return new HttpResponse(null, { status: 204 });
  }),
];

function tramoNoEncontrado() {
  return respuestaProblema(404, "No encontrado", {
    detail: "El tramo no existe o no lo podés ver.",
  });
}
