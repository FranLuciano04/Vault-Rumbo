import { compose } from "./compose";

/** Baja el Compose y borra su volumen; `E2E_MANTENER=1` lo deja arriba para depurar. */
export default function globalTeardown(): void {
  if (process.env.E2E_MANTENER === "1") return;
  compose(["down", "-v", "--remove-orphans"]);
}
