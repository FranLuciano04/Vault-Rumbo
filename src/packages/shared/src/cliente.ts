import type { AxiosInstance } from "axios";

export type ObtenerToken = () => Promise<string | null> | string | null;

export interface OpcionesCliente {
  baseURL: string;
  obtenerToken: ObtenerToken;
}

export class ErrorApi extends Error {
  status = 0;
  title = "";
  detail = "";
  errores: { campo: string; mensaje: string }[] = [];
}

export function crearCliente(_opciones: OpcionesCliente): AxiosInstance {
  throw new Error("no implementado");
}
