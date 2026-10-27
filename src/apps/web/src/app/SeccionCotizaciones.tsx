import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useOutletContext, useParams } from "react-router";
import { CotizacionesOportunidad } from "@/features/oportunidades/cotizaciones/CotizacionesOportunidad";

/** Pasa el usuario de la sesión y el id de la ruta a las cotizaciones de la oportunidad. */
export function SeccionCotizaciones({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  const { id = "" } = useParams();
  return <CotizacionesOportunidad cliente={cliente} usuario={usuario} oportunidadId={id} />;
}
