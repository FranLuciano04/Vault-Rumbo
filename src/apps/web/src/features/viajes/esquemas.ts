import { z } from "zod";

/** Importe o porcentaje decimal como texto, con hasta dos decimales y sin signo (el servidor valida el resto). */
export const DECIMAL = /^\d+(\.\d{1,2})?$/;
const decimal = z
  .string()
  .trim()
  .regex(DECIMAL, "Ingresá un número válido, por ejemplo 150000 o 12.5.");

/** Economía del viaje (RF-054): precio de venta, costo y comisión del vendedor (con override). */
export const esquemaEconomia = z
  .object({
    precio_venta: decimal,
    costo: decimal,
    operador_id: z.string(),
    vendedor_id: z.string(),
    comision_tipo: z.enum(["importe", "porcentaje"]),
    comision_vendedor: decimal,
  })
  .superRefine((datos, contexto) => {
    // Un porcentaje de comisión va de 0 a 100 (RN-01); el formato ya lo valida `decimal`.
    if (datos.comision_tipo === "porcentaje" && Number(datos.comision_vendedor) > 100) {
      contexto.addIssue({
        code: "custom",
        path: ["comision_vendedor"],
        message: "El porcentaje debe estar entre 0 y 100.",
      });
    }
  });

export type DatosEconomia = z.infer<typeof esquemaEconomia>;
