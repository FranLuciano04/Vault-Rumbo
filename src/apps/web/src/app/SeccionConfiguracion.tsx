import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { Navigate, useOutletContext } from "react-router";
import { PaginaConfiguracion } from "@/features/configuracion/PaginaConfiguracion";
import { seccionesVisibles } from "./navegacion";

/** Configuración solo para admin y dueño; el resto vuelve a la agenda. */
export function SeccionConfiguracion({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  if (!seccionesVisibles(usuario).some(({ id }) => id === "configuracion"))
    return <Navigate to="/agenda" replace />;
  return <PaginaConfiguracion cliente={cliente} />;
}
