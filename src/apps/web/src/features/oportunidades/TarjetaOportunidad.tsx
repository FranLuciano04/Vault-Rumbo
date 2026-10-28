import {
  DESTINO_A_DEFINIR,
  ETIQUETA_MOTIVO_PERDIDA,
  textoPasajeros,
  type Oportunidad,
} from "@rumbo/shared";
import { Link } from "react-router";

/** Fecha `aaaa-mm-dd` como `dd/mm/aa` (sin pasar por `Date`, para no correrla por zona horaria). */
const fechaCorta = (fecha: string) => {
  const [anio = "", mes = "", dia = ""] = fecha.split("-");
  return `${dia}/${mes}/${anio.slice(2)}`;
};

/** Tarjeta de una oportunidad en su columna del embudo (CU-05); da acceso a su detalle. */
export function TarjetaOportunidad({ oportunidad }: { oportunidad: Oportunidad }) {
  const {
    fecha_desde_tentativa: desde,
    fecha_hasta_tentativa: hasta,
    motivo_perdida,
  } = oportunidad;
  return (
    <li>
      <Link
        to={`/oportunidades/${oportunidad.id}`}
        className="block space-y-1 rounded-lg border bg-card p-3 text-sm hover:bg-accent"
      >
        <span className="block font-medium">
          {oportunidad.destino_consultado ?? DESTINO_A_DEFINIR}
        </span>
        <span className="block">{oportunidad.cliente_nombre}</span>
        <span className="block text-muted-foreground">
          {textoPasajeros(oportunidad.pasajeros)}
          {desde && hasta ? ` · ${fechaCorta(desde)} al ${fechaCorta(hasta)}` : ""}
        </span>
        {motivo_perdida && (
          <span className="block text-muted-foreground">
            Motivo: {ETIQUETA_MOTIVO_PERDIDA[motivo_perdida]}
          </span>
        )}
      </Link>
    </li>
  );
}
