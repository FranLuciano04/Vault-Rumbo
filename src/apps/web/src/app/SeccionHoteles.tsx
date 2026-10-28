import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useOutletContext } from "react-router";
import { PaginaHoteles } from "@/features/hoteles/PaginaHoteles";

/** Pasa el usuario de la sesión (contexto de RutaProtegida) al catálogo de hoteles. */
export function SeccionHoteles({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  return <PaginaHoteles cliente={cliente} usuario={usuario} />;
}
