import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import type { ReactElement } from "react";

/**
 * Ficha del viaje (CU-08, CU-10, pantallas 15 y 43). Stub del rojo de T-102: la implementación
 * llega en el verde.
 */
export function FichaViaje(props: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
  viajeId: string;
}): ReactElement {
  throw new Error(`no implementado (viaje ${props.viajeId})`);
}
