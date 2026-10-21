import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

/** Raíz del workspace (`src/`): ahí viven los archivos del Compose. */
export const RAIZ_SRC = path.resolve(import.meta.dirname, "../../..");

export const EMULADOR = "http://127.0.0.1:9099";

/** Credenciales de las cuentas de prueba (solo existen en el emulador, en memoria). */
export const DUENA = {
  nombre: "Dueña Demo",
  email: "duena@rumbo.test",
  password: "Clave-de-prueba-1",
};
export const NO_HABILITADO = { email: "sin-alta@rumbo.test", password: "Clave-de-prueba-1" };

/** Variables del Compose: sin `src/.env` (por ejemplo, en el CI) se usan credenciales descartables. */
function entornoCompose(): NodeJS.ProcessEnv {
  const entorno = { ...process.env };
  if (!existsSync(path.join(RAIZ_SRC, ".env"))) {
    entorno.RUMBO_DB_USER ??= "rumbo";
    entorno.RUMBO_DB_PASSWORD ??= "rumbo-e2e-descartable";
  }
  return entorno;
}

export function compose(argumentos: string[]): string {
  const resultado = spawnSync(
    "docker",
    ["compose", "-f", "docker-compose.yml", "-f", "docker-compose.e2e.yml", ...argumentos],
    { cwd: RAIZ_SRC, env: entornoCompose(), encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 },
  );
  const salida = resultado.stdout + resultado.stderr;
  if (resultado.status !== 0) {
    throw new Error(`docker compose ${argumentos.join(" ")} falló (${String(resultado.status)})
${salida}`);
  }
  return salida;
}

/** Reintenta mientras el puerto publicado del emulador todavía no acepta conexiones (Docker Desktop). */
async function reintentar(pedir: () => Promise<Response>): Promise<Response> {
  const limite = Date.now() + 60_000;
  for (;;) {
    try {
      return await pedir();
    } catch (error) {
      if (Date.now() > limite) throw error;
      await new Promise((listo) => setTimeout(listo, 1_000));
    }
  }
}

/** Crea una cuenta con contraseña en el Auth Emulator (el registro está abierto solo ahí). */
export async function crearCuentaEnEmulador(email: string, password: string): Promise<void> {
  const respuesta = await reintentar(() =>
    fetch(`${EMULADOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: false }),
    }),
  );
  const cuerpo = (await respuesta.json()) as { error?: { message?: string } };
  // EMAIL_EXISTS: el emulador conserva las cuentas mientras el contenedor siga vivo.
  if (!respuesta.ok && cuerpo.error?.message !== "EMAIL_EXISTS") {
    throw new Error(`No se pudo crear ${email} en el emulador: ${JSON.stringify(cuerpo)}`);
  }
}
