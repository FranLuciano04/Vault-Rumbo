const ZONA = "America/Argentina/Buenos_Aires";

/** El día de hoy en Buenos Aires, `aaaa-mm-dd`. */
export function hoyEnBuenosAires(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: ZONA }).format(new Date());
}

/** Días enteros que pasaron entre `fecha` y `hoy` (ambas `aaaa-mm-dd`). */
export function diasDeAtraso(fecha: string, hoy: string): number {
  return Math.round((Date.parse(hoy) - Date.parse(fecha)) / 86_400_000);
}
