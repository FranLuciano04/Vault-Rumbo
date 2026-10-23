import { ErrorApi } from "@rumbo/shared";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

export const ERROR_AL_GUARDAR = "No pudimos guardar los cambios. Probá de nuevo en unos minutos.";

/**
 * Vuelca en sus campos los errores 422 del servidor (RNF-12). Devuelve el texto para el aviso
 * general: los mensajes de errores que no corresponden a un campo del formulario (por ejemplo
 * `body`), o el mensaje genérico si no fue un 422; `null` si todo quedó en sus campos.
 */
export function aplicarErroresDelServidor<T extends FieldValues>(
  falla: unknown,
  campos: readonly Path<T>[],
  setError: UseFormSetError<T>,
): string | null {
  if (!(falla instanceof ErrorApi) || falla.status !== 422 || falla.errores.length === 0)
    return ERROR_AL_GUARDAR;
  const restantes: string[] = [];
  for (const { campo, mensaje } of falla.errores) {
    const propio = campos.find((nombre) => nombre === campo);
    if (propio) setError(propio, { type: "server", message: mensaje });
    else restantes.push(mensaje);
  }
  return restantes.length > 0 ? restantes.join(" ") : null;
}
