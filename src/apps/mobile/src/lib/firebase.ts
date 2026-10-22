// Stub del ticket T-023 (fase roja): el SDK de Firebase y el login con Google los implementa el verde.
export async function iniciarSesionConEmail(_email: string, _password: string): Promise<void> {
  throw new Error("no implementado");
}

export async function iniciarSesionConGoogle(): Promise<void> {
  throw new Error("no implementado");
}

export async function enviarMailRecuperacion(_email: string): Promise<void> {
  throw new Error("no implementado");
}

export async function cerrarSesion(): Promise<void> {
  throw new Error("no implementado");
}

export async function obtenerTokenId(): Promise<string | null> {
  throw new Error("no implementado");
}
