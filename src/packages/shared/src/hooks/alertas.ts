import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import type {
  Alerta,
  AlertaCrear,
  AlertaEditar,
  AlertaPosponer,
  FiltrosAlertas,
  Pagina,
  ProgresoDelDia,
} from "../modelos";
import { useAccion } from "./useAccion";

export const claveAlertas = ["alertas"] as const;
const claveProgreso = [...claveAlertas, "progreso-del-dia"] as const;

/** Agenda de alertas (`GET /api/alertas`, CU-14, CU-30). */
export function useAlertas(cliente: AxiosInstance, filtros: FiltrosAlertas = {}) {
  return useQuery({
    queryKey: [...claveAlertas, "lista", filtros],
    queryFn: async () =>
      (await cliente.get<Pagina<Alerta>>("/api/alertas", { params: filtros })).data,
  });
}

/** La agenda por páginas (`GET /api/alertas`): `fetchNextPage` suma la siguiente hasta cubrir el total. */
export function useAlertasPorPaginas(cliente: AxiosInstance, filtros: FiltrosAlertas = {}) {
  return useInfiniteQuery({
    queryKey: [...claveAlertas, "lista-por-paginas", filtros],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      (
        await cliente.get<Pagina<Alerta>>("/api/alertas", {
          params: { ...filtros, pagina: pageParam },
        })
      ).data,
    getNextPageParam: (ultima, todas) =>
      todas.length * ultima.por_pagina < ultima.total ? todas.length + 1 : undefined,
  });
}

/** Una alerta (`GET /api/alertas/{alerta_id}`, CU-14). */
export function useAlerta(cliente: AxiosInstance, alertaId: string) {
  return useQuery({
    queryKey: [...claveAlertas, alertaId],
    enabled: Boolean(alertaId),
    queryFn: async () => (await cliente.get<Alerta>(`/api/alertas/${alertaId}`)).data,
  });
}

/** Resueltas hoy sobre el total del día (`GET /api/alertas/progreso-del-dia`, CU-14). */
export function useProgresoDelDia(cliente: AxiosInstance) {
  return useQuery({
    queryKey: claveProgreso,
    queryFn: async () => (await cliente.get<ProgresoDelDia>("/api/alertas/progreso-del-dia")).data,
  });
}

/** Recordatorio manual (`POST /api/alertas`, CU-28). */
export function useCrearRecordatorio(cliente: AxiosInstance) {
  return useAccion(
    claveAlertas,
    async (datos: AlertaCrear) => (await cliente.post<Alerta>("/api/alertas", datos)).data,
  );
}

/** Edita fecha o descripción de un recordatorio pendiente (`PATCH /api/alertas/{id}`, CU-28). */
export function useEditarRecordatorio(cliente: AxiosInstance) {
  return useAccion(
    claveAlertas,
    async ({ id, cambios }: { id: string; cambios: AlertaEditar }) =>
      (await cliente.patch<Alerta>(`/api/alertas/${id}`, cambios)).data,
  );
}

/** Marca la alerta como vista (`POST /api/alertas/{id}/vista`, CU-14). */
export function useMarcarAlertaVista(cliente: AxiosInstance) {
  return useAccion(
    claveAlertas,
    async (id: string) => (await cliente.post<Alerta>(`/api/alertas/${id}/vista`)).data,
  );
}

/** Resuelve la alerta (`POST /api/alertas/{id}/resolver`, CU-14); mueve el progreso del día. */
export function useResolverAlerta(cliente: AxiosInstance) {
  return useAccion(
    claveAlertas,
    async (id: string) => (await cliente.post<Alerta>(`/api/alertas/${id}/resolver`)).data,
  );
}

/** Reprograma la alerta a una fecha posterior (`POST /api/alertas/{id}/posponer`, CU-14, CU-30). */
export function usePosponerAlerta(cliente: AxiosInstance) {
  return useAccion(
    claveAlertas,
    async ({ id, fecha }: { id: string } & AlertaPosponer) =>
      (await cliente.post<Alerta>(`/api/alertas/${id}/posponer`, { fecha })).data,
  );
}
