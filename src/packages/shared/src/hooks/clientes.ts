import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import type {
  Cliente,
  ClienteCrear,
  ClienteEditar,
  HistorialCliente,
  PaginaClientes,
  SegmentoCliente,
} from "../cliente";

export interface FiltrosClientes {
  buscar?: string;
  /** El cliente tiene que tener todas; viajan como `?etiquetas=a&etiquetas=b`. */
  etiquetas?: string[];
  segmento?: SegmentoCliente;
  mios?: boolean;
  pagina?: number;
  por_pagina?: number;
}

const claveClientes = ["clientes"] as const;

/** Búsqueda paginada de clientes (`GET /api/clientes`, CU-03). */
export function useClientes(cliente: AxiosInstance, filtros?: FiltrosClientes) {
  return useQuery({
    queryKey: [...claveClientes, "buscar", filtros],
    // Al paginar o filtrar, la lista anterior sigue visible hasta que llega la nueva.
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (
        await cliente.get<PaginaClientes>("/api/clientes", {
          params: filtros,
          // Listas como parámetro repetido, sin corchetes: es lo que lee FastAPI.
          paramsSerializer: { indexes: null },
        })
      ).data,
  });
}

/** Etiquetas en uso, sin duplicados y ordenadas (`GET /api/clientes/etiquetas`, RF-031). */
export function useEtiquetasClientes(cliente: AxiosInstance) {
  return useQuery({
    queryKey: [...claveClientes, "etiquetas"],
    queryFn: async () => (await cliente.get<string[]>("/api/clientes/etiquetas")).data,
  });
}

/** Ficha de un cliente (`GET /api/clientes/{id}`, CU-03). */
export function useCliente(cliente: AxiosInstance, id: string) {
  return useQuery({
    queryKey: [...claveClientes, id],
    enabled: Boolean(id),
    queryFn: async () => (await cliente.get<Cliente>(`/api/clientes/${id}`)).data,
  });
}

/** Oportunidades, viajes y reseñas del cliente (`GET /api/clientes/{id}/historial`, CU-03). */
export function useHistorialCliente(cliente: AxiosInstance, id: string) {
  return useQuery({
    queryKey: [...claveClientes, id, "historial"],
    enabled: Boolean(id),
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
    onSuccess: (ficha) => {
      // La respuesta es la ficha ya guardada: se usa tal cual y solo se refrescan las listas.
      queryClient.setQueryData([...claveClientes, ficha.id], ficha);
      void queryClient.invalidateQueries({ queryKey: [...claveClientes, "buscar"] });
      void queryClient.invalidateQueries({ queryKey: [...claveClientes, "etiquetas"] });
    },
  });
}
