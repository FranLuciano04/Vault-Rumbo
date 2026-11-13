import { z } from "zod";
import { CHECK_OUT_ANTERIOR } from "../../viajes/itinerario/esquemas";

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
      z
        .object({
          concepto: z.string().trim().min(1, "Ingresá el concepto."),
          precio: z.string().trim().regex(IMPORTE, "Ingresá un importe válido."),
          /** Hotel del catálogo del que salió el ítem (RF-106); viaja con sus fechas (DEC-0028). */
          hotel_id: z.string().optional(),
          hotel_nombre: z.string().optional(),
          /** Ingreso y egreso `yyyy-mm-dd`: obligatorios solo si el ítem tiene hotel. */
          check_in: z.string().optional(),
          check_out: z.string().optional(),
          /** Precio que se autocompletó desde el catálogo: si sigue igual, es un precio sin tocar. */
          precio_autocompletado: z.string().optional(),
        })
        .superRefine(({ hotel_id, check_in, check_out }, contexto) => {
          if (!hotel_id) return;
          if (!check_in) {
            contexto.addIssue({ code: "custom", path: ["check_in"], message: "Ingresá la fecha." });
          }
          if (!check_out) {
            contexto.addIssue({
              code: "custom",
              path: ["check_out"],
              message: "Ingresá la fecha.",
            });
          } else if (check_in && check_out < check_in) {
            contexto.addIssue({ code: "custom", path: ["check_out"], message: CHECK_OUT_ANTERIOR });
          }
        }),
    )
    .min(1, "Cargá al menos un ítem."),
});

export type DatosCotizacion = z.infer<typeof esquemaCotizacion>;
