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
