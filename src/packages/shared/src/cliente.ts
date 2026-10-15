import axios, { isAxiosError, type AxiosInstance } from "axios";

export type ObtenerToken = () => Promise<string | null> | string | null;

export interface OpcionesCliente {
  baseURL: string;
  obtenerToken: ObtenerToken;
}

export interface ErrorCampo {
  campo: string;
  mensaje: string;
}

/** Error tipado que traduce un problem+json de la API (ver Contrato de la API, «Errores»). */
export class ErrorApi extends Error {
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
    const problema = (error.response.data ?? {}) as Partial<ErrorApi>;
    const errorApi = new ErrorApi(problema.title ?? error.message);
    errorApi.status = problema.status ?? error.response.status;
    errorApi.title = problema.title ?? "";
    errorApi.detail = problema.detail ?? "";
    errorApi.errores = problema.errores ?? [];
    throw errorApi;
  });

  return cliente;
}
