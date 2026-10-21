import { z } from "zod";

/** Formato del formulario de inicio de sesión (CU-24); las credenciales las valida Firebase. */
export const esquemaInicioSesion = z.object({
  email: z.email("Ingresá un email válido."),
  password: z.string().min(1, "Ingresá tu contraseña."),
});

export type DatosInicioSesion = z.infer<typeof esquemaInicioSesion>;
