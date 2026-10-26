import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import type {
  Cancelacion,
  ConfirmarReserva,
  FiltrosViajes,
  Pagina,
  Tramo,
  Viaje,
} from "../modelos";
import { claveAlertas } from "./alertas";
import { useAccion } from "./useAccion";

export const claveViajes = ["viajes"] as const;

/** Listado de viajes (`GET /api/viajes`, CU-08). */
export function useViajes(cliente: AxiosInstance, filtros: FiltrosViajes = {}) {
  return useQuery({
    queryKey: [...claveViajes, "lista", filtros],
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (await cliente.get<Pagina<Viaje>>("/api/viajes", { params: filtros })).data,
  });
}

/** Ficha del viaje con economía y saldo (`GET /api/viajes/{viaje_id}`, CU-08, CU-10, CU-12). */
export function useViaje(cliente: AxiosInstance, viajeId: string) {
  return useQuery({
    queryKey: [...claveViajes, viajeId],
    enabled: Boolean(viajeId),
    queryFn: async () => (await cliente.get<Viaje>(`/api/viajes/${viajeId}`)).data,
  });
}

/** Confirma la reserva y crea el viaje (`POST /api/oportunidades/{id}/confirmar-reserva`, CU-07). */
export function useConfirmarReserva(cliente: AxiosInstance) {
  return useAccion(
    claveViajes,
    async ({ oportunidadId, datos }: { oportunidadId: string; datos: ConfirmarReserva }) =>
      (await cliente.post<Viaje>(`/api/oportunidades/${oportunidadId}/confirmar-reserva`, datos))
        .data,
    // La reserva crea las alertas de formularios, salida y vencimientos.
    [claveAlertas],
  );
}

/** Transición de estado de un viaje: `POST /api/viajes/{id}/{accion}` (CU-08, CU-27). */
function useTransicion(
  cliente: AxiosInstance,
  accion: "iniciar" | "finalizar" | "corregir-estado" | "revertir-cancelacion",
) {
  return useAccion(
    claveViajes,
    async (viajeId: string) => (await cliente.post<Viaje>(`/api/viajes/${viajeId}/${accion}`)).data,
    [claveAlertas],
  );
}

/** Pasa el viaje a en curso (CU-08). */
export const useIniciarViaje = (cliente: AxiosInstance) => useTransicion(cliente, "iniciar");

/** Pasa el viaje a finalizado (CU-08). */
export const useFinalizarViaje = (cliente: AxiosInstance) => useTransicion(cliente, "finalizar");

/** Vuelve al estado anterior por un error de carga (CU-08). */
export const useCorregirEstadoViaje = (cliente: AxiosInstance) =>
  useTransicion(cliente, "corregir-estado");

/** Revierte la cancelación (CU-27). */
export const useRevertirCancelacion = (cliente: AxiosInstance) =>
  useTransicion(cliente, "revertir-cancelacion");

/** Cancela el viaje con motivo y fecha (`POST /api/viajes/{id}/cancelar`, CU-27). */
export function useCancelarViaje(cliente: AxiosInstance) {
  return useAccion(
    claveViajes,
    async ({ viajeId, datos }: { viajeId: string; datos: Cancelacion }) =>
      (await cliente.post<Viaje>(`/api/viajes/${viajeId}/cancelar`, datos)).data,
    [claveAlertas],
  );
}

/** Itinerario de hoteles (`GET /api/viajes/{viaje_id}/itinerario`, CU-09). */
export function useItinerario(cliente: AxiosInstance, viajeId: string) {
  return useQuery({
    queryKey: [...claveViajes, viajeId, "itinerario"],
    enabled: Boolean(viajeId),
    queryFn: async () => (await cliente.get<Tramo[]>(`/api/viajes/${viajeId}/itinerario`)).data,
  });
}

/** Agrega un hotel al itinerario (`POST /api/viajes/{viaje_id}/itinerario`, CU-09). */
export function useAgregarTramo(cliente: AxiosInstance) {
  return useAccion(
    claveViajes,
    async ({ viajeId, datos }: { viajeId: string; datos: Tramo }) =>
      (await cliente.post<Tramo>(`/api/viajes/${viajeId}/itinerario`, datos)).data,
    [claveAlertas],
  );
}

/** Edita un tramo o lo marca pagado al proveedor (`PATCH /api/tramos/{id}`, CU-09). */
export function useEditarTramo(cliente: AxiosInstance) {
  return useAccion(
    claveViajes,
    async ({ tramoId, cambios }: { tramoId: string; cambios: Tramo }) =>
      (await cliente.patch<Tramo>(`/api/tramos/${tramoId}`, cambios)).data,
    [claveAlertas],
  );
}

/** Quita un hotel del itinerario; su alerta se cierra (`DELETE /api/tramos/{id}`, CU-09). */
export function useQuitarTramo(cliente: AxiosInstance) {
  return useAccion(
    claveViajes,
    async (tramoId: string) => {
      await cliente.delete(`/api/tramos/${tramoId}`);
    },
    [claveAlertas],
  );
}
