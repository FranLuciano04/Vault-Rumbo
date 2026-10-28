import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useOutletContext, useParams } from "react-router";
import { DetalleHotel } from "@/features/hoteles/DetalleHotel";

/** Pasa el id de la ruta y el usuario de la sesión (contexto de RutaProtegida) al detalle del hotel. */
export function SeccionDetalleHotel({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  const { hotelId = "" } = useParams();
  return <DetalleHotel cliente={cliente} usuario={usuario} hotelId={hotelId} />;
}
