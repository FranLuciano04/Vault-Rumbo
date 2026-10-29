import { z } from "zod";

/** Importe o porcentaje decimal como texto, con hasta dos decimales y sin signo (el servidor valida el resto). */
export const DECIMAL = /^\d+(\.\d{1,2})?$/;
const decimal = z
  .string()
  .trim()
  .regex(DECIMAL, "Ingresá un número válido, por ejemplo 150000 o 12.5.");

/** Economía del viaje (RF-054): precio de venta, costo y comisión del vendedor (con override). */
export const esquemaEconomia = z.object({
  precio_venta: decimal,
  costo: decimal,
  operador_id: z.string(),
  vendedor_id: z.string(),
  comision_tipo: z.enum(["importe", "porcentaje"]),
  comision_vendedor: decimal,
});

export type DatosEconomia = z.infer<typeof esquemaEconomia>;
