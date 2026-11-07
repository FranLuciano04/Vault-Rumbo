import type { CanalContenido, EstadoKanban } from "@rumbo/shared";

export const ETIQUETA_CANAL: Record<CanalContenido, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  whatsapp_ventas: "WhatsApp ventas",
};

/** Columnas del tablero en orden; el descartado no tiene columna (baja lógica). */
export const COLUMNAS: { estado: EstadoKanban; etiqueta: string }[] = [
  { estado: "idea", etiqueta: "Idea" },
  { estado: "en_produccion", etiqueta: "En producción" },
  { estado: "listo", etiqueta: "Listo" },
  { estado: "publicado", etiqueta: "Publicado" },
];
