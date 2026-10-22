import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import type {
  Cliente,
  ClienteCrear,
  ClienteEditar,
  HistorialCliente,
  PaginaClientes,
} from "../cliente";

export interface FiltrosClientes {
  buscar?: string;
  etiqueta?: string;
  mios?: boolean;
  pagina?: number;
  por_pagina?: number;
}

const claveClientes = ["clientes"] as const;

/** Búsqueda paginada de clientes (`GET /api/clientes`, CU-03). */
export function useClientes(cliente: AxiosInstance, filtros?: FiltrosClientes) {
  return useQuery({
    queryKey: [...claveClientes, "buscar", filtros],
    queryFn: async () =>
      (await cliente.get<PaginaClientes>("/api/clientes", { params: filtros })).data,
  });
}

/** Ficha de un cliente (`GET /api/clientes/{id}`, CU-03). */
export function useCliente(cliente: AxiosInstance, id: string) {
  return useQuery({
    queryKey: [...claveClientes, id],
    queryFn: async () => (await cliente.get<Cliente>(`/api/clientes/${id}`)).data,
  });
}

/** Oportunidades, viajes y reseñas del cliente (`GET /api/clientes/{id}/historial`, CU-03). */
export function useHistorialCliente(cliente: AxiosInstance, id: string) {
  return useQuery({
    queryKey: [...claveClientes, id, "historial"],
    queryFn: async () =>
      (await cliente.get<HistorialCliente>(`/api/clientes/${id}/historial`)).data,
  });
}

/** Alta de cliente (`POST /api/clientes`, CU-02); un 409 trae los posibles duplicados (A1). */
export function useCrearCliente(cliente: AxiosInstance) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datos: ClienteCrear) =>
      (await cliente.post<Cliente>("/api/clientes", datos)).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: claveClientes }),
  });
}

/** Edición parcial de la ficha (`PATCH /api/clientes/{id}`, CU-03). */
export function useEditarCliente(cliente: AxiosInstance) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: ClienteEditar }) =>
      (await cliente.patch<Cliente>(`/api/clientes/${id}`, cambios)).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: claveClientes }),
  });
}
