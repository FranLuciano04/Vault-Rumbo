import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useLocation, useOutletContext } from "react-router";
import { PaginaViajes } from "@/features/viajes/PaginaViajes";

/** Pasa el usuario de la sesión (contexto de RutaProtegida) al listado de viajes. */
export function SeccionViajes({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  // Los filtros se leen de la URL al montar: si cambia la búsqueda, la pantalla se remonta.
  const { search } = useLocation();
  return <PaginaViajes key={search} cliente={cliente} usuario={usuario} />;
}
