import { z } from "zod";

const entero = (minimo: number, mensaje: string) =>
  z.number(mensaje).int(mensaje).min(minimo, mensaje);

/** Parámetros del negocio (RF-084): enteros; la vigencia y el recontacto, de al menos 1. */
export const esquemaParametros = z.object({
  vigencia_cotizacion_meses: entero(1, "Ingresá un número entero de 1 o más."),
  anticipacion_salida_dias: entero(0, "Ingresá un número entero de 0 o más."),
  recontacto_meses: entero(1, "Ingresá un número entero de 1 o más."),
});

export type DatosParametros = z.infer<typeof esquemaParametros>;

/** Comisión por defecto de un vendedor (RF-083): porcentaje de 0 a 100 o importe de 0 o más. */
const TOPE_IMPORTE = 999_999_999_999.99; // numeric(14, 2): 12 enteros y 2 decimales

const dosDecimales = (valor: number) => Math.round(valor * 100) / 100 === valor;

/** Valor de la comisión con a lo sumo 2 decimales. */
const valorComision = z
  .number("Ingresá un número.")
  .refine(dosDecimales, "Usá como máximo 2 decimales.");

export const esquemaComision = z.discriminatedUnion("comision_default_tipo", [
  z.object({
    comision_default_tipo: z.literal("porcentaje"),
    comision_default_valor: valorComision
      .min(0, "El porcentaje no puede ser negativo.")
      .max(100, "El porcentaje no puede superar 100."),
  }),
  z.object({
    comision_default_tipo: z.literal("importe"),
    comision_default_valor: valorComision
      .min(0, "El importe no puede ser negativo.")
      .max(TOPE_IMPORTE, "El importe es demasiado grande."),
  }),
]);

export type DatosComision = z.infer<typeof esquemaComision>;
