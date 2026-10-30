import type { UsuarioActual } from "@rumbo/shared";
import type { AxiosInstance } from "axios";
import { useOutletContext } from "react-router";
import { PaginaDashboard } from "@/features/dashboard/PaginaDashboard";

/** Pasa el usuario de la sesión (contexto de RutaProtegida) al dashboard. */
export function SeccionDashboard({ cliente }: { cliente: AxiosInstance }) {
  const usuario = useOutletContext<UsuarioActual>();
  return <PaginaDashboard cliente={cliente} usuario={usuario} />;
}
