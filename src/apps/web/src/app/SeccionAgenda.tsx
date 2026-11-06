import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useLocation, useOutletContext } from "react-router";
import { PaginaAgenda } from "@/features/alertas/PaginaAgenda";

/** Pasa el usuario de la sesión (contexto de RutaProtegida) a la agenda del día. */
export function SeccionAgenda({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  // Los filtros se leen de la URL al montar: si cambia la búsqueda, la pantalla se remonta.
  const { search } = useLocation();
  return <PaginaAgenda key={search} cliente={cliente} usuario={usuario} />;
}
