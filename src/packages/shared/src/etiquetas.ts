import type { HistorialCliente, SegmentoCliente } from "./cliente";

/** Texto de cada segmento tal como se muestra; el orden es el de los chips del prototipo. */
export const ETIQUETA_SEGMENTO: Record<SegmentoCliente, string> = {
  familia: "Familia",
  pareja: "Pareja",
  amigos: "Amigos",
  individual: "Individual",
};

export const ETIQUETA_ESTADO_OPORTUNIDAD: Record<
  HistorialCliente["oportunidades"][number]["estado"],
  string
> = {
  nueva: "Nueva",
  en_gestion: "En gestión",
  cotizada: "Cotizada",
  ganada: "Ganada",
  perdida: "Perdida",
};

export const ETIQUETA_ESTADO_VIAJE: Record<HistorialCliente["viajes"][number]["estado"], string> = {
  reservado: "Reservado",
  vendido: "Vendido",
  confirmado: "Confirmado",
  en_curso: "En curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};
