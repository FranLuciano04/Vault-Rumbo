import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useOutletContext, useParams } from "react-router";
import { FichaViaje } from "@/features/viajes/FichaViaje";

/** Pasa el viaje de la ruta y el usuario de la sesión (contexto de RutaProtegida) a la ficha. */
export function SeccionFichaViaje({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  const { id = "" } = useParams();
  return <FichaViaje cliente={cliente} usuario={usuario} viajeId={id} />;
}
