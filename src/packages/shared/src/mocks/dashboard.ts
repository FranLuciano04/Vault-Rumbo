import { http, HttpResponse, type RequestHandler } from "msw";
import type {
  Dashboard,
  EventoCalendario,
  FiltrosCalendario,
  Reporte,
  ReporteCatalogo,
} from "../modelos";
import { pagosPorViajeMock } from "./economia";
import { usuariosMock } from "./m1";
import { respuestaProblema } from "./problema";
import { usuariosPorRol, type RolMock } from "./usuarios";
import { viajesMock } from "./viajes";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ars = (monto: string) => [{ moneda: "ARS" as const, monto }];

/** Los vencimientos de pago que siguen abiertos, del más cercano al más lejano. */
const vencimientosAbiertos = Object.values(pagosPorViajeMock)
  .flat()
  .filter((p) => p.estado === "pendiente" || p.estado === "vencido")
  .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));

const viajePorId = new Map(viajesMock.map((v) => [v.id, v] as const));

/** Dashboard ficticio de octubre de 2026 (CU-21), con sus vencimientos y viajes de los mocks de M6. */
export const dashboardMock: Dashboard = {
  desde: "2026-10-01",
  hasta: "2026-10-31",
  embudo: {
    etapas: [
      { estado: "nueva", cantidad: 4 },
      { estado: "en_gestion", cantidad: 6 },
      { estado: "cotizada", cantidad: 5 },
      { estado: "ganada", cantidad: 3 },
      { estado: "perdida", cantidad: 2 },
    ],
    tasa_conversion: "0.6000",
  },
  ventas: ars("5400000.00"),
  ventas_mensuales: [
    { mes: "2026-08-01", ventas: ars("3100000.00") },
    { mes: "2026-09-01", ventas: ars("4200000.00") },
    { mes: "2026-10-01", ventas: ars("5400000.00") },
  ],
  ganancia_estimada: ars("1080000.00"),
  margen: ars("0.2000"),
  comisiones: ars("108000.00"),
  ticket_promedio: ars("1800000.00"),
  cobrado: ars("2700000.00"),
  pendiente_de_cobrar: ars("2700000.00"),
  pendiente_de_pagar: ars("1900000.00"),
  proximos_vencimientos: vencimientosAbiertos.slice(0, 3).map((p) => ({
    pago_id: p.id,
    viaje_id: p.viaje_id,
    cliente_nombre: viajePorId.get(p.viaje_id)?.cliente_nombre ?? "",
    tipo: p.tipo,
    monto: p.monto,
    moneda: viajePorId.get(p.viaje_id)?.moneda ?? "ARS",
    vencimiento: p.vencimiento,
    estado: p.estado,
  })),
  viajes_proximos: viajesMock
    .filter((v) => v.estado === "confirmado" || v.estado === "vendido")
    .map((v) => ({
      viaje_id: v.id,
      cliente_nombre: v.cliente_nombre,
      destino_nombre: v.destino_nombre,
      fecha_salida: v.fecha_salida,
      estado: v.estado,
    })),
  consultas_pendientes: 10,
  presupuestos_abiertos: 5,
  reservas_confirmadas: 3,
  viajes_activos: 8,
  alertas_pendientes: 7,
  destinos_mas_vendidos: [
    {
      destino_id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e03",
      destino_nombre: "Brasil",
      viajes: 4,
      pasajeros: 9,
    },
    {
      destino_id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e01",
      destino_nombre: "Europa",
      viajes: 2,
      pasajeros: 4,
    },
  ],
  ventas_por_vendedor: [
    {
      vendedor_id: usuariosPorRol.empleado.id,
      vendedor_nombre: usuariosPorRol.empleado.nombre,
      viajes: 4,
      ventas: ars("3600000.00"),
      comisiones: ars("72000.00"),
    },
    {
      vendedor_id: usuariosPorRol.freelance.id,
      vendedor_nombre: usuariosPorRol.freelance.nombre,
      viajes: 2,
      ventas: ars("1800000.00"),
      comisiones: ars("36000.00"),
    },
  ],
  detalles: {
    consultas_pendientes: { seccion: "oportunidades", filtros: { estado: "nueva,en_gestion" } },
    presupuestos_abiertos: { seccion: "oportunidades", filtros: { estado: "cotizada" } },
    reservas_confirmadas: { seccion: "viajes", filtros: { estado: "confirmado" } },
    viajes_activos: { seccion: "viajes", filtros: { activo: "true" } },
    alertas_pendientes: { seccion: "alertas", filtros: { estado: "pendiente" } },
  },
};

/** Catálogo ficticio de reportes (CU-22). */
export const reportesCatalogoMock: ReporteCatalogo[] = [
  { id: "ventas", nombre: "Ventas del mes", descripcion: "Ventas totales por viaje del período." },
  {
    id: "ganancia",
    nombre: "Ganancia y rentabilidad",
    descripcion: "Ganancia y margen de los viajes vendidos.",
  },
  {
    id: "cobranzas",
    nombre: "Cobrado y pendiente de cobro",
    descripcion: "Pagos de pasajeros cobrados y por cobrar.",
  },
  {
    id: "ventas-por-destino",
    nombre: "Ventas por destino",
    descripcion: "Viajes e importes vendidos por destino.",
  },
];

/** Reporte ficticio del período (CU-22), con el mes anterior como comparación si se pide. */
export function reporteMock(id: string, comparar: boolean): Reporte | null {
  const catalogo = reportesCatalogoMock.find((r) => r.id === id);
  if (!catalogo) return null;
  return {
    id,
    nombre: catalogo.nombre,
    desde: "2026-10-01",
    hasta: "2026-10-31",
    comparar_desde: comparar ? "2026-09-01" : null,
    comparar_hasta: comparar ? "2026-09-30" : null,
    columnas: [
      { clave: "destino", titulo: "Destino", tipo: "texto", moneda: null },
      { clave: "viajes", titulo: "Viajes", tipo: "entero", moneda: null },
      { clave: "ventas", titulo: "Ventas (ARS)", tipo: "importe", moneda: "ARS" },
    ],
    filas: [
      { destino: "Brasil", viajes: 4, ventas: "3600000.00" },
      { destino: "Europa", viajes: 2, ventas: "1800000.00" },
    ],
    filas_comparadas: comparar
      ? [
          { destino: "Brasil", viajes: 3, ventas: "2900000.00" },
          { destino: "Europa", viajes: 1, ventas: "1300000.00" },
        ]
      : null,
  };
}

/** Eventos ficticios del calendario (CU-23): cada viaje de M6 y cada vencimiento de sus pagos. */
export const eventosCalendarioMock: EventoCalendario[] = [
  ...viajesMock.map((v): EventoCalendario => ({
    tipo: "viaje",
    titulo: `${v.destino_nombre} · ${v.cliente_nombre}`,
    desde: v.fecha_salida,
    hasta: v.fecha_regreso,
    estado: v.estado,
    viaje_id: v.id,
    pago_id: null,
    responsable_id: v.responsable_id,
  })),
  ...Object.values(pagosPorViajeMock)
    .flat()
    .filter((p) => p.estado !== "anulado")
    .map((p): EventoCalendario => {
      const viaje = viajePorId.get(p.viaje_id);
      return {
        tipo: "vencimiento",
        titulo: `Vence ${p.tipo} · ${viaje?.cliente_nombre ?? ""}`,
        desde: p.vencimiento,
        hasta: p.vencimiento,
        estado: p.estado,
        viaje_id: p.viaje_id,
        pago_id: p.id,
        responsable_id: viaje?.responsable_id ?? usuariosPorRol.empleado.id,
      };
    }),
];

const sinPermiso = () =>
  respuestaProblema(403, "Sin permiso", { detail: "Tu rol no permite esta acción." });

/** Handlers MSW del dashboard, los reportes y el calendario (CU-21, CU-22, CU-23), con la matriz de
 * roles del contrato: los reportes y la lista de usuarios (para filtrar por responsable) son de
 * admin y dueño. */
export function manejadoresDashboardPara(rol: RolMock): RequestHandler[] {
  const gestiona = rol === "admin" || rol === "dueno";

  return [
    // Empleado y freelance ven lo suyo: del ranking de vendedores, solo su fila (CU-21 A1).
    http.get("*/api/dashboard", () =>
      HttpResponse.json(
        gestiona
          ? dashboardMock
          : {
              ...dashboardMock,
              ventas_por_vendedor: dashboardMock.ventas_por_vendedor.filter(
                (v) => v.vendedor_id === usuariosPorRol[rol].id,
              ),
            },
      ),
    ),

    // Para elegir responsable en el filtro (solo admin y dueño).
    http.get("*/api/usuarios", () =>
      gestiona
        ? HttpResponse.json({
            items: usuariosMock,
            total: usuariosMock.length,
            pagina: 1,
            por_pagina: 100,
          })
        : sinPermiso(),
    ),

    http.get("*/api/reportes", () =>
      gestiona ? HttpResponse.json(reportesCatalogoMock) : sinPermiso(),
    ),

    http.get("*/api/reportes/:id", ({ params, request }) => {
      if (!gestiona) return sinPermiso();
      const url = new URL(request.url);
      const formato = url.searchParams.get("formato") ?? "json";
      if (!["json", "xlsx", "pdf"].includes(formato)) {
        return respuestaProblema(422, "Datos inválidos", {
          detail: "El formato es json, xlsx o pdf.",
        });
      }
      const reporte = reporteMock(String(params["id"]), url.searchParams.has("comparar_desde"));
      if (!reporte) {
        return respuestaProblema(404, "No encontrado", { detail: "El reporte no existe." });
      }
      if (formato === "json") return HttpResponse.json(reporte);
      return new HttpResponse(`reporte ${reporte.id}`, {
        headers: { "content-type": formato === "xlsx" ? XLSX : "application/pdf" },
      });
    }),

    http.get("*/api/calendario", ({ request }) => {
      const url = new URL(request.url);
      const filtro = (nombre: keyof FiltrosCalendario) => url.searchParams.get(nombre);
      const desde = filtro("desde");
      const hasta = filtro("hasta");
      // El freelance ve solo lo suyo aunque no pida `mios` (DEC-0008).
      const propio =
        filtro("mios") === "true" || rol === "freelance" ? usuariosPorRol[rol].id : null;
      return HttpResponse.json(
        eventosCalendarioMock.filter(
          (e) =>
            (!filtro("tipo") || e.tipo === filtro("tipo")) &&
            (!filtro("responsable_id") || e.responsable_id === filtro("responsable_id")) &&
            (!propio || e.responsable_id === propio) &&
            (!desde || e.hasta >= desde) &&
            (!hasta || e.desde <= hasta),
        ),
      );
    }),
  ];
}

export const manejadoresDashboard: RequestHandler[] = manejadoresDashboardPara("dueno");
