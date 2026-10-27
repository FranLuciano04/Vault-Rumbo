import { ETIQUETA_MOTIVO_PERDIDA, type MotivoPerdida } from "@rumbo/shared";
import { z } from "zod";

/** Interacción nueva de la línea de tiempo (RF-014): solo el texto; la fecha y el nombre los pone la pantalla. */
export const esquemaInteraccion = z.object({
  texto: z.string().trim().min(1, "Escribí qué pasó en la interacción."),
});

/** Insistencia (RF-015): cuándo volver a contactar y para qué. */
export const esquemaInsistencia = z.object({
  fecha: z.iso.date("Elegí una fecha."),
  descripcion: z.string().trim().min(1, "Escribí qué hay que hacer."),
});

const MOTIVOS = Object.keys(ETIQUETA_MOTIVO_PERDIDA) as [MotivoPerdida, ...MotivoPerdida[]];

/** Perder la oportunidad (RF-017): motivo de la lista fija; con «otro» el detalle es obligatorio. */
export const esquemaPerder = z
  .object({
    motivo_perdida: z.enum(MOTIVOS, "Elegí un motivo."),
    motivo_perdida_detalle: z.string().trim(),
  })
  .refine((d) => d.motivo_perdida !== "otro" || d.motivo_perdida_detalle !== "", {
    path: ["motivo_perdida_detalle"],
    message: "Contanos el motivo.",
  });

export type DatosInteraccion = z.infer<typeof esquemaInteraccion>;
export type DatosInsistencia = z.infer<typeof esquemaInsistencia>;
export type DatosPerder = z.input<typeof esquemaPerder>;
