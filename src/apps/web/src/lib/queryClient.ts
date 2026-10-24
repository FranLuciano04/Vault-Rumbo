import { ErrorApi } from "@rumbo/shared";
import { QueryClient } from "@tanstack/react-query";

const REINTENTOS_MAXIMOS = 3; // tope por defecto de TanStack Query

// Un 4xx de la API es una respuesta definitiva (ficha inexistente, sin permiso, datos
// inválidos): reintentarlo solo demora el error en pantalla. Se reintenta lo transitorio.
function reintentar(intento: number, error: Error): boolean {
  if (error instanceof ErrorApi && error.status >= 400 && error.status < 500) return false;
  return intento < REINTENTOS_MAXIMOS;
}

export function crearQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: reintentar } } });
}
