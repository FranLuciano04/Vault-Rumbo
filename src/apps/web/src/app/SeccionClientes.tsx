import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useOutletContext } from "react-router";
import { PaginaClientes } from "@/features/clientes/PaginaClientes";

/** Pasa el usuario de la sesión (contexto de RutaProtegida) al listado de clientes. */
export function SeccionClientes({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  return <PaginaClientes cliente={cliente} usuario={usuario} />;
}
