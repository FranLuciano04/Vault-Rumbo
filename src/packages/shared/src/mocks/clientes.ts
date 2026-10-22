import type { RequestHandler } from "msw";

/** Stub (T-039, fase roja): clientes ficticios que respetan el esquema `Cliente`. */
export const clientesMock: Record<string, unknown>[] = [];

/** Stub (T-039, fase roja): handlers MSW de las cinco rutas de `/api/clientes`. */
export const manejadoresClientes: RequestHandler[] = [];
