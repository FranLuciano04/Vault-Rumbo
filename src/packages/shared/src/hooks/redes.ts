import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import type {
  ContenidoRed,
  ContenidoRedCrear,
  ContenidoRedEditar,
  FiltrosContenidos,
  Pagina,
  PropuestaIA,
  PropuestaIAPedido,
} from "../modelos";
import { useAccion } from "./useAccion";

export const claveContenidos = ["contenidos"] as const;

// Todo el módulo es de admin, dueño y empleado con acceso a redes; el freelance nunca entra (403).

/** Tablero y calendario de contenido (`GET /api/contenidos`, CU-19). */
export function useContenidos(cliente: AxiosInstance, filtros: FiltrosContenidos = {}) {
  return useQuery({
    queryKey: [...claveContenidos, "lista", filtros],
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (await cliente.get<Pagina<ContenidoRed>>("/api/contenidos", { params: filtros })).data,
  });
}

/** Una pieza de contenido (`GET /api/contenidos/{contenido_id}`, CU-19). */
export function useContenido(cliente: AxiosInstance, contenidoId: string) {
  return useQuery({
    queryKey: [...claveContenidos, contenidoId],
    enabled: Boolean(contenidoId),
    queryFn: async () => (await cliente.get<ContenidoRed>(`/api/contenidos/${contenidoId}`)).data,
  });
}

/** Crea una pieza en la columna `idea` (`POST /api/contenidos`, CU-19); también guarda el borrador elegido (CU-20). */
export function useCrearContenido(cliente: AxiosInstance) {
  return useAccion(
    claveContenidos,
    async (datos: ContenidoRedCrear) =>
      (await cliente.post<ContenidoRed>("/api/contenidos", datos)).data,
  );
}

/** Edita, reprograma o mueve una pieza entre columnas (`PATCH /api/contenidos/{contenido_id}`, CU-19). */
export function useEditarContenido(cliente: AxiosInstance) {
  return useAccion(
    claveContenidos,
    async ({ contenidoId, cambios }: { contenidoId: string; cambios: ContenidoRedEditar }) =>
      (await cliente.patch<ContenidoRed>(`/api/contenidos/${contenidoId}`, cambios)).data,
  );
}

/** Baja lógica de una pieza (`POST /api/contenidos/{contenido_id}/descartar`, CU-19 A4). */
export function useDescartarContenido(cliente: AxiosInstance) {
  return useAccion(
    claveContenidos,
    async (contenidoId: string) =>
      (await cliente.post<ContenidoRed>(`/api/contenidos/${contenidoId}/descartar`)).data,
  );
}

/** Borradores con IA, sin guardar nada (`POST /api/contenidos/propuestas-ia`, CU-20); `502` si falla la IA. */
export function useGenerarPropuestasIA(cliente: AxiosInstance) {
  return useAccion(
    claveContenidos,
    async (pedido: PropuestaIAPedido) =>
      (await cliente.post<PropuestaIA>("/api/contenidos/propuestas-ia", pedido)).data,
  );
}
