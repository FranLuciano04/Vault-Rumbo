import type { RequestHandler } from "msw";
import type { SetupServer } from "msw/node";

export const manejadoresEjemplo: RequestHandler[] = [];

export function crearServidor(..._extra: RequestHandler[]): SetupServer {
  throw new Error("no implementado");
}
