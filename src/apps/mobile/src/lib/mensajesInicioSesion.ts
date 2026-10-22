// Textos del inicio de sesión mobile (CU-24) y traducción de los errores de Firebase y de Google.
// Son los mismos que los de la web (src/apps/web/src/features/seguridad/mensajesInicioSesion.ts).

export const NO_HABILITADO =
  "Usuario no habilitado en Rumbo. Pedile acceso al administrador de la agencia.";
export const SIN_VERIFICAR = "No pudimos verificar tu usuario. Probá de nuevo en unos minutos.";
export const REVISAR_CAMPOS = "Revisá los datos marcados.";
export const MAIL_RECUPERACION =
  "Si el email está registrado, te enviamos un link para elegir una nueva contraseña.";

const CREDENCIALES_INVALIDAS = "Credenciales inválidas. Revisá tu email y contraseña.";

const porCodigo: Record<string, string | null> = {
  "auth/invalid-credential": CREDENCIALES_INVALIDAS,
  "auth/wrong-password": CREDENCIALES_INVALIDAS,
  "auth/user-not-found": CREDENCIALES_INVALIDAS,
  "auth/invalid-email": CREDENCIALES_INVALIDAS,
  "auth/user-disabled": NO_HABILITADO,
  // Google con una cuenta sin alta: el registro abierto está deshabilitado (DEC-0016).
  "auth/admin-restricted-operation": NO_HABILITADO,
  "auth/too-many-requests": "Demasiados intentos. Esperá unos minutos y volvé a probar.",
  "auth/network-request-failed": "No hay conexión. Revisá tu internet y volvé a probar.",
  // `statusCodes.PLAY_SERVICES_NOT_AVAILABLE` de google-signin (el valor nativo es el mismo texto):
  // se usa el literal para no cargar el módulo nativo desde acá.
  PLAY_SERVICES_NOT_AVAILABLE:
    "Este teléfono no tiene los servicios de Google Play necesarios para entrar con Google.",
  // La persona cerró el selector de cuentas de Google: no es un error que haya que mostrar.
  SIGN_IN_CANCELLED: null,
};

/** Mensaje para un error de Firebase o de Google al iniciar sesión, o `null` si no hay nada que avisar. */
export function mensajeErrorFirebase(error: unknown): string | null {
  const codigo =
    error && typeof error === "object" && "code" in error ? String(error.code) : undefined;
  if (codigo && codigo in porCodigo) return porCodigo[codigo] ?? null;
  return "No pudimos iniciar sesión. Probá de nuevo en unos minutos.";
}
