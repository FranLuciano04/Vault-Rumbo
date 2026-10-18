import type { UsuarioActual } from "@rumbo/shared";
import { Navigate, useOutletContext, useParams } from "react-router";
import { seccionesVisibles } from "./navegacion";

/** Marcador de cada sección hasta que su módulo la implemente; si el rol no la ve, vuelve a la agenda. */
export function SeccionPendiente() {
  const usuario = useOutletContext<UsuarioActual>();
  const { seccion } = useParams();
  const actual = seccionesVisibles(usuario).find(({ id }) => id === seccion);

  if (!actual) return <Navigate to="/agenda" replace />;
  return <h1 className="text-2xl font-semibold">{actual.etiqueta}</h1>;
}
