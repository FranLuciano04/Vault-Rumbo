import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useOutletContext } from "react-router";
import { NuevaConsulta } from "@/features/oportunidades/NuevaConsulta";

/** Pasa el usuario de la sesión (contexto de RutaProtegida) al alta de consulta. */
export function SeccionNuevaConsulta({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  return <NuevaConsulta cliente={cliente} usuario={usuario} />;
}
