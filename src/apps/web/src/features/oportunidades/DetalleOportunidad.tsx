import {
  ETIQUETA_ESTADO_OPORTUNIDAD,
  ETIQUETA_MOTIVO_PERDIDA,
  formatearFecha,
  type UsuarioActual,
} from "@rumbo/shared";
import { useOportunidad } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useParams } from "react-router";
import { AccionesOportunidad } from "./AccionesOportunidad";
import { InsistenciasOportunidad } from "./InsistenciasOportunidad";
import { InteraccionesOportunidad } from "./InteraccionesOportunidad";

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
  const abierta = oportunidad.estado !== "ganada" && oportunidad.estado !== "perdida";
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{oportunidad.destino_consultado}</h1>
        <p>{oportunidad.cliente_nombre}</p>
        <p className="text-sm text-muted-foreground">
          {oportunidad.pasajeros} {oportunidad.pasajeros === 1 ? "pasajero" : "pasajeros"}
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
      <AccionesOportunidad cliente={cliente} oportunidad={oportunidad} />
      <InteraccionesOportunidad
        cliente={cliente}
        usuario={usuario}
        oportunidad={oportunidad}
        puedeRegistrar={abierta}
      />
      <InsistenciasOportunidad
        cliente={cliente}
        oportunidadId={oportunidad.id}
        puedeAgendar={abierta}
      />
    </div>
  );
}
