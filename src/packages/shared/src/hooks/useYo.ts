import { useQuery } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import type { UsuarioActual } from "../cliente";

export const claveYo = ["auth", "yo"] as const;

/** Usuario de Rumbo de la sesión, con su rol y accesos (`GET /api/auth/yo`, CU-24). */
export function useYo(cliente: AxiosInstance) {
  return useQuery({
    queryKey: claveYo,
    queryFn: async () => (await cliente.get<UsuarioActual>("/api/auth/yo")).data,
  });
}
