import type { components } from "./tipos.gen";

type Esquemas = components["schemas"];

/** Usuarios y configuración (M1): tipos del contrato, para hooks, mocks y pantallas. */
export type Usuario = Esquemas["Usuario"];
export type UsuarioCrear = Esquemas["UsuarioCrear"];
export type UsuarioEditar = Esquemas["UsuarioEditar"];
export type Configuracion = Esquemas["Configuracion"];
export type ConfiguracionEditar = Esquemas["ConfiguracionEditar"];
export type ComisionPorDefecto = Esquemas["ComisionPorDefecto"];
export type Destino = Esquemas["Destino"];
export type DestinoCrear = Esquemas["DestinoCrear"];
export type DestinoEditar = Esquemas["DestinoEditar"];
export type RequisitoDestino = Esquemas["RequisitoDestino"];
export type RequisitoDestinoCrear = Esquemas["RequisitoDestinoCrear"];
export type RequisitoDestinoEditar = Esquemas["RequisitoDestinoEditar"];
export type Operador = Esquemas["Operador"];
export type OperadorCrear = Esquemas["OperadorCrear"];
export type OperadorEditar = Esquemas["OperadorEditar"];

/** Alertas (M3): la agenda, los recordatorios manuales y el progreso del día. */
export type Alerta = Esquemas["Alerta"];
export type AlertaCrear = Esquemas["AlertaCrear"];
export type AlertaEditar = Esquemas["AlertaEditar"];
export type AlertaPosponer = Esquemas["AlertaPosponer"];
export type ProgresoDelDia = Esquemas["ProgresoDelDia"];
export type TipoAlerta = Esquemas["TipoAlerta"];
export type EstadoAlerta = Esquemas["EstadoAlerta"];

/** Viajes (M6): la reserva, la ficha con su economía y saldo, el estado, la cancelación y el itinerario. */
export type Viaje = Esquemas["Viaje"];
export type ConfirmarReserva = Esquemas["ConfirmarReserva"];
export type Cancelacion = Esquemas["Cancelacion"];
export type Tramo = Esquemas["Tramo"];
export type EstadoViaje = Esquemas["EstadoViaje"];
export type CategoriaViaje = Esquemas["CategoriaViaje"];

/** Economía y cobros (M6): control económico, plan de pagos y checklist de pagos. */
export type EconomiaViaje = Esquemas["EconomiaViaje"];
export type PlanDePagos = Esquemas["PlanDePagos"];
export type PagoPlanItem = Esquemas["PagoPlanItem"];
export type Pago = Esquemas["Pago"];
export type PagoReprogramar = Esquemas["PagoReprogramar"];
export type PagoDividir = Esquemas["PagoDividir"];
export type CobroRegistrar = Esquemas["CobroRegistrar"];
export type EstadoPago = Esquemas["EstadoPago"];
export type TipoPago = Esquemas["TipoPago"];
export type FormaPago = Esquemas["FormaPago"];

/** Oportunidades y cotizaciones (M4): la consulta, su seguimiento y las versiones de la cotización. */
export type Oportunidad = Esquemas["Oportunidad"];
export type OportunidadCrear = Esquemas["OportunidadCrear"];
export type OportunidadEditar = Esquemas["OportunidadEditar"];
export type OportunidadPerder = Esquemas["OportunidadPerder"];
export type Insistencia = Esquemas["Insistencia"];
export type Cotizacion = Esquemas["Cotizacion"];
export type CotizacionCrear = Esquemas["CotizacionCrear"];
export type ItemCotizacion = Esquemas["ItemCotizacion"];
export type EstadoOportunidad = Esquemas["EstadoOportunidad"];
export type CanalOportunidad = Esquemas["CanalOportunidad"];
export type MotivoPerdida = Esquemas["MotivoPerdida"];
export type EstadoCotizacion = Esquemas["EstadoCotizacion"];

/** Listado paginado: `{items, total, pagina, por_pagina}`. */
export interface Pagina<T> {
  items: T[];
  total: number;
  pagina: number;
  por_pagina: number;
}

/** Filtros de los listados; `pagina` y `por_pagina` los valida el servidor (1 y 20 por defecto). */
export interface FiltrosListado {
  pagina?: number;
  por_pagina?: number;
  activo?: boolean;
  buscar?: string;
}

/** Filtros de la agenda (`GET /api/alertas`, CU-14): sin ellos, las propias pendientes hasta hoy (admin y dueño, las de toda la agencia). */
export interface FiltrosAlertas {
  /** Inicio del período (inclusive), `aaaa-mm-dd`: con `hasta` igual se pide un solo día. */
  desde?: string;
  /** Fin del período, `aaaa-mm-dd`. */
  hasta?: string;
  estado?: EstadoAlerta;
  tipo?: TipoAlerta;
  /** Solo las pendientes con fecha posterior a hoy (CU-14 A5). */
  proximas?: boolean;
  /** Agenda de un responsable: solo admin y dueño (CU-14 A1); para el resto se ignora. */
  propietario_id?: string;
  /** Solo las alertas cuyo origen es esta oportunidad (RF-015). */
  oportunidad_id?: string;
  pagina?: number;
  por_pagina?: number;
}

/** Filtros del listado de viajes (`GET /api/viajes`, CU-08). */
export interface FiltrosViajes {
  /** Solo los viajes que tengo asignados. */
  mios?: boolean;
  /** Fecha de salida desde, `aaaa-mm-dd`. */
  desde?: string;
  /** Fecha de salida hasta, `aaaa-mm-dd`. */
  hasta?: string;
  estado?: EstadoViaje;
  cliente_id?: string;
  pagina?: number;
  por_pagina?: number;
}

/** Filtros del embudo (`GET /api/oportunidades`, CU-05). */
export interface FiltrosOportunidades {
  /** Solo las oportunidades que tengo asignadas. */
  mios?: boolean;
  /** Oportunidades de un responsable: solo admin y dueño. */
  responsable_id?: string;
  estado?: EstadoOportunidad;
  cliente_id?: string;
  pagina?: number;
  por_pagina?: number;
}
