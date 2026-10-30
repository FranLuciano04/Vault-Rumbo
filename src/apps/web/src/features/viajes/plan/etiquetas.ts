import type { EstadoPago, TipoPago } from "@rumbo/shared";

export const ETIQUETA_TIPO_PAGO: Record<TipoPago, string> = {
  sena: "Seña",
  cuota: "Cuota",
  saldo: "Saldo",
};

export const ETIQUETA_ESTADO_PAGO: Record<EstadoPago, string> = {
  pendiente: "Pendiente",
  pagado: "Cobrado",
  vencido: "Vencido",
  anulado: "Anulado",
};

/** Un pago sin cobrar ni anular: el único que se edita, reprograma, anula o divide. */
export const estaSinCobrar = (estado: EstadoPago) => estado === "pendiente" || estado === "vencido";

/** «la seña», «la cuota 2» o «el saldo»: cómo se nombra un pago en los textos de la interfaz. */
export function nombreDePago(tipo: TipoPago, numeroDeCuota?: number) {
  if (tipo === "saldo") return "el saldo";
  if (tipo === "sena") return "la seña";
  return numeroDeCuota ? `la cuota ${String(numeroDeCuota)}` : "la cuota";
}
