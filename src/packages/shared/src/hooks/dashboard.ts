import { useQuery } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import type {
  Dashboard,
  FiltrosDashboard,
  FiltrosReporte,
  Reporte,
  ReporteCatalogo,
} from "../modelos";

export const claveDashboard = ["dashboard"] as const;
export const claveReportes = ["reportes"] as const;

/** Indicadores y embudo del período (`GET /api/dashboard`, CU-21). */
export function useDashboard(cliente: AxiosInstance, filtros: FiltrosDashboard = {}) {
  return useQuery({
    queryKey: [...claveDashboard, filtros],
    queryFn: async () => (await cliente.get<Dashboard>("/api/dashboard", { params: filtros })).data,
  });
}

/** Catálogo de reportes (`GET /api/reportes`, CU-22; admin y dueño). */
export function useReportes(cliente: AxiosInstance) {
  return useQuery({
    queryKey: claveReportes,
    queryFn: async () => (await cliente.get<ReporteCatalogo[]>("/api/reportes")).data,
  });
}

/** Un reporte del período en JSON (`GET /api/reportes/{reporte_id}`, CU-22). */
export function useReporte(
  cliente: AxiosInstance,
  reporteId: string,
  filtros: Omit<FiltrosReporte, "formato"> = {},
) {
  return useQuery({
    queryKey: [...claveReportes, reporteId, filtros],
    enabled: Boolean(reporteId),
    queryFn: async () =>
      (await cliente.get<Reporte>(`/api/reportes/${reporteId}`, { params: filtros })).data,
  });
}

/** Exporta un reporte a Excel o PDF (`GET /api/reportes/{reporte_id}?formato=`, CU-22): devuelve el archivo. */
export async function descargarReporte(
  cliente: AxiosInstance,
  reporteId: string,
  formato: "xlsx" | "pdf",
  filtros: Omit<FiltrosReporte, "formato"> = {},
): Promise<Blob> {
  return (
    await cliente.get<Blob>(`/api/reportes/${reporteId}`, {
      params: { ...filtros, formato },
      responseType: "blob",
    })
  ).data;
}
