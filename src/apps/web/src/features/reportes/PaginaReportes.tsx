import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";

/** Stub del rojo de T-127: la pantalla de reportes (CU-22) todavía no está implementada. */
export function PaginaReportes(_props: { cliente: AxiosInstance; usuario: UsuarioActual }): never {
  throw new Error("no implementado");
}
