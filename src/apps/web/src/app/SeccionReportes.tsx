import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { Navigate, useOutletContext } from "react-router";
import { PaginaReportes } from "@/features/reportes/PaginaReportes";
import { seccionesVisibles } from "./navegacion";

/** Reportes solo para admin y dueño; el resto vuelve a la agenda. */
export function SeccionReportes({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  if (!seccionesVisibles(usuario).some(({ id }) => id === "reportes"))
    return <Navigate to="/agenda" replace />;
  return <PaginaReportes cliente={cliente} />;
}
