import { http, HttpResponse, type RequestHandler } from "msw";
import { setupServer, type SetupServer } from "msw/node";

/** Handlers de ejemplo; cada módulo agrega los suyos en su ticket de contrato. */
export const manejadoresEjemplo: RequestHandler[] = [
  http.get("*/api/auth/yo", () => HttpResponse.json({ email: "ana@rumbo.test", rol: "empleado" })),
];

/** Servidor MSW para tests (Vitest y Jest); `extra` se suma a los handlers de ejemplo. */
export function crearServidor(...extra: RequestHandler[]): SetupServer {
  return setupServer(...manejadoresEjemplo, ...extra);
}

export type RolMock = "admin" | "dueno" | "empleado" | "freelance";

/** T-015: un usuario de la sesión por rol, con la forma del esquema de `GET /api/auth/yo`. */
export const usuariosPorRol: Record<RolMock, Record<string, unknown>> = new Proxy(
  {} as Record<RolMock, Record<string, unknown>>,
  {
    get() {
      throw new Error("no implementado");
    },
  },
);

/** T-015: handler MSW de `GET /api/auth/yo` que responde con el usuario del rol indicado. */
export function manejadorYo(_rol: RolMock): RequestHandler {
  throw new Error("no implementado");
}
