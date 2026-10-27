import { ETIQUETA_MOTIVO_PERDIDA, type CanalOportunidad, type MotivoPerdida } from "@rumbo/shared";
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

const CANALES = [
  "instagram",
  "whatsapp",
  "presencial",
] as const satisfies readonly CanalOportunidad[];

/** Consulta nueva (RF-010, RF-013): cliente, canal, destino y pasajeros son obligatorios; fechas y notas, no. */
export const esquemaConsulta = z
  .object({
    cliente_id: z.string().min(1, "Elegí un cliente."),
    canal: z.enum(CANALES, "Elegí el canal."),
    destino_consultado: z.string().trim().min(1, "Ingresá el destino."),
    fecha_desde_tentativa: z.string(),
    fecha_hasta_tentativa: z.string(),
    pasajeros: z
      .number("Ingresá los pasajeros.")
      .int("Ingresá los pasajeros.")
      .min(1, "Ingresá al menos un pasajero."),
    notas: z.string(),
  })
  .refine(
    (d) =>
      !d.fecha_desde_tentativa ||
      !d.fecha_hasta_tentativa ||
      d.fecha_hasta_tentativa >= d.fecha_desde_tentativa,
    {
      path: ["fecha_hasta_tentativa"],
      message: "La fecha hasta no puede ser anterior a la fecha desde.",
    },
  );

export type EntradaConsulta = z.input<typeof esquemaConsulta>;
export type DatosConsulta = z.output<typeof esquemaConsulta>;
export type DatosInteraccion = z.infer<typeof esquemaInteraccion>;
export type DatosInsistencia = z.infer<typeof esquemaInsistencia>;
export type DatosPerder = z.input<typeof esquemaPerder>;

/** Importe de un ítem de cotización: decimal positivo con hasta 4 decimales; admite coma o punto. */
const IMPORTE = /^\d+([.,]\d{1,4})?$/;

/** Cotización nueva (RF-021): moneda y al menos un ítem con concepto e importe válidos. */
export const esquemaCotizacion = z.object({
  moneda: z.enum(["ARS", "USD"]),
  items: z
    .array(
      z.object({
        concepto: z.string().trim().min(1, "Ingresá el concepto."),
        precio: z.string().trim().regex(IMPORTE, "Ingresá un importe válido."),
      }),
    )
    .min(1, "Cargá al menos un ítem."),
});

export type DatosCotizacion = z.infer<typeof esquemaCotizacion>;
