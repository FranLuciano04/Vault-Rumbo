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

/** Filtros de la agenda (`GET /api/alertas`, CU-14): sin ellos, las propias pendientes hasta hoy. */
export interface FiltrosAlertas {
  /** Fin del período, `aaaa-mm-dd`. */
  hasta?: string;
  estado?: EstadoAlerta;
  tipo?: TipoAlerta;
  /** Solo las pendientes con fecha posterior a hoy (CU-14 A5). */
  proximas?: boolean;
  /** Las de toda la agencia: solo admin y dueño (CU-14 A1). */
  todas?: boolean;
  pagina?: number;
  por_pagina?: number;
}
