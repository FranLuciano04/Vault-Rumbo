import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useOutletContext } from "react-router";
import { DetalleOportunidad } from "@/features/oportunidades/DetalleOportunidad";

/** Pasa el usuario de la sesión (contexto de RutaProtegida) al detalle de la oportunidad. */
export function SeccionDetalleOportunidad({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  return <DetalleOportunidad cliente={cliente} usuario={usuario} />;
}
