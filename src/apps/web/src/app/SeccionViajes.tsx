import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useOutletContext } from "react-router";
import { PaginaViajes } from "@/features/viajes/PaginaViajes";

/** Pasa el usuario de la sesión (contexto de RutaProtegida) al listado de viajes. */
export function SeccionViajes({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  return <PaginaViajes cliente={cliente} usuario={usuario} />;
}
