import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useOutletContext } from "react-router";
import { NuevoHotel } from "@/features/hoteles/NuevoHotel";

/** Pasa el usuario de la sesión (contexto de RutaProtegida) al alta de hotel. */
export function SeccionNuevoHotel({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  return <NuevoHotel cliente={cliente} usuario={usuario} />;
}
