export type Moneda = "ARS" | "USD";

const SIMBOLO: Record<Moneda, string> = { ARS: "$", USD: "US$" };
const ZONA = "America/Argentina/Buenos_Aires";

/** Importe decimal (string, nunca float) como «$ 1.234,50» o «US$ 1.500,00»; redondea half-up a 2 decimales (RNF-16). */
export function formatearImporte(valor: string, moneda: Moneda): string {
  if (!/^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(valor)) throw new Error(`Importe inválido: «${valor}»`);
  const negativo = valor.startsWith("-");
  const [entero = "", decimales = ""] = valor.replace(/^[-+]/, "").split(".");
  const centavosCrudos = decimales.padEnd(3, "0");
  // Todo el importe en centavos como dígitos; el tercer decimal decide el redondeo.
  const redondeado = (
    BigInt(`${entero || "0"}${centavosCrudos.slice(0, 2)}`) +
    (centavosCrudos.charCodeAt(2) >= 53 ? 1n : 0n)
  )
    .toString()
    .padStart(3, "0");
  const miles = redondeado.slice(0, -2).replace(/\B(?=(\d{3})+$)/g, ".");
  const esCero = /^0+$/.test(redondeado);
  return `${negativo && !esCero ? "-" : ""}${SIMBOLO[moneda]} ${miles},${redondeado.slice(-2)}`;
}

/** Fecha de negocio `YYYY-MM-DD` o timestamptz ISO como `dd/mm/aa`, en hora de Buenos Aires (RNF-16). */
export function formatearFecha(fecha: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(fecha) || Number.isNaN(new Date(fecha).getTime())) {
    throw new Error(`Fecha inválida: «${fecha}»`);
  }
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ? fecha
    : new Intl.DateTimeFormat("sv-SE", { timeZone: ZONA }).format(new Date(fecha));
  const [anio = "", mes = "", d = ""] = dia.split("-");
  return `${d}/${mes}/${anio.slice(2)}`;
}

/** Puntaje promedio (texto decimal de la API, p. ej. «4.35») como «4,4»: un decimal, half-up y sin float. */
export function formatearPuntaje(puntaje: string): string {
  if (!/^\d+(\.\d*)?$/.test(puntaje)) throw new Error(`Puntaje inválido: «${puntaje}»`);
  const [entero = "", decimales = ""] = puntaje.split(".");
  const crudos = decimales.padEnd(2, "0");
  const decimas = (
    BigInt(`${entero}${crudos.slice(0, 1)}`) + (crudos.charCodeAt(1) >= 53 ? 1n : 0n)
  )
    .toString()
    .padStart(2, "0");
  return `${decimas.slice(0, -1)},${decimas.slice(-1)}`;
}
