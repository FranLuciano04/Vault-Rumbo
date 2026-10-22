import type { AxiosInstance } from "axios";

export interface FiltrosClientes {
  buscar?: string;
  etiqueta?: string;
  mios?: boolean;
  pagina?: number;
  por_pagina?: number;
}

const NO_IMPLEMENTADO = "no implementado";

/** Stubs (T-039, fase roja): hooks de clientes sobre TanStack Query. */
export function useClientes(_cliente: AxiosInstance, _filtros?: FiltrosClientes): never {
  throw new Error(NO_IMPLEMENTADO);
}
export function useCliente(_cliente: AxiosInstance, _id: string): never {
  throw new Error(NO_IMPLEMENTADO);
}
export function useHistorialCliente(_cliente: AxiosInstance, _id: string): never {
  throw new Error(NO_IMPLEMENTADO);
}
export function useCrearCliente(_cliente: AxiosInstance): never {
  throw new Error(NO_IMPLEMENTADO);
}
export function useEditarCliente(_cliente: AxiosInstance): never {
  throw new Error(NO_IMPLEMENTADO);
}
