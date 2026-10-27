import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useOutletContext } from "react-router";
import { PaginaOportunidades } from "@/features/oportunidades/PaginaOportunidades";

/** Pasa el usuario de la sesión (contexto de RutaProtegida) al embudo de oportunidades. */
export function SeccionOportunidades({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  return <PaginaOportunidades cliente={cliente} usuario={usuario} />;
}
