const ESCALA = 10_000n;
/** Importe de un ítem: decimal positivo con hasta 4 decimales; admite coma o punto. */
export const IMPORTE = /^\d+([.,]\d{1,4})?$/;

/** Importe como lo guarda la API: texto decimal con punto, sin float. */
export const importeComoTexto = (valor: string) => valor.trim().replace(",", ".");

/** Suma de importes en texto decimal (BigInt, sin float); los que no son importes válidos no suman. */
export function sumarImportes(importes: readonly string[]): string {
  const total = importes
    .map((importe) => importe.trim())
    .filter((importe) => IMPORTE.test(importe))
    .reduce((suma, importe) => {
      const [entero = "0", decimales = ""] = importeComoTexto(importe).split(".");
      return suma + BigInt(entero) * ESCALA + BigInt(decimales.padEnd(4, "0"));
    }, 0n);
  return `${(total / ESCALA).toString()}.${(total % ESCALA).toString().padStart(4, "0")}`;
}

/** «Hoy» en Buenos Aires como `YYYY-MM-DD`. */
function hoyEnBuenosAires(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).format(
    new Date(),
  );
}

/** Fecha de hoy más `meses`, como `YYYY-MM-DD`; si el día no existe en el mes destino, el último. */
export function sumarMesesAHoy(meses: number): string {
  const [anio = 0, mes = 1, dia = 1] = hoyEnBuenosAires().split("-").map(Number);
  const destino = new Date(Date.UTC(anio, mes - 1 + meses, 1));
  const ultimoDia = new Date(
    Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0),
  ).getUTCDate();
  destino.setUTCDate(Math.min(dia, ultimoDia));
  return destino.toISOString().slice(0, 10);
}
