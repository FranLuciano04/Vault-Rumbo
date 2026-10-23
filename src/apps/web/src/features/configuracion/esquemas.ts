import type { z } from "zod";

// Stub del test-writer (T-034): el implementador reemplaza esto por los esquemas zod reales.
export const esquemaParametros = null as unknown as z.ZodType<{
  vigencia_cotizacion_meses: number;
  anticipacion_salida_dias: number;
  recontacto_meses: number;
}>;

export const esquemaComision = null as unknown as z.ZodType<{
  comision_default_tipo: "importe" | "porcentaje";
  comision_default_valor: number;
}>;
