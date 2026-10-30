import type { Viaje } from "@rumbo/shared";
import { z } from "zod";

const FECHA_OBLIGATORIA = "Ingresá la fecha.";
const ORDEN_INVALIDO = "Ingresá un número entero mayor a 0.";

/**
 * Fechas de un tramo del itinerario (RF-043): check-in y check-out obligatorios, el check-out no
 * anterior al check-in y ambas dentro de las fechas del viaje. El vencimiento del pago al proveedor
 * es opcional (vacío = sin vencimiento). Las fechas son `yyyy-mm-dd`, que se comparan como texto.
 */
export function esquemaTramo(
  viaje: Pick<Viaje, "fecha_salida" | "fecha_regreso">,
  conOrden = false,
) {
  return z
    .object({
      check_in: z.string().min(1, FECHA_OBLIGATORIA),
      check_out: z.string().min(1, FECHA_OBLIGATORIA),
      vencimiento_pago_proveedor: z.string(),
      // Solo se pide al editar; al agregar, el tramo va al final.
      orden: conOrden ? z.string().regex(/^[1-9]\d*$/, ORDEN_INVALIDO) : z.string(),
    })
    .superRefine(({ check_in, check_out }, contexto) => {
      if (!check_in || !check_out) return;
      const fueraDelViaje = (fecha: string) =>
        fecha < viaje.fecha_salida || fecha > viaje.fecha_regreso;
      if (check_out < check_in) {
        contexto.addIssue({
          code: "custom",
          path: ["check_out"],
          message: "El check-out no puede ser anterior al check-in.",
        });
        return;
      }
      const campo = fueraDelViaje(check_in) ? "check_in" : fueraDelViaje(check_out) && "check_out";
      if (campo) {
        contexto.addIssue({
          code: "custom",
          path: [campo],
          message: "Las fechas del tramo tienen que estar dentro de las fechas del viaje.",
        });
      }
    });
}

export type DatosTramo = z.infer<ReturnType<typeof esquemaTramo>>;
