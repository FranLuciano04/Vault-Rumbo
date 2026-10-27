import { z } from "zod";

/** Topes de las etiquetas de un cliente; los mismos que valida la API. */
export const MAX_ETIQUETAS = 20;
export const MAX_LARGO_ETIQUETA = 80;

const SEGMENTOS = ["familia", "amigos", "individual", "pareja"] as const;

/** Teléfono o WhatsApp: al menos 7 dígitos, con `+`, espacios, guiones y paréntesis. */
export const TELEFONO = /^\+?(?=(?:\D*\d){7,15}\D*$)[\d\s\-()]+$/;

const esContactoValido = (contacto: string) =>
  z.email().safeParse(contacto).success || TELEFONO.test(contacto);

/** Usuario de Instagram (DEC-0017): sin `@` inicial ni espacios, en minúsculas; vacío es `null`. */
export const normalizarInstagram = (valor: unknown) =>
  typeof valor === "string"
    ? valor
        .replace(/^[ \t\n\r\f\v]+|[ \t\n\r\f\v]+$/g, "")
        .replace(/^@/, "")
        .toLowerCase() || null
    : valor;

const instagram = z.preprocess(
  normalizarInstagram,
  z
    .string()
    .regex(/^[a-z0-9._]{1,30}$/, "Usá letras, números, puntos o guiones bajos (hasta 30).")
    .nullable()
    .optional(),
);

/** Formato del alta de cliente (CU-02): datos mínimos; los duplicados los resuelve la API (A1). */
export const esquemaAltaCliente = z.object({
  nombre: z.string().trim().min(1, "Ingresá el nombre.").max(120, "Máximo 120 caracteres."),
  contacto: z
    .string()
    .trim()
    .max(200, "Máximo 200 caracteres.")
    .refine(esContactoValido, "Ingresá un teléfono o un email válido."),
  instagram,
  segmento: z.enum(SEGMENTOS),
  etiquetas: z.array(z.string().max(MAX_LARGO_ETIQUETA)).max(MAX_ETIQUETAS).optional(),
  preferencias: z.string().nullable().optional(),
  asesor_asignado_id: z.uuid().nullable().optional(),
  confirmar_duplicado: z.boolean().optional(),
});

/** Formato de la edición parcial de un cliente (CU-03, CU-30): los mismos campos del alta, todos opcionales, más `confirmar_duplicado` (RF-003, DEC-0020). */
export const esquemaEdicionCliente = esquemaAltaCliente
  .extend({ no_recontactar: z.boolean() })
  .partial();

export type DatosAltaCliente = z.infer<typeof esquemaAltaCliente>;
