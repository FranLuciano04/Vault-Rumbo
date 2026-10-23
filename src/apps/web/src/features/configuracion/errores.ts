import { ErrorApi } from "@rumbo/shared";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

export const ERROR_AL_GUARDAR = "No pudimos guardar los cambios. Probá de nuevo en unos minutos.";

/** Vuelca en sus campos los errores 422 del servidor (RNF-12); devuelve si había alguno. */
export function marcarErroresDelServidor<T extends FieldValues>(
  falla: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!(falla instanceof ErrorApi) || falla.status !== 422 || falla.errores.length === 0)
    return false;
  for (const { campo, mensaje } of falla.errores) {
    setError(campo as Path<T>, { type: "server", message: mensaje });
  }
  return true;
}
