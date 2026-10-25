import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useOutletContext } from "react-router";
import { PaginaAgenda } from "@/features/alertas/PaginaAgenda";

/** Pasa el usuario de la sesión (contexto de RutaProtegida) a la agenda del día. */
export function SeccionAgenda({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  return <PaginaAgenda cliente={cliente} usuario={usuario} />;
}
