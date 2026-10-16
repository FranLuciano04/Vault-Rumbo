import { useQuery } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { ErrorApi, type UsuarioActual } from "../cliente";

export const claveYo = ["auth", "yo"] as const;

/** Usuario de Rumbo de la sesión, con su rol y accesos (`GET /api/auth/yo`, CU-24). */
export function useYo(cliente: AxiosInstance) {
  return useQuery({
    queryKey: claveYo,
    // Un 401 no se arregla reintentando: la sesión hay que renovarla.
    retry: (intentos, error) =>
      !(error instanceof ErrorApi && error.status === 401) && intentos < 3,
    queryFn: async () => (await cliente.get<UsuarioActual>("/api/auth/yo")).data,
  });
}
