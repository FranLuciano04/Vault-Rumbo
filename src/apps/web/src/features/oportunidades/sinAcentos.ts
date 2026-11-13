/** Normaliza un texto libre para compararlo con el catálogo: sin acentos, sin bordes y en minúsculas. */
export const sinAcentos = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
