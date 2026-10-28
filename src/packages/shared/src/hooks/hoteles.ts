import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import type {
  FiltrosHoteles,
  FiltrosResenas,
  Hotel,
  HotelCrear,
  HotelEditar,
  Pagina,
  Resena,
  ResenaCrear,
  ResenaEditar,
  ResenaOcultar,
} from "../modelos";
import { claveClientes } from "./clientes";
import { useAccion } from "./useAccion";

export const claveHoteles = ["hoteles"] as const;

// Las reseñas cuelgan del hotel (puntaje promedio) y del historial del cliente: toda mutación de
// una reseña invalida `hoteles` y `clientes`.

/** Catálogo de hoteles con su puntaje promedio (`GET /api/hoteles`, CU-18). */
export function useHoteles(cliente: AxiosInstance, filtros: FiltrosHoteles = {}) {
  return useQuery({
    queryKey: [...claveHoteles, "lista", filtros],
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (await cliente.get<Pagina<Hotel>>("/api/hoteles", { params: filtros })).data,
  });
}

/** Un hotel (`GET /api/hoteles/{hotel_id}`, CU-18). */
export function useHotel(cliente: AxiosInstance, hotelId: string) {
  return useQuery({
    queryKey: [...claveHoteles, hotelId],
    enabled: Boolean(hotelId),
    queryFn: async () => (await cliente.get<Hotel>(`/api/hoteles/${hotelId}`)).data,
  });
}

/** Alta de hotel (`POST /api/hoteles`, CU-16; todos menos freelance). */
export function useCrearHotel(cliente: AxiosInstance) {
  return useAccion(
    claveHoteles,
    async (datos: HotelCrear) => (await cliente.post<Hotel>("/api/hoteles", datos)).data,
  );
}

/** Edición de hotel (`PATCH /api/hoteles/{hotel_id}`, CU-16). */
export function useEditarHotel(cliente: AxiosInstance) {
  return useAccion(
    claveHoteles,
    async ({ hotelId, cambios }: { hotelId: string; cambios: HotelEditar }) =>
      (await cliente.patch<Hotel>(`/api/hoteles/${hotelId}`, cambios)).data,
  );
}

/** Baja lógica de un hotel que cerró (`POST /api/hoteles/{hotel_id}/baja`, CU-16). */
export function useDarDeBajaHotel(cliente: AxiosInstance) {
  return useAccion(
    claveHoteles,
    async (hotelId: string) => (await cliente.post<Hotel>(`/api/hoteles/${hotelId}/baja`)).data,
  );
}

/** Reseñas de un hotel (`GET /api/hoteles/{hotel_id}/resenas`, CU-18). */
export function useResenas(cliente: AxiosInstance, hotelId: string, filtros: FiltrosResenas = {}) {
  return useQuery({
    queryKey: [...claveHoteles, hotelId, "resenas", filtros],
    enabled: Boolean(hotelId),
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (await cliente.get<Pagina<Resena>>(`/api/hoteles/${hotelId}/resenas`, { params: filtros }))
        .data,
  });
}

/** Registra la reseña de un cliente (`POST /api/hoteles/{hotel_id}/resenas`, CU-17). */
export function useRegistrarResena(cliente: AxiosInstance) {
  return useAccion(
    claveHoteles,
    async ({ hotelId, datos }: { hotelId: string; datos: ResenaCrear }) =>
      (await cliente.post<Resena>(`/api/hoteles/${hotelId}/resenas`, datos)).data,
    [claveClientes],
  );
}

/** Corrige puntaje, comentario o fecha (`PATCH /api/resenas/{resena_id}`, CU-17, RF-105). */
export function useEditarResena(cliente: AxiosInstance) {
  return useAccion(
    claveHoteles,
    async ({ resenaId, cambios }: { resenaId: string; cambios: ResenaEditar }) =>
      (await cliente.patch<Resena>(`/api/resenas/${resenaId}`, cambios)).data,
    [claveClientes],
  );
}

/** Baja lógica de una reseña (`POST /api/resenas/{resena_id}/ocultar`, CU-29; admin y dueño). */
export function useOcultarResena(cliente: AxiosInstance) {
  return useAccion(
    claveHoteles,
    async ({ resenaId, datos }: { resenaId: string; datos: ResenaOcultar }) =>
      (await cliente.post<Resena>(`/api/resenas/${resenaId}/ocultar`, datos)).data,
    [claveClientes],
  );
}

/** Restaura una reseña oculta (`POST /api/resenas/{resena_id}/restaurar`, CU-29). */
export function useRestaurarResena(cliente: AxiosInstance) {
  return useAccion(
    claveHoteles,
    async (resenaId: string) =>
      (await cliente.post<Resena>(`/api/resenas/${resenaId}/restaurar`)).data,
    [claveClientes],
  );
}

/** Eliminación física, excepcional (`DELETE /api/resenas/{resena_id}`, CU-29 A2). */
export function useEliminarResena(cliente: AxiosInstance) {
  return useAccion(
    claveHoteles,
    async (resenaId: string) => {
      await cliente.delete(`/api/resenas/${resenaId}`);
    },
    [claveClientes],
  );
}
