// Stub del ticket T-021 (rojo): la implementación real envuelve el SDK de Firebase.
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
