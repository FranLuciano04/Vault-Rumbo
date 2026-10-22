import { useQuery } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import type {
  Destino,
  DestinoCrear,
  DestinoEditar,
  FiltrosListado,
  Pagina,
  RequisitoDestino,
  RequisitoDestinoCrear,
  RequisitoDestinoEditar,
} from "../modelos";
import { useAccion } from "./useAccion";

export const claveDestinos = ["destinos"] as const;

/** Listado de destinos (`GET /api/destinos`, CU-26; todos los roles). */
export function useDestinos(cliente: AxiosInstance, filtros: FiltrosListado = {}) {
  return useQuery({
    queryKey: [...claveDestinos, "lista", filtros],
    queryFn: async () =>
      (await cliente.get<Pagina<Destino>>("/api/destinos", { params: filtros })).data,
  });
}

/** Un destino (`GET /api/destinos/{destino_id}`, CU-26). */
export function useDestino(cliente: AxiosInstance, destinoId: string) {
  return useQuery({
    queryKey: [...claveDestinos, destinoId],
    queryFn: async () => (await cliente.get<Destino>(`/api/destinos/${destinoId}`)).data,
  });
}

/** Alta de destino (`POST /api/destinos`, CU-26; admin y dueño). */
export function useCrearDestino(cliente: AxiosInstance) {
  return useAccion(
    claveDestinos,
    async (datos: DestinoCrear) => (await cliente.post<Destino>("/api/destinos", datos)).data,
  );
}

/** Edición de destino (`PATCH /api/destinos/{destino_id}`, CU-26). */
export function useEditarDestino(cliente: AxiosInstance) {
  return useAccion(
    claveDestinos,
    async ({ destinoId, datos }: { destinoId: string; datos: DestinoEditar }) =>
      (await cliente.patch<Destino>(`/api/destinos/${destinoId}`, datos)).data,
  );
}

/** Baja lógica (`POST /api/destinos/{destino_id}/baja`, CU-26). */
export function useDarDeBajaDestino(cliente: AxiosInstance) {
  return useAccion(
    claveDestinos,
    async (destinoId: string) =>
      (await cliente.post<Destino>(`/api/destinos/${destinoId}/baja`)).data,
  );
}

/** Reactivación (`POST /api/destinos/{destino_id}/reactivar`, CU-26). */
export function useReactivarDestino(cliente: AxiosInstance) {
  return useAccion(
    claveDestinos,
    async (destinoId: string) =>
      (await cliente.post<Destino>(`/api/destinos/${destinoId}/reactivar`)).data,
  );
}

/** Requisitos de un destino (`GET /api/destinos/{destino_id}/requisitos`, CU-15; todos los roles). */
export function useRequisitosDestino(
  cliente: AxiosInstance,
  destinoId: string,
  filtros: Pick<FiltrosListado, "pagina" | "por_pagina"> = {},
) {
  return useQuery({
    queryKey: [...claveDestinos, destinoId, "requisitos", filtros],
    queryFn: async () =>
      (
        await cliente.get<Pagina<RequisitoDestino>>(`/api/destinos/${destinoId}/requisitos`, {
          params: filtros,
        })
      ).data,
  });
}

/** Alta de requisito (`POST /api/destinos/{destino_id}/requisitos`, CU-15; admin y dueño). */
export function useCrearRequisitoDestino(cliente: AxiosInstance) {
  return useAccion(
    claveDestinos,
    async ({ destinoId, datos }: { destinoId: string; datos: RequisitoDestinoCrear }) =>
      (await cliente.post<RequisitoDestino>(`/api/destinos/${destinoId}/requisitos`, datos)).data,
  );
}

/** Edición de requisito (`PATCH /api/requisitos-destino/{requisito_id}`, CU-15). */
export function useEditarRequisitoDestino(cliente: AxiosInstance) {
  return useAccion(
    claveDestinos,
    async ({ requisitoId, datos }: { requisitoId: string; datos: RequisitoDestinoEditar }) =>
      (await cliente.patch<RequisitoDestino>(`/api/requisitos-destino/${requisitoId}`, datos)).data,
  );
}

/** Baja lógica (`POST /api/requisitos-destino/{requisito_id}/baja`, CU-15). */
export function useDarDeBajaRequisitoDestino(cliente: AxiosInstance) {
  return useAccion(
    claveDestinos,
    async (requisitoId: string) =>
      (await cliente.post<RequisitoDestino>(`/api/requisitos-destino/${requisitoId}/baja`)).data,
  );
}
