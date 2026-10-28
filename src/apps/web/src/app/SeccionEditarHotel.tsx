import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useOutletContext } from "react-router";
import { EditarHotel } from "@/features/hoteles/EditarHotel";

/** Pasa el usuario de la sesión (contexto de RutaProtegida) a la edición de hotel. */
export function SeccionEditarHotel({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  return <EditarHotel cliente={cliente} usuario={usuario} />;
}
