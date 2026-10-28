import { DESTINO_A_DEFINIR, formatearFecha, type UsuarioActual } from "@rumbo/shared";
import { useOportunidad } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { oportunidadAbierta, puedeEscribirOportunidad } from "../permisos";
import { PasajerosOportunidad } from "../PasajerosOportunidad";
import { FormularioCotizacion } from "./FormularioCotizacion";
import { VersionesCotizacion } from "./VersionesCotizacion";

/** Cotizaciones de una oportunidad (CU-06): su contexto, el formulario para emitir y las versiones. */
export function CotizacionesOportunidad({
  cliente,
  usuario,
  oportunidadId,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
  oportunidadId: string;
}) {
  const consulta = useOportunidad(cliente, oportunidadId);
  const oportunidad = consulta.data;

  if (consulta.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        No pudimos cargar la oportunidad: no existe o no la podés ver.
      </p>
    );
  }
  if (!oportunidad) {
    return (
      <p aria-busy="true" className="text-sm text-muted-foreground">
        Cargando oportunidad…
      </p>
    );
  }

  const { fecha_desde_tentativa: desde, fecha_hasta_tentativa: hasta } = oportunidad;
  const puedeEmitir =
    oportunidadAbierta(oportunidad) && puedeEscribirOportunidad(usuario, oportunidad);
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">
          {oportunidad.destino_consultado ?? DESTINO_A_DEFINIR}
        </h1>
        <p>{oportunidad.cliente_nombre}</p>
        <p className="text-sm text-muted-foreground">
          <PasajerosOportunidad pasajeros={oportunidad.pasajeros} />
          {desde && hasta ? ` · ${formatearFecha(desde)} al ${formatearFecha(hasta)}` : ""}
        </p>
      </header>
      {puedeEmitir && (
        <FormularioCotizacion
          cliente={cliente}
          usuario={usuario}
          oportunidadId={oportunidadId}
          destinoConsultado={oportunidad.destino_consultado}
        />
      )}
      <VersionesCotizacion
        cliente={cliente}
        oportunidadId={oportunidadId}
        puedeResponder={puedeEmitir}
      />
    </div>
  );
}
