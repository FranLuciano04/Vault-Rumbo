import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useOutletContext } from "react-router";
import { NuevoCliente } from "@/features/clientes/NuevoCliente";

/** Pasa el usuario de la sesión (contexto de RutaProtegida) al alta de cliente. */
export function SeccionNuevoCliente({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  return <NuevoCliente cliente={cliente} usuario={usuario} />;
}
