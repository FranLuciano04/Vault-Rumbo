import { ErrorApi } from "./cliente";

export const ERROR_AL_GUARDAR = "No pudimos guardar los cambios. Probá de nuevo en unos minutos.";

/** Texto para avisar una acción que falló: el `detail` del problema o el mensaje genérico. */
export function mensajeDeError(falla: unknown): string {
  return falla instanceof ErrorApi && falla.detail ? falla.detail : ERROR_AL_GUARDAR;
}
