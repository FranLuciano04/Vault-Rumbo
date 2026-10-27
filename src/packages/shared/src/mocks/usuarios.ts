import { http, HttpResponse, type RequestHandler } from "msw";
import type { UsuarioActual } from "../cliente";

export type RolMock = UsuarioActual["rol"];

/** Un usuario de la sesión por rol, con la forma del esquema de `GET /api/auth/yo` (RF-141). */
export const usuariosPorRol: Record<RolMock, UsuarioActual> = {
  admin: {
    id: "0b8f7a52-4c1e-4f0a-9a57-1d2f6c3b7a01",
    nombre: "Lucía Fernández",
    email: "lucia@rumbo.test",
    rol: "admin",
    acceso_redes: true,
  },
  dueno: {
    id: "5d3e9c18-7b24-4a6f-8e10-2c4a9b6d5f02",
    nombre: "Marta Giménez",
    email: "marta@rumbo.test",
    rol: "dueno",
    acceso_redes: true,
  },
  empleado: {
    id: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03",
    nombre: "Ana Pérez",
    email: "ana@rumbo.test",
    rol: "empleado",
    acceso_redes: false,
  },
  freelance: {
    id: "e7b20d94-6a3f-4c15-9d8e-0b5a3f7c2e04",
    nombre: "Tomás Roldán",
    email: "tomas@rumbo.test",
    rol: "freelance",
    acceso_redes: false,
  },
};

/** Handler MSW de `GET /api/auth/yo` que responde con el usuario del rol indicado (RF-141). */
export function manejadorYo(rol: RolMock): RequestHandler {
  return http.get("*/api/auth/yo", () => HttpResponse.json(usuariosPorRol[rol]));
}
