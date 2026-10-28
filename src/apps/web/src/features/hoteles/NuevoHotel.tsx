import type { UsuarioActual } from "@rumbo/shared";
import { useCrearHotel } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Navigate, useNavigate } from "react-router";
import { FormularioHotel } from "./FormularioHotel";

/** Alta de hotel (CU-16, RF-097, pantalla 23). El freelance solo consulta el catálogo: vuelve a él. */
export function NuevoHotel({
  cliente,
  usuario,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
}) {
  const crear = useCrearHotel(cliente);
  const navegar = useNavigate();
  if (usuario.rol === "freelance") return <Navigate to="/hoteles" replace />;

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Hoteles</p>
        <h1 className="text-3xl font-semibold">Nuevo hotel</h1>
      </header>
      <FormularioHotel
        cliente={cliente}
        textoEnviar="Registrar hotel"
        enviar={async ({ nombre, destino_id, categoria, precio_referencia, servicios }) => {
          await crear.mutateAsync({
            nombre,
            destino_id,
            categoria: categoria || null,
            precio_referencia: precio_referencia || null,
            servicios,
          });
          void navegar("/hoteles");
        }}
      />
    </div>
  );
}
