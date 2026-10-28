import {
  DESTINO_A_DEFINIR,
  ETIQUETA_ESTADO_OPORTUNIDAD,
  ETIQUETA_MOTIVO_PERDIDA,
  formatearFecha,
  type UsuarioActual,
} from "@rumbo/shared";
import { useOportunidad } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Link, useParams } from "react-router";
import { AccionesOportunidad } from "./AccionesOportunidad";
import { EdicionDestinoPasajeros } from "./EdicionDestinoPasajeros";
import { InsistenciasOportunidad } from "./InsistenciasOportunidad";
import { InteraccionesOportunidad } from "./InteraccionesOportunidad";
import { PasajerosOportunidad } from "./PasajerosOportunidad";
import { oportunidadAbierta, puedeEscribirOportunidad } from "./permisos";

/** Detalle de una oportunidad (CU-05): su contexto, su historia y las acciones de seguimiento. */
export function DetalleOportunidad({
  cliente,
  usuario,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
}) {
  const { id = "" } = useParams();
  const consulta = useOportunidad(cliente, id);
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
      <p role="status" aria-busy="true" className="text-sm text-muted-foreground">
        Cargando oportunidad…
      </p>
    );
  }

  const { fecha_desde_tentativa: desde, fecha_hasta_tentativa: hasta } = oportunidad;
  const abierta = oportunidadAbierta(oportunidad);
  const puedeEscribir = puedeEscribirOportunidad(usuario, oportunidad);
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
        <p className="text-sm font-medium">{ETIQUETA_ESTADO_OPORTUNIDAD[oportunidad.estado]}</p>
        {oportunidad.motivo_perdida && (
          <p className="text-sm text-muted-foreground">
            Motivo: {ETIQUETA_MOTIVO_PERDIDA[oportunidad.motivo_perdida]}
            {oportunidad.motivo_perdida_detalle ? ` (${oportunidad.motivo_perdida_detalle})` : ""}
          </p>
        )}
      </header>
      <Link
        to={`/oportunidades/${oportunidad.id}/cotizaciones`}
        className="text-sm font-medium underline"
      >
        Cotizaciones
      </Link>
      {abierta && puedeEscribir && (
        <EdicionDestinoPasajeros cliente={cliente} oportunidad={oportunidad} />
      )}
      {puedeEscribir && <AccionesOportunidad cliente={cliente} oportunidad={oportunidad} />}
      <InteraccionesOportunidad
        cliente={cliente}
        usuario={usuario}
        oportunidad={oportunidad}
        puedeRegistrar={abierta && puedeEscribir}
      />
      <InsistenciasOportunidad
        cliente={cliente}
        oportunidadId={oportunidad.id}
        puedeAgendar={abierta && puedeEscribir}
      />
    </div>
  );
}
