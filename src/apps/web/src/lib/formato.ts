export type Moneda = "ARS" | "USD";

const SIMBOLO: Record<Moneda, string> = { ARS: "$", USD: "US$" };
const ZONA = "America/Argentina/Buenos_Aires";

/** Importe decimal (string, nunca float) como «$ 1.234,50» o «US$ 1.500,00» (RNF-16). */
export function formatearImporte(valor: string, moneda: Moneda): string {
  const negativo = valor.startsWith("-");
  const [entero = "0", decimales = ""] = valor.replace(/^[-+]/, "").split(".");
  const miles = entero.replace(/\B(?=(\d{3})+$)/g, ".");
  const centavos = decimales.padEnd(2, "0").slice(0, 2);
  return `${negativo ? "-" : ""}${SIMBOLO[moneda]} ${miles},${centavos}`;
}

/** Fecha de negocio `YYYY-MM-DD` o timestamptz ISO como `dd/mm/aa`, en hora de Buenos Aires (RNF-16). */
export function formatearFecha(fecha: string): string {
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ? fecha
    : new Intl.DateTimeFormat("sv-SE", { timeZone: ZONA }).format(new Date(fecha));
  const [anio = "", mes = "", d = ""] = dia.split("-");
  return `${d}/${mes}/${anio.slice(2)}`;
}
