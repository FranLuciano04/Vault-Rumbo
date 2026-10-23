import type { SegmentoCliente } from "@rumbo/shared";

/** Texto de cada segmento tal como se muestra; el orden es el de los chips del prototipo. */
export const ETIQUETA_SEGMENTO: Record<SegmentoCliente, string> = {
  familia: "Familia",
  pareja: "Pareja",
  amigos: "Amigos",
  individual: "Individual",
};
