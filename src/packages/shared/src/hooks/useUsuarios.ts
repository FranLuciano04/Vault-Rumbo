import { useQuery } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import type { AsesorDelCliente } from "../cliente";
import type {
  ComisionPorDefecto,
  FiltrosListado,
  Pagina,
  Usuario,
  UsuarioCrear,
  UsuarioEditar,
} from "../modelos";
import { useAccion } from "./useAccion";
import { claveYo } from "./useYo";

export const claveUsuarios = ["usuarios"] as const;

/** Listado de usuarios (`GET /api/usuarios`, CU-25; admin y dueño). */
export function useUsuarios(cliente: AxiosInstance, filtros: Omit<FiltrosListado, "buscar"> = {}) {
  return useQuery({
    queryKey: [...claveUsuarios, "lista", filtros],
    queryFn: async () =>
      (await cliente.get<Pagina<Usuario>>("/api/usuarios", { params: filtros })).data,
  });
}

/** Asesores activos para asignar un cliente (`GET /api/usuarios/asesores`; todos menos el freelance). */
export function useAsesores(cliente: AxiosInstance) {
  return useQuery({
    queryKey: [...claveUsuarios, "asesores"],
    queryFn: async () => (await cliente.get<AsesorDelCliente[]>("/api/usuarios/asesores")).data,
  });
}

/** Un usuario (`GET /api/usuarios/{usuario_id}`, CU-25). */
export function useUsuario(cliente: AxiosInstance, usuarioId: string) {
  return useQuery({
    queryKey: [...claveUsuarios, usuarioId],
    enabled: Boolean(usuarioId),
    queryFn: async () => (await cliente.get<Usuario>(`/api/usuarios/${usuarioId}`)).data,
  });
}

/** Alta de usuario (`POST /api/usuarios`, CU-25). */
export function useCrearUsuario(cliente: AxiosInstance) {
  return useAccion(
    claveUsuarios,
    async (datos: UsuarioCrear) => (await cliente.post<Usuario>("/api/usuarios", datos)).data,
  );
}

/** Cambio de rol o accesos (`PATCH /api/usuarios/{usuario_id}`, CU-25). */
export function useEditarUsuario(cliente: AxiosInstance) {
  return useAccion(
    claveUsuarios,
    async ({ usuarioId, datos }: { usuarioId: string; datos: UsuarioEditar }) =>
      (await cliente.patch<Usuario>(`/api/usuarios/${usuarioId}`, datos)).data,
    [claveYo], // si edita al propio usuario, cambia su rol o sus accesos
  );
}

/** Baja lógica (`POST /api/usuarios/{usuario_id}/baja`, CU-25). */
export function useDarDeBajaUsuario(cliente: AxiosInstance) {
  return useAccion(
    claveUsuarios,
    async (usuarioId: string) =>
      (await cliente.post<Usuario>(`/api/usuarios/${usuarioId}/baja`)).data,
  );
}

/** Comisión por defecto de un vendedor (`PUT /api/usuarios/{usuario_id}/comision-por-defecto`, CU-13). */
export function useConfigurarComisionPorDefecto(cliente: AxiosInstance) {
  return useAccion(
    claveUsuarios,
    async ({ usuarioId, datos }: { usuarioId: string; datos: ComisionPorDefecto }) =>
      (await cliente.put<Usuario>(`/api/usuarios/${usuarioId}/comision-por-defecto`, datos)).data,
    [claveYo],
  );
}
