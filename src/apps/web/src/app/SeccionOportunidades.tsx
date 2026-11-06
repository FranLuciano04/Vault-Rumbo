import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useLocation, useOutletContext } from "react-router";
import { PaginaOportunidades } from "@/features/oportunidades/PaginaOportunidades";

/** Pasa el usuario de la sesión (contexto de RutaProtegida) al embudo de oportunidades. */
export function SeccionOportunidades({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  // Los filtros se leen de la URL al montar: si cambia la búsqueda, la pantalla se remonta.
  const { search } = useLocation();
  return <PaginaOportunidades key={search} cliente={cliente} usuario={usuario} />;
}
