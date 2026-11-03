import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useOutletContext } from "react-router";
import { PaginaReportes } from "@/features/reportes/PaginaReportes";

/** Pasa el usuario de la sesión (contexto de RutaProtegida) a los reportes. */
export function SeccionReportes({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  return <PaginaReportes cliente={cliente} usuario={usuario} />;
}
