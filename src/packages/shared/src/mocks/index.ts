import type { RequestHandler } from "msw";
import { setupServer, type SetupServer } from "msw/node";
import { manejadorYo } from "./usuarios";

/** Handlers de ejemplo; cada módulo agrega los suyos en su ticket de contrato. */
export const manejadoresEjemplo: RequestHandler[] = [manejadorYo("empleado")];

/** Servidor MSW para tests (Vitest y Jest); `extra` tiene prioridad sobre los handlers de ejemplo. */
export function crearServidor(...extra: RequestHandler[]): SetupServer {
  return setupServer(...extra, ...manejadoresEjemplo);
}

export * from "./usuarios";
export * from "./alertas";
export * from "./clientes";
export * from "./m1";
export * from "./economia";
export * from "./viajes";
export * from "./oportunidades";
export * from "./hoteles";
