import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { Navigate, useOutletContext } from "react-router";
import { PaginaRedes } from "@/features/redes/PaginaRedes";
import { seccionesVisibles } from "./navegacion";

/** Redes solo para quien tiene acceso al módulo (RF-117); el resto vuelve a la agenda. */
export function SeccionRedes({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  if (!seccionesVisibles(usuario).some(({ id }) => id === "redes"))
    return <Navigate to="/agenda" replace />;
  return <PaginaRedes cliente={cliente} />;
}
