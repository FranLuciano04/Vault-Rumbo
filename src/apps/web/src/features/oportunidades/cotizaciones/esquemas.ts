import { z } from "zod";

/**
 * Importe de un ítem en formato es-AR: la coma es el decimal (hasta 4 dígitos) y el punto agrupa
 * de a tres los miles. Acepta «780000», «780.000», «1.500.000», «1500,50» y «1.420.000,50».
 */
export const IMPORTE = /^(\d+|[1-9]\d{0,2}(\.\d{3})+)(,\d{1,4})?$/;

/** Cotización nueva (RF-021): moneda y al menos un ítem con concepto e importe válidos. */
export const esquemaCotizacion = z.object({
  moneda: z.enum(["ARS", "USD"]),
  items: z
    .array(
      z.object({
        concepto: z.string().trim().min(1, "Ingresá el concepto."),
        precio: z.string().trim().regex(IMPORTE, "Ingresá un importe válido."),
        /** Hotel del catálogo del que salió el ítem (RF-106); no viaja a la API. */
        hotel_id: z.string().optional(),
      }),
    )
    .min(1, "Cargá al menos un ítem."),
});

export type DatosCotizacion = z.infer<typeof esquemaCotizacion>;
