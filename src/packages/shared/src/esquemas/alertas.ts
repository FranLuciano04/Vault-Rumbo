import { z } from "zod";

/** Formato del recordatorio manual (CU-28): fecha y descripción; la asociación es opcional. */
export const esquemaRecordatorio = z.object({
  fecha: z.iso.date("Elegí una fecha."),
  descripcion: z.string().trim().min(1, "Escribí qué hay que hacer."),
  viaje_id: z.uuid().nullable().optional(),
  cliente_id: z.uuid().nullable().optional(),
  oportunidad_id: z.uuid().nullable().optional(),
});

export type DatosRecordatorio = z.infer<typeof esquemaRecordatorio>;
