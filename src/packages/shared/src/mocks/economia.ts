import { http, HttpResponse, type RequestHandler } from "msw";
import type {
  CobroRegistrar,
  EconomiaRegistrada,
  EconomiaViaje,
  Pago,
  PagoDividir,
  PagoReprogramar,
  PlanDePagos,
  Viaje,
} from "../modelos";
import { HOY_MOCK } from "./alertas";
import { respuestaProblema } from "./problema";
import { auditoriaMock, ganancia, idViajeMock, viajeNoEncontrado, viajesMock } from "./viajes";

/** Un pago pendiente del plan; `cobrado` y `anulado` lo pasan a los otros estados. */
function pendiente(
  id: string,
  viaje_id: string,
  tipo: Pago["tipo"],
  monto: string,
  vencimiento: string,
): Pago {
  return {
    ...auditoriaMock,
    id,
    viaje_id,
    tipo,
    monto,
    vencimiento,
    estado: "pendiente",
    forma_pago: null,
    moneda_pago: null,
    tipo_cambio: null,
    monto_cobrado: null,
    fecha_cobro: null,
  };
}

/** Cobrado en la moneda del viaje, por transferencia, el día del vencimiento. */
function cobrado(pago: Pago, parcial: Partial<Pago> = {}): Pago {
  return {
    ...pago,
    estado: "pagado",
    forma_pago: "transferencia",
    moneda_pago: parcial.moneda_pago ?? "ARS",
    monto_cobrado: pago.monto,
    fecha_cobro: pago.vencimiento,
    ...parcial,
  };
}

function anulado(pago: Pago): Pago {
  return { ...pago, estado: "anulado" };
}

/** Seña, cuota y saldo de un viaje, todos pendientes, con su monto y su vencimiento. */
function plan(
  viaje_id: string,
  id: string,
  cuotas: [[string, string], [string, string], [string, string]],
): Pago[] {
  return cuotas.map(([monto, vencimiento], i) =>
    pendiente(
      `${id}${String(i + 1)}`,
      viaje_id,
      (["sena", "cuota", "saldo"] as const)[i] ?? "saldo",
      monto,
      vencimiento,
    ),
  );
}

const planVendido = plan(idViajeMock.vendido, "d2e3f4a5-b6c7-4d8e-9f01-2a3b4c5d6e0", [
  ["600000.00", "2026-10-10"],
  ["600000.00", "2026-12-10"],
  ["600000.00", "2027-01-05"],
]);
const planConfirmado = plan(idViajeMock.confirmado, "d2e3f4a5-b6c7-4d8e-9f01-2a3b4c5d6e1", [
  ["1000.00", "2026-09-20"],
  ["1200.00", "2026-10-10"],
  ["1000.00", "2026-10-20"],
]);
const planEnCurso = plan(idViajeMock.en_curso, "d2e3f4a5-b6c7-4d8e-9f01-2a3b4c5d6e2", [
  ["300000.00", "2026-08-15"],
  ["300000.00", "2026-09-15"],
  ["300000.00", "2026-10-10"],
]);
const planFinalizado = plan(idViajeMock.finalizado, "d2e3f4a5-b6c7-4d8e-9f01-2a3b4c5d6e3", [
  ["800000.00", "2026-06-01"],
  ["800000.00", "2026-07-01"],
  ["800000.00", "2026-08-15"],
]);
const planCancelado = plan(idViajeMock.cancelado, "d2e3f4a5-b6c7-4d8e-9f01-2a3b4c5d6e4", [
  ["200000.00", "2026-09-01"],
  ["200000.00", "2026-10-20"],
  ["200000.00", "2026-11-20"],
]);
const planReservado = plan(idViajeMock.reservado, "d2e3f4a5-b6c7-4d8e-9f01-2a3b4c5d6e5", [
  ["400000.00", "2026-11-01"],
  ["300000.00", "2026-12-15"],
  ["300000.00", "2027-01-15"],
]);

/** El plan de pagos de cada viaje ficticio, por id de viaje: pendientes, cobrados y anulados. */
export const pagosPorViajeMock: Record<string, Pago[]> = {
  [idViajeMock.reservado]: planReservado,
  [idViajeMock.vendido]: planVendido.map((p, i) => (i === 0 ? cobrado(p) : p)),
  [idViajeMock.confirmado]: planConfirmado.map((p, i) =>
    // La seña se cobró en pesos al dólar del día: el servidor guarda el tipo de cambio (DEC-0013).
    i === 0
      ? cobrado(p, { moneda_pago: "ARS", tipo_cambio: "1200.0000", monto_cobrado: "1200000.00" })
      : cobrado(p, { moneda_pago: "USD", forma_pago: i === 1 ? "efectivo" : "transferencia" }),
  ),
  [idViajeMock.en_curso]: planEnCurso.map((p) => cobrado(p)),
  [idViajeMock.finalizado]: planFinalizado.map((p) => cobrado(p)),
  [idViajeMock.cancelado]: planCancelado.map((p, i) => (i === 0 ? cobrado(p) : anulado(p))),
};

const todosLosPagos = Object.values(pagosPorViajeMock).flat();

const BASE = "*/api/pagos";

function viajeNoModificable(viaje: Viaje, detail: string) {
  return respuestaProblema(409, "Conflicto", {
    detail: `${detail} (el viaje está ${viaje.estado}).`,
  });
}

function pagoNoEncontrado() {
  return respuestaProblema(404, "No encontrado", {
    detail: "El pago no existe o no lo podés ver.",
  });
}

function datosInvalidos(detail: string) {
  return respuestaProblema(422, "Datos inválidos", { detail });
}

function conflicto(detail: string) {
  return respuestaProblema(409, "Conflicto", { detail });
}

const pesos = (n: number) => n.toFixed(2);

/** Un pago sin cobrar vence si su fecha ya pasó (EST-Pago T6). */
const sinCobrar = (vencimiento: string): Pago["estado"] =>
  vencimiento < HOY_MOCK ? "vencido" : "pendiente";

/** El pago y su viaje; `undefined` si alguno no existe. */
function buscar(id: string | readonly string[] | undefined) {
  const pago = todosLosPagos.find((p) => p.id === id);
  const viaje = viajesMock.find((v) => v.id === pago?.viaje_id);
  return pago && viaje ? { pago, viaje } : undefined;
}

/** Handlers MSW de economía y cobros (CU-10, CU-11, CU-12). */
export const manejadoresEconomia: RequestHandler[] = [
  http.put("*/api/viajes/:id/economia", async ({ params, request }) => {
    const viaje = viajesMock.find((v) => v.id === params["id"]);
    if (!viaje) return viajeNoEncontrado();
    if (viaje.estado === "cancelado" || viaje.estado === "finalizado") {
      return viajeNoModificable(viaje, "No se edita la economía");
    }
    const datos = (await request.json()) as EconomiaViaje;
    return HttpResponse.json<EconomiaRegistrada>({
      ...viaje,
      precio_venta: datos.precio_venta,
      costo: datos.costo,
      ...ganancia(datos.precio_venta, datos.costo),
      operador_id: datos.operador_id ?? viaje.operador_id,
      vendedor_id: datos.vendedor_id ?? viaje.vendedor_id,
      comision_tipo: datos.comision_tipo ?? viaje.comision_tipo,
      comision_vendedor: datos.comision_vendedor ?? viaje.comision_vendedor,
      advertencias: [],
    });
  }),

  http.get("*/api/viajes/:id/pagos", ({ params }) => {
    const pagos = pagosPorViajeMock[String(params["id"])];
    return pagos ? HttpResponse.json(pagos) : viajeNoEncontrado();
  }),

  http.put("*/api/viajes/:id/pagos", async ({ params, request }) => {
    const viaje = viajesMock.find((v) => v.id === params["id"]);
    if (!viaje) return viajeNoEncontrado();
    const { pagos } = (await request.json()) as PlanDePagos;
    // Los pagos cobrados y los anulados se conservan; solo se reemplazan los sin cobrar (CU-11 A5).
    const conservados = (pagosPorViajeMock[viaje.id] ?? []).filter(
      (p) => p.estado === "pagado" || p.estado === "anulado",
    );
    const cobrados = conservados.filter((p) => p.estado === "pagado");
    const suma = [...cobrados.map((p) => p.monto), ...pagos.map((p) => p.monto)].reduce(
      (total, monto) => total + Number(monto),
      0,
    );
    if (pesos(suma) !== pesos(Number(viaje.precio_venta))) {
      return datosInvalidos("La suma de los pagos tiene que ser igual al precio de venta.");
    }
    const nuevos = pagos.map((p) => {
      const pago = pendiente(crypto.randomUUID(), viaje.id, p.tipo, p.monto, p.vencimiento);
      return { ...pago, estado: sinCobrar(p.vencimiento) };
    });
    return HttpResponse.json([...conservados, ...nuevos]);
  }),

  http.patch(`${BASE}/:id`, async ({ params, request }) => {
    const encontrado = buscar(params["id"]);
    if (!encontrado) return pagoNoEncontrado();
    if (encontrado.pago.estado === "pagado" || encontrado.pago.estado === "anulado") {
      return conflicto(`No se reprograma un pago ${encontrado.pago.estado}.`);
    }
    const { vencimiento } = (await request.json()) as PagoReprogramar;
    if (vencimiento <= HOY_MOCK) {
      return datosInvalidos("El nuevo vencimiento tiene que ser posterior a hoy.");
    }
    return HttpResponse.json({ ...encontrado.pago, estado: sinCobrar(vencimiento), vencimiento });
  }),

  http.post(`${BASE}/:id/anular`, ({ params }) => {
    const encontrado = buscar(params["id"]);
    if (!encontrado) return pagoNoEncontrado();
    if (encontrado.pago.estado === "pagado" || encontrado.pago.estado === "anulado") {
      return conflicto(`No se anula un pago ${encontrado.pago.estado}.`);
    }
    return HttpResponse.json(anulado(encontrado.pago));
  }),

  http.post(`${BASE}/:id/dividir`, async ({ params, request }) => {
    const encontrado = buscar(params["id"]);
    if (!encontrado) return pagoNoEncontrado();
    const { pago } = encontrado;
    if (pago.estado !== "pendiente" && pago.estado !== "vencido") {
      return conflicto(`No se divide un pago ${pago.estado}.`);
    }
    const datos = (await request.json()) as PagoDividir;
    const ahora = Number(datos.monto_ahora);
    if (ahora <= 0 || ahora >= Number(pago.monto)) {
      return datosInvalidos("El monto de ahora tiene que ser menor que el del pago.");
    }
    return HttpResponse.json(
      [
        { ...pago, monto: datos.monto_ahora },
        {
          ...pago,
          id: crypto.randomUUID(),
          tipo: "cuota",
          monto: pesos(Number(pago.monto) - ahora),
          vencimiento: datos.vencimiento_resto,
        },
      ],
      { status: 201 },
    );
  }),

  http.post(`${BASE}/:id/cobrar`, async ({ params, request }) => {
    const encontrado = buscar(params["id"]);
    if (!encontrado) return pagoNoEncontrado();
    const { pago, viaje } = encontrado;
    if (pago.estado !== "pendiente" && pago.estado !== "vencido") {
      return conflicto(`No se cobra un pago ${pago.estado}.`);
    }
    const datos = (await request.json()) as CobroRegistrar;
    const otraMoneda = datos.moneda_pago !== viaje.moneda;
    if (otraMoneda && !datos.tipo_cambio) {
      return datosInvalidos(
        "Falta el tipo de cambio: la moneda del cobro difiere de la del viaje.",
      );
    }
    // El servidor convierte con el tipo de cambio: pesos por dólar (CU-12 A0).
    const cambio = Number(datos.tipo_cambio ?? 1);
    const monto = Number(pago.monto);
    const cobrado = !otraMoneda
      ? monto
      : datos.moneda_pago === "ARS"
        ? monto * cambio
        : monto / cambio;
    return HttpResponse.json({
      ...pago,
      estado: "pagado",
      forma_pago: datos.forma_pago,
      moneda_pago: datos.moneda_pago,
      tipo_cambio: otraMoneda ? (datos.tipo_cambio ?? null) : null,
      monto_cobrado: pesos(cobrado),
      fecha_cobro: datos.fecha_cobro,
    });
  }),

  http.post(`${BASE}/:id/revertir-cobro`, ({ params }) => {
    const encontrado = buscar(params["id"]);
    if (!encontrado) return pagoNoEncontrado();
    if (encontrado.pago.estado !== "pagado") {
      return conflicto(`No hay un cobro que revertir en un pago ${encontrado.pago.estado}.`);
    }
    return HttpResponse.json({
      ...encontrado.pago,
      estado: sinCobrar(encontrado.pago.vencimiento),
      forma_pago: null,
      moneda_pago: null,
      tipo_cambio: null,
      monto_cobrado: null,
      fecha_cobro: null,
    });
  }),
];
