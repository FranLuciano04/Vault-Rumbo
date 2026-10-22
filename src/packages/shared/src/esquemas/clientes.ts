import { z } from "zod";

const SEGMENTOS = ["familia", "amigos", "individual", "pareja"] as const;

/** Teléfono o WhatsApp: al menos 7 dígitos, con `+`, espacios, guiones y paréntesis. */
const TELEFONO = /^\+?(?=(?:\D*\d){7,15}\D*$)[\d\s\-()]+$/;

const esContactoValido = (contacto: string) =>
  z.email().safeParse(contacto).success || TELEFONO.test(contacto);

/** Formato del alta de cliente (CU-02): datos mínimos; los duplicados los resuelve la API (A1). */
export const esquemaAltaCliente = z.object({
  nombre: z.string().trim().min(1, "Ingresá el nombre.").max(120, "Máximo 120 caracteres."),
  contacto: z
    .string()
    .trim()
    .max(200, "Máximo 200 caracteres.")
    .refine(esContactoValido, "Ingresá un teléfono o un email válido."),
  segmento: z.enum(SEGMENTOS),
  etiquetas: z.array(z.string()).optional(),
  preferencias: z.string().optional(),
  asesor_asignado_id: z.uuid().optional(),
  confirmar_duplicado: z.boolean().optional(),
});

export type DatosAltaCliente = z.infer<typeof esquemaAltaCliente>;
