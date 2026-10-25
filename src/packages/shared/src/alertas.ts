import { formatearFecha, formatearImporte } from "./formato";
import type { Alerta } from "./modelos";

const ZONA = "America/Argentina/Buenos_Aires";

/** El día de hoy en Buenos Aires, `aaaa-mm-dd`. */
export function hoyEnBuenosAires(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: ZONA }).format(new Date());
}

/** Días enteros que pasaron entre `fecha` y `hoy` (ambas `aaaa-mm-dd`). */
export function diasDeAtraso(fecha: string, hoy: string): number {
  return Math.round((Date.parse(hoy) - Date.parse(fecha)) / 86_400_000);
}

/** Viaje, oportunidad, cliente y pago de la alerta, como en el prototipo (CU-14). */
export function lineaDeContexto({ contexto }: Alerta): string[] {
  return [
    contexto.viaje && `Viaje: ${contexto.viaje.destino}`,
    contexto.oportunidad && `Oportunidad: ${contexto.oportunidad.destino_consultado}`,
    contexto.cliente?.nombre,
    contexto.pago &&
      `${formatearImporte(contexto.pago.monto, contexto.pago.moneda)} · vence ${formatearFecha(contexto.pago.vencimiento)}`,
  ].flatMap((parte) => (parte ? [parte] : []));
}
