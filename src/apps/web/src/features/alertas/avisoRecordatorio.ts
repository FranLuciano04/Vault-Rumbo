import { formatearFecha } from "@rumbo/shared";

/** Aviso al guardar un recordatorio (CU-28), con la fecha en `dd/mm/aa`. */
export function avisoRecordatorio(accion: "creado" | "actualizado", fecha: string): string {
  return `Recordatorio ${accion} para el ${formatearFecha(fecha)}`;
}
