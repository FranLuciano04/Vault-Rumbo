/** El día siguiente a `fecha` (`aaaa-mm-dd`). */
export function diaSiguiente(fecha: string): string {
  return new Date(Date.parse(fecha) + 86_400_000).toISOString().slice(0, 10);
}
