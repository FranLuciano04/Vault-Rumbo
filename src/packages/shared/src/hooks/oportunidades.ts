import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import type {
  Alerta,
  Cotizacion,
  CotizacionCrear,
  FiltrosListado,
  FiltrosOportunidades,
  Insistencia,
  Oportunidad,
  OportunidadCrear,
  OportunidadEditar,
  OportunidadPerder,
  Pagina,
} from "../modelos";
import { claveAlertas } from "./alertas";
import { useAccion } from "./useAccion";

export const claveOportunidades = ["oportunidades"] as const;
export const claveCotizaciones = ["cotizaciones"] as const;

/** Embudo de oportunidades (`GET /api/oportunidades`, CU-05). */
export function useOportunidades(cliente: AxiosInstance, filtros: FiltrosOportunidades = {}) {
  return useQuery({
    queryKey: [...claveOportunidades, "lista", filtros],
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (await cliente.get<Pagina<Oportunidad>>("/api/oportunidades", { params: filtros })).data,
  });
}

/** Ficha de la oportunidad (`GET /api/oportunidades/{oportunidad_id}`, CU-05). */
export function useOportunidad(cliente: AxiosInstance, oportunidadId: string) {
  return useQuery({
    queryKey: [...claveOportunidades, oportunidadId],
    enabled: Boolean(oportunidadId),
    queryFn: async () =>
      (await cliente.get<Oportunidad>(`/api/oportunidades/${oportunidadId}`)).data,
  });
}

/** Registra una consulta (`POST /api/oportunidades`, CU-04). */
export function useRegistrarConsulta(cliente: AxiosInstance) {
  return useAccion(
    claveOportunidades,
    async (datos: OportunidadCrear) =>
      (await cliente.post<Oportunidad>("/api/oportunidades", datos)).data,
  );
}

/** Edita la oportunidad o sus notas de seguimiento (`PATCH /api/oportunidades/{id}`, CU-05). */
export function useEditarOportunidad(cliente: AxiosInstance) {
  return useAccion(
    claveOportunidades,
    async ({ oportunidadId, cambios }: { oportunidadId: string; cambios: OportunidadEditar }) =>
      (await cliente.patch<Oportunidad>(`/api/oportunidades/${oportunidadId}`, cambios)).data,
  );
}

/** Transición de estado de la oportunidad: `POST /api/oportunidades/{id}/{accion}` (CU-05). */
function useTransicion(cliente: AxiosInstance, accion: "en-gestion" | "reactivar" | "ganar") {
  return useAccion(
    claveOportunidades,
    async (oportunidadId: string) =>
      (await cliente.post<Oportunidad>(`/api/oportunidades/${oportunidadId}/${accion}`)).data,
    [claveAlertas],
  );
}

/** Pasa la oportunidad a en gestión (CU-05). */
export const useTomarOportunidad = (cliente: AxiosInstance) => useTransicion(cliente, "en-gestion");

/** Reactiva una oportunidad perdida (CU-05). */
export const useReactivarOportunidad = (cliente: AxiosInstance) =>
  useTransicion(cliente, "reactivar");

/** Cierra la oportunidad como ganada sin cotización formal: venta directa (CU-05). */
export const useGanarOportunidad = (cliente: AxiosInstance) => useTransicion(cliente, "ganar");

/** Cierra la oportunidad como perdida, con su motivo (`POST /api/oportunidades/{id}/perder`, CU-05). */
export function usePerderOportunidad(cliente: AxiosInstance) {
  return useAccion(
    claveOportunidades,
    async ({ oportunidadId, datos }: { oportunidadId: string; datos: OportunidadPerder }) =>
      (await cliente.post<Oportunidad>(`/api/oportunidades/${oportunidadId}/perder`, datos)).data,
    [claveAlertas],
  );
}

/** Agenda una insistencia: crea una alerta (`POST /api/oportunidades/{id}/insistencias`, CU-05). */
export function useAgendarInsistencia(cliente: AxiosInstance) {
  return useAccion(
    claveOportunidades,
    async ({ oportunidadId, datos }: { oportunidadId: string; datos: Insistencia }) =>
      (await cliente.post<Alerta>(`/api/oportunidades/${oportunidadId}/insistencias`, datos)).data,
    [claveAlertas],
  );
}

/** Versiones de la cotización de una oportunidad (`GET /api/oportunidades/{id}/cotizaciones`, CU-06). */
export function useCotizaciones(
  cliente: AxiosInstance,
  oportunidadId: string,
  filtros: FiltrosListado = {},
) {
  return useQuery({
    queryKey: [...claveCotizaciones, "oportunidad", oportunidadId, filtros],
    enabled: Boolean(oportunidadId),
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (
        await cliente.get<Pagina<Cotizacion>>(`/api/oportunidades/${oportunidadId}/cotizaciones`, {
          params: filtros,
        })
      ).data,
  });
}

/** Una cotización (`GET /api/cotizaciones/{cotizacion_id}`, CU-06). */
export function useCotizacion(cliente: AxiosInstance, cotizacionId: string) {
  return useQuery({
    queryKey: [...claveCotizaciones, cotizacionId],
    enabled: Boolean(cotizacionId),
    queryFn: async () => (await cliente.get<Cotizacion>(`/api/cotizaciones/${cotizacionId}`)).data,
  });
}

/** Emite una cotización o una nueva versión (`POST /api/oportunidades/{id}/cotizaciones`, CU-06). */
export function useEmitirCotizacion(cliente: AxiosInstance) {
  return useAccion(
    claveCotizaciones,
    async ({ oportunidadId, datos }: { oportunidadId: string; datos: CotizacionCrear }) =>
      (await cliente.post<Cotizacion>(`/api/oportunidades/${oportunidadId}/cotizaciones`, datos))
        .data,
    // La oportunidad pasa a cotizada.
    [claveOportunidades],
  );
}

/** Transición de estado de la cotización: `POST /api/cotizaciones/{id}/{accion}` (CU-06). */
function useTransicionCotizacion(
  cliente: AxiosInstance,
  accion: "enviar" | "aceptar" | "rechazar",
) {
  return useAccion(
    claveCotizaciones,
    async (cotizacionId: string) =>
      (await cliente.post<Cotizacion>(`/api/cotizaciones/${cotizacionId}/${accion}`)).data,
    [claveOportunidades, claveAlertas],
  );
}

/** Marca la cotización como enviada (CU-06). */
export const useEnviarCotizacion = (cliente: AxiosInstance) =>
  useTransicionCotizacion(cliente, "enviar");

/** Registra que el cliente aceptó la cotización (CU-06). */
export const useAceptarCotizacion = (cliente: AxiosInstance) =>
  useTransicionCotizacion(cliente, "aceptar");

/** Registra que el cliente rechazó la cotización (CU-06). */
export const useRechazarCotizacion = (cliente: AxiosInstance) =>
  useTransicionCotizacion(cliente, "rechazar");

/** Descarga el documento PDF de la cotización (`GET /api/cotizaciones/{id}/documento`, CU-06). */
export async function descargarDocumentoCotizacion(
  cliente: AxiosInstance,
  cotizacionId: string,
): Promise<Blob> {
  return (
    await cliente.get<Blob>(`/api/cotizaciones/${cotizacionId}/documento`, {
      responseType: "blob",
    })
  ).data;
}
