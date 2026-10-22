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
