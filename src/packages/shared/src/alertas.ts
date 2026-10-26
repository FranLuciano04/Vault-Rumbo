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

export interface DatoDeContexto {
  etiqueta: "Viaje" | "Oportunidad" | "Cliente" | "Importe";
  valor: string;
}

/** Viaje, oportunidad, cliente e importe del pago de la alerta, como pares etiqueta/valor (CU-14). */
export function datosDeContexto({ contexto }: Alerta): DatoDeContexto[] {
  const { viaje, oportunidad, cliente, pago } = contexto;
  const datos: (DatoDeContexto | null)[] = [
    viaje && { etiqueta: "Viaje", valor: viaje.destino },
    oportunidad && { etiqueta: "Oportunidad", valor: oportunidad.destino_consultado },
    cliente && { etiqueta: "Cliente", valor: cliente.nombre },
    pago && {
      etiqueta: "Importe",
      valor: `${formatearImporte(pago.monto, pago.moneda)} · vence ${formatearFecha(pago.vencimiento)}`,
    },
  ];
  return datos.flatMap((dato) => (dato ? [dato] : []));
}

/** Viaje, oportunidad, cliente y pago de la alerta, como en el prototipo (CU-14). */
export function lineaDeContexto(alerta: Alerta): string[] {
  return datosDeContexto(alerta).map(({ etiqueta, valor }) =>
    etiqueta === "Viaje" || etiqueta === "Oportunidad" ? `${etiqueta}: ${valor}` : valor,
  );
}
