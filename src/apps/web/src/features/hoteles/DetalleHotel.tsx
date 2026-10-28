import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";

/** Stub (T-082): el detalle del hotel con sus reseñas todavía no está implementado. */
export function DetalleHotel(_props: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
  hotelId: string;
}): never {
  throw new Error("no implementado");
}
