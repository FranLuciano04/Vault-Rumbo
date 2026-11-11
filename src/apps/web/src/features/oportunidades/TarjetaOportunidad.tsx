import { useDraggable } from "@dnd-kit/core";
import {
  DESTINO_A_DEFINIR,
  ETIQUETA_MOTIVO_PERDIDA,
  type EstadoOportunidad,
  type Oportunidad,
} from "@rumbo/shared";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { MenuMoverOportunidad } from "./MenuMoverOportunidad";
import { PasajerosOportunidad } from "./PasajerosOportunidad";
import { DESTINOS_POR_ESTADO } from "./transiciones";

/** Fecha `aaaa-mm-dd` como `dd/mm/aa` (sin pasar por `Date`, para no correrla por zona horaria). */
const fechaCorta = (fecha: string) => {
  const [anio = "", mes = "", dia = ""] = fecha.split("-");
  return `${dia}/${mes}/${anio.slice(2)}`;
};

/**
 * Tarjeta de una oportunidad en su columna del embudo (CU-05); da acceso a su detalle.
 * Si `alMover` está, se puede arrastrar a otra columna o moverla con el menú (RF-016).
 */
export function TarjetaOportunidad({
  oportunidad,
  alMover,
}: {
  oportunidad: Oportunidad;
  alMover?: (destino: EstadoOportunidad) => void;
}) {
  const destinos = DESTINOS_POR_ESTADO[oportunidad.estado];
  const movible = alMover !== undefined && destinos.length > 0;
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: oportunidad.id,
    disabled: !movible,
    data: { oportunidad },
  });
  const {
    fecha_desde_tentativa: desde,
    fecha_hasta_tentativa: hasta,
    motivo_perdida,
  } = oportunidad;
  return (
    <li
      ref={setNodeRef}
      {...listeners}
      className={cn(movible && "touch-manipulation", isDragging && "opacity-50")}
    >
      <Link
        to={`/oportunidades/${oportunidad.id}`}
        className="block space-y-1 rounded-lg border bg-card p-3 text-sm hover:bg-accent"
      >
        <span className="block font-medium">
          {oportunidad.destino_consultado ?? DESTINO_A_DEFINIR}
        </span>
        <span className="block">{oportunidad.cliente_nombre}</span>
        <span className="block text-muted-foreground">
          <PasajerosOportunidad pasajeros={oportunidad.pasajeros} />
          {desde && hasta ? ` · ${fechaCorta(desde)} al ${fechaCorta(hasta)}` : ""}
        </span>
        {motivo_perdida && (
          <span className="block text-muted-foreground">
            Motivo: {ETIQUETA_MOTIVO_PERDIDA[motivo_perdida]}
          </span>
        )}
      </Link>
      {alMover && movible && (
        <MenuMoverOportunidad
          nombre={oportunidad.destino_consultado ?? DESTINO_A_DEFINIR}
          destinos={destinos}
          alElegir={alMover}
        />
      )}
    </li>
  );
}
