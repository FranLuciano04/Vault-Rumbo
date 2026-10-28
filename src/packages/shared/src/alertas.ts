import { formatearFecha, formatearImporte } from "./formato";
import type { Alerta, FiltrosAlertas } from "./modelos";

const ZONA = "America/Argentina/Buenos_Aires";

/** El día de hoy en Buenos Aires, `aaaa-mm-dd`. */
export function hoyEnBuenosAires(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: ZONA }).format(new Date());
}

/** Título de la agenda sin alertas en cada filtro (RF-154); «Todas» tiene sus propios textos. */
export const TITULO_VACIO = {
  atrasadas: "No hay alertas atrasadas",
  hoy: "No hay alertas para hoy",
  proximas: "No hay alertas próximas",
} as const;

/** El día anterior a una fecha ISO (`aaaa-mm-dd`). */
export function diaAnterior(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Pestañas (chips) de la agenda (RF-154). */
export type PestanaAgenda = "todas" | "atrasadas" | "hoy" | "proximas";

/** Filtros de la lista que corresponden a cada pestaña de la agenda. */
export function filtrosDePestana(pestana: PestanaAgenda, hoy: string): FiltrosAlertas {
  if (pestana === "atrasadas") return { hasta: diaAnterior(hoy) };
  if (pestana === "hoy") return { desde: hoy, hasta: hoy };
  if (pestana === "proximas") return { proximas: true };
  return {};
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
    oportunidad && {
      etiqueta: "Oportunidad",
      valor: oportunidad.destino_consultado ?? "Sin destino",
    },
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

/** Aviso al guardar un recordatorio (CU-28), con la fecha en `dd/mm/aa`. */
export function avisoRecordatorio(accion: "creado" | "actualizado", fecha: string): string {
  return `Recordatorio ${accion} para el ${formatearFecha(fecha)}`;
}
