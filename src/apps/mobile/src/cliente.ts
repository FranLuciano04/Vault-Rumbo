import { crearCliente } from "@rumbo/shared";

// El token de Firebase lo conecta el ticket del login mobile.
export const cliente = crearCliente({
  baseURL: (process.env.EXPO_PUBLIC_API_URL as string | undefined) ?? "http://localhost:8000",
  obtenerToken: () => null,
});
