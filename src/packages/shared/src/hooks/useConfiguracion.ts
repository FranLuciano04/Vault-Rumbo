import { useQuery } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import type { Configuracion, ConfiguracionEditar } from "../modelos";
import { useAccion } from "./useAccion";

export const claveConfiguracion = ["configuracion"] as const;

/** Parámetros del negocio (`GET /api/configuracion`, CU-06, CU-07, CU-30; admin y dueño). */
export function useConfiguracion(cliente: AxiosInstance) {
  return useQuery({
    queryKey: claveConfiguracion,
    queryFn: async () => (await cliente.get<Configuracion>("/api/configuracion")).data,
  });
}

/** Edición de los parámetros (`PUT /api/configuracion`). */
export function useEditarConfiguracion(cliente: AxiosInstance) {
  return useAccion(
    claveConfiguracion,
    async (datos: ConfiguracionEditar) =>
      (await cliente.put<Configuracion>("/api/configuracion", datos)).data,
  );
}
