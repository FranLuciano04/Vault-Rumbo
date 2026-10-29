import { DECIMAL } from "./esquemas";

/** Importe decimal (hasta 2 decimales, con signo opcional) como centésimas enteras, sin float. */
function aCentesimas(valor: string): bigint {
  const negativo = valor.startsWith("-");
  const [entero = "0", decimales = ""] = valor.replace(/^[-+]/, "").split(".");
  const centesimas = BigInt(`${entero}${decimales.padEnd(2, "0").slice(0, 2)}`);
  return negativo ? -centesimas : centesimas;
}

function deCentesimas(centesimas: bigint): string {
  const absoluto = (centesimas < 0n ? -centesimas : centesimas).toString().padStart(3, "0");
  return `${centesimas < 0n ? "-" : ""}${absoluto.slice(0, -2)}.${absoluto.slice(-2)}`;
}

/** Ganancia (decimal como texto) y margen (fracción) de un precio y un costo; `null` si no son importes válidos. */
export function calcularResultado(precio: string, costo: string) {
  if (!DECIMAL.test(precio.trim()) || !DECIMAL.test(costo.trim())) return null;
  const ganancia = aCentesimas(precio.trim()) - aCentesimas(costo.trim());
  const p = Number(precio);
  return { ganancia: deCentesimas(ganancia), margen: p > 0 ? Number(ganancia) / 100 / p : null };
}

/** El `porcentaje` % de la `ganancia`, redondeado half-up a 2 decimales como `Decimal` (RN-01). */
export function porcentajeDeGanancia(ganancia: string, porcentaje: string): string {
  const producto = aCentesimas(ganancia) * aCentesimas(porcentaje);
  const absoluto = producto < 0n ? -producto : producto;
  const redondeado = (absoluto + 5000n) / 10000n;
  return deCentesimas(producto < 0n ? -redondeado : redondeado);
}
