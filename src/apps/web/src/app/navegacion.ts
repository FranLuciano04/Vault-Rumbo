import type { UsuarioActual } from "@rumbo/shared";

export interface Seccion {
  id: string;
  etiqueta: string;
  ruta: string;
}

export function seccionesVisibles(_usuario: UsuarioActual): Seccion[] {
  throw new Error("no implementado");
}
