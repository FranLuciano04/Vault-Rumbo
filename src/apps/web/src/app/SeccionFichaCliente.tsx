import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useOutletContext } from "react-router";
import { FichaCliente } from "@/features/clientes/FichaCliente";

/** Pasa el usuario de la sesión (contexto de RutaProtegida) a la ficha del cliente. */
export function SeccionFichaCliente({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  return <FichaCliente cliente={cliente} usuario={usuario} />;
}
