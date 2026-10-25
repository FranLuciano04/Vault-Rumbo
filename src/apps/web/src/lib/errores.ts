import { ERROR_AL_GUARDAR, ErrorApi } from "@rumbo/shared";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

export { ERROR_AL_GUARDAR, mensajeDeError } from "@rumbo/shared";

const NO_EXISTE = "Lo que querés guardar ya no existe o no lo podés ver.";

/**
 * Vuelca en sus campos los errores 422 del servidor (RNF-12). Devuelve el texto para el aviso
 * general: el `detail` de un 409 (por ejemplo, un duplicado) o de un 403, un texto fijo para un 404, los mensajes de errores
 * que no corresponden a un campo del formulario (por ejemplo `body`), o el mensaje genérico si no
 * fue un 422; `null` si todo quedó en sus campos.
 */
export function aplicarErroresDelServidor<T extends FieldValues>(
  falla: unknown,
  campos: readonly Path<T>[],
  setError: UseFormSetError<T>,
): string | null {
  // El `detail` de un 404 es técnico (nombra el id): se muestra un texto propio.
  if (falla instanceof ErrorApi && falla.status === 404) return NO_EXISTE;
  if (falla instanceof ErrorApi && [403, 409].includes(falla.status) && falla.detail)
    return falla.detail;
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
