import { http, HttpResponse, type RequestHandler } from "msw";
import { setupServer, type SetupServer } from "msw/node";

/** Handlers de ejemplo; cada módulo agrega los suyos en su ticket de contrato. */
export const manejadoresEjemplo: RequestHandler[] = [
  http.get("*/api/auth/yo", () => HttpResponse.json({ email: "ana@rumbo.test", rol: "vendedor" })),
];

/** Servidor MSW para tests (Vitest y Jest); `extra` se suma a los handlers de ejemplo. */
export function crearServidor(...extra: RequestHandler[]): SetupServer {
  return setupServer(...manejadoresEjemplo, ...extra);
}
