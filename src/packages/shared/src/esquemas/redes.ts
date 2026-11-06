import { z } from "zod";

export const canalesContenido = ["instagram", "tiktok", "whatsapp_ventas"] as const;

/** Alta de una pieza (CU-19): título, canal y fecha de publicación; el texto es opcional. */
export const esquemaContenido = z.object({
  titulo: z.string().trim().min(1, "Escribí el título o la idea.").max(200),
  texto: z.string().trim().nullable().optional(),
  canal: z.enum(canalesContenido, "Elegí un canal."),
  fecha_publicacion: z.iso.date("Elegí una fecha."),
});

export type DatosContenido = z.infer<typeof esquemaContenido>;

/** Pedido de propuesta con IA (CU-20): tema y canal; el tono es opcional. */
export const esquemaPropuestaIA = z.object({
  tema: z.string().trim().min(1, "Contá de qué trata el posteo.").max(500),
  canal: z.enum(canalesContenido, "Elegí un canal."),
  tono: z.string().trim().max(200).nullable().optional(),
});

export type DatosPropuestaIA = z.infer<typeof esquemaPropuestaIA>;
