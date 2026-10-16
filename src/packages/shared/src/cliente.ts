import axios, { isAxiosError, type AxiosInstance } from "axios";
import type { components } from "./tipos.gen";

export type ObtenerToken = () => Promise<string | null> | string | null;

export interface OpcionesCliente {
  baseURL: string;
  obtenerToken: ObtenerToken;
}

export type Problema = components["schemas"]["Problema"];
export type ErrorCampo = components["schemas"]["ErrorCampo"];
export type UsuarioActual = components["schemas"]["UsuarioActual"];

/** Error tipado que traduce un problem+json de la API (ver Contrato de la API, �Errores�). */
export class ErrorApi extends Error {
  override name = "ErrorApi";
  status = 0;
  title = "";
  detail = "";
  errores: ErrorCampo[] = [];
}

export function crearCliente({ baseURL, obtenerToken }: OpcionesCliente): AxiosInstance {
  const cliente = axios.create({ baseURL });

  cliente.interceptors.request.use(async (config) => {
    const token = await obtenerToken();
    if (token) config.headers.set("Authorization", `Bearer ${token}`);
    return config;
  });

  cliente.interceptors.response.use(undefined, (error: unknown) => {
    if (!isAxiosError(error) || !error.response) throw error;
    const data: unknown = error.response.data;
    const problema: Partial<Problema> = data && typeof data === "object" ? data : {};
    const errorApi = new ErrorApi(problema.title ?? error.message);
    errorApi.status = error.response.status;
    errorApi.title = problema.title ?? "";
    errorApi.detail = problema.detail ?? "";
    errorApi.errores = problema.errores ?? [];
    throw errorApi;
  });

  return cliente;
}
