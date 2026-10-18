import { ErrorApi } from "@rumbo/shared";
import { useYo } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Navigate, Outlet } from "react-router";
import { Shell } from "./Shell";

/** Deja pasar solo con sesión: consulta `/auth/yo` y, si da 401, manda al login (CU-24). */
export function RutaProtegida({ cliente }: { cliente: AxiosInstance }) {
  const { data: usuario, error, isPending } = useYo(cliente);

  if (isPending)
    return (
      <p role="status" className="p-6">
        Cargando…
      </p>
    );
  if (error instanceof ErrorApi && error.status === 401) return <Navigate to="/login" replace />;
  if (!usuario) {
    return (
      <p role="alert" className="p-6">
        No pudimos verificar tu sesión. Probá de nuevo en unos minutos.
      </p>
    );
  }
  return (
    <Shell usuario={usuario}>
      <Outlet context={usuario} />
    </Shell>
  );
}
