import { crearCuentaEnEmulador, compose, DUENA, NO_HABILITADO } from "./compose";

/**
 * Levanta el Compose de e2e (DEC-0015 §7), crea la dueña con `datos-iniciales --demo` y una
 * cuenta de Firebase sin Usuario en Rumbo (CU-24 A1).
 */
export default async function globalSetup(): Promise<void> {
  try {
    console.log(compose(["up", "-d", "--build", "--wait", "--wait-timeout", "300"]));

    // La cuenta se crea antes con contraseña: `datos-iniciales` la reutiliza por email y le suma
    // el Usuario dueno (Rumbo no maneja contraseñas, DEC-0016).
    await crearCuentaEnEmulador(DUENA.email, DUENA.password);
    await crearCuentaEnEmulador(NO_HABILITADO.email, NO_HABILITADO.password);
    console.log(
      compose([
        "exec",
        "-T",
        "api",
        "python",
        "-m",
        "rumbo.presentacion.cli",
        "datos-iniciales",
        "--nombre",
        DUENA.nombre,
        "--email",
        DUENA.email,
        "--demo",
      ]),
    );
  } catch (error) {
    // Si falla después del `up`, el teardown global no corre: se baja acá para no dejar el stack.
    if (process.env.E2E_MANTENER !== "1") {
      try {
        compose(["down", "-v", "--remove-orphans"]);
      } catch {
        // Se conserva el error original.
      }
    }
    throw error;
  }
}
