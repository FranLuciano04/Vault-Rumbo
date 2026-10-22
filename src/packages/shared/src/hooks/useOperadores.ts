import { useQuery } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import type { FiltrosListado, Operador, OperadorCrear, OperadorEditar, Pagina } from "../modelos";
import { useAccion } from "./useAccion";

export const claveOperadores = ["operadores"] as const;

/** Listado de operadores (`GET /api/operadores`, CU-31; todos los roles). */
export function useOperadores(cliente: AxiosInstance, filtros: FiltrosListado = {}) {
  return useQuery({
    queryKey: [...claveOperadores, "lista", filtros],
    queryFn: async () =>
      (await cliente.get<Pagina<Operador>>("/api/operadores", { params: filtros })).data,
  });
}

/** Un operador (`GET /api/operadores/{operador_id}`, CU-31). */
export function useOperador(cliente: AxiosInstance, operadorId: string) {
  return useQuery({
    queryKey: [...claveOperadores, operadorId],
    queryFn: async () => (await cliente.get<Operador>(`/api/operadores/${operadorId}`)).data,
  });
}

/** Alta de operador (`POST /api/operadores`, CU-31; admin y dueño). */
export function useCrearOperador(cliente: AxiosInstance) {
  return useAccion(
    claveOperadores,
    async (datos: OperadorCrear) => (await cliente.post<Operador>("/api/operadores", datos)).data,
  );
}

/** Edición de operador (`PATCH /api/operadores/{operador_id}`, CU-31). */
export function useEditarOperador(cliente: AxiosInstance) {
  return useAccion(
    claveOperadores,
    async ({ operadorId, datos }: { operadorId: string; datos: OperadorEditar }) =>
      (await cliente.patch<Operador>(`/api/operadores/${operadorId}`, datos)).data,
  );
}

/** Baja lógica (`POST /api/operadores/{operador_id}/baja`, CU-31). */
export function useDarDeBajaOperador(cliente: AxiosInstance) {
  return useAccion(
    claveOperadores,
    async (operadorId: string) =>
      (await cliente.post<Operador>(`/api/operadores/${operadorId}/baja`)).data,
  );
}

/** Reactivación (`POST /api/operadores/{operador_id}/reactivar`, CU-31). */
export function useReactivarOperador(cliente: AxiosInstance) {
  return useAccion(
    claveOperadores,
    async (operadorId: string) =>
      (await cliente.post<Operador>(`/api/operadores/${operadorId}/reactivar`)).data,
  );
}
