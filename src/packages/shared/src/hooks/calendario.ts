import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import type { EventoCalendario, FiltrosCalendario } from "../modelos";

export const claveCalendario = ["calendario"] as const;

/** Viajes, vencimientos y alertas del rango visible (`GET /api/calendario`, CU-23). */
export function useCalendario(cliente: AxiosInstance, filtros: FiltrosCalendario = {}) {
  return useQuery({
    queryKey: [...claveCalendario, filtros],
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (await cliente.get<EventoCalendario[]>("/api/calendario", { params: filtros })).data,
  });
}
