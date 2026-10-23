import { crearCliente } from "@rumbo/shared";
import { obtenerTokenId } from "./lib/firebase";

export const cliente = crearCliente({
  baseURL: (process.env.EXPO_PUBLIC_API_URL as string | undefined) ?? "http://localhost:8000",
  obtenerToken: obtenerTokenId,
});
