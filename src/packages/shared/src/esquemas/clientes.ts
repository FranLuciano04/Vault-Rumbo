import { z } from "zod";

/** Stub (T-039, fase roja): el formulario de alta de cliente (CU-02) lo implementa el paso verde. */
export const esquemaAltaCliente: z.ZodType = {
  parse: () => {
    throw new Error("no implementado");
  },
  safeParse: () => {
    throw new Error("no implementado");
  },
} as unknown as z.ZodType;
