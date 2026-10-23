import { zodResolver } from "@hookform/resolvers/zod";
import type { Usuario } from "@rumbo/shared";
import { useCrearUsuario, useEditarUsuario } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoFormulario, CLASE_SELECT } from "../CampoFormulario";
import { aplicarErroresDelServidor } from "../errores";
import { type DatosUsuario, ROLES, esquemaUsuario } from "../esquemas";

const CAMPOS = ["nombre", "email", "rol", "acceso_redes"] as const;

/**
 * Alta y edición de un usuario (RF-144, RF-145). Al editar solo cambian el rol y el acceso a redes;
 * los 403 y 409 del servidor (RF-146, RF-149) se muestran como aviso y dejan el formulario abierto.
 */
export function FormularioUsuario({
  cliente,
  usuario,
  onCerrar,
}: {
  cliente: AxiosInstance;
  usuario?: Usuario;
  onCerrar: () => void;
}) {
  const crear = useCrearUsuario(cliente);
  const editar = useEditarUsuario(cliente);
  const [error, setError] = useState<string | null>(null);
  const formulario = useForm<DatosUsuario>({
    resolver: zodResolver(esquemaUsuario),
    defaultValues: {
      nombre: usuario?.nombre ?? "",
      email: usuario?.email ?? "",
      rol: usuario?.rol ?? "empleado",
      acceso_redes: usuario?.acceso_redes ?? false,
    },
  });
  const { errors } = formulario.formState;

  async function guardar(datos: DatosUsuario) {
    setError(null);
    try {
      if (usuario) {
        const { rol, acceso_redes } = datos;
        await editar.mutateAsync({ usuarioId: usuario.id, datos: { rol, acceso_redes } });
      } else await crear.mutateAsync(datos);
      onCerrar();
    } catch (falla) {
      setError(aplicarErroresDelServidor(falla, CAMPOS, formulario.setError));
    }
  }

  return (
    <form
      noValidate
      aria-label={usuario ? `Editar ${usuario.nombre}` : "Nuevo usuario"}
      className="flex max-w-md flex-col gap-4 rounded-md border p-4"
      onSubmit={(evento) => void formulario.handleSubmit(guardar)(evento)}
    >
      <CampoFormulario id="usuario-nombre" etiqueta="Nombre" error={errors.nombre}>
        {(props) => (
          <Input {...props} disabled={Boolean(usuario)} {...formulario.register("nombre")} />
        )}
      </CampoFormulario>
      <CampoFormulario id="usuario-email" etiqueta="Email" error={errors.email}>
        {(props) => (
          <Input
            type="email"
            {...props}
            disabled={Boolean(usuario)}
            {...formulario.register("email")}
          />
        )}
      </CampoFormulario>
      <CampoFormulario id="usuario-rol" etiqueta="Rol" error={errors.rol}>
        {(props) => (
          <select className={CLASE_SELECT} {...props} {...formulario.register("rol")}>
            {ROLES.map(({ valor, etiqueta }) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        )}
      </CampoFormulario>
      <CampoFormulario id="usuario-redes" etiqueta="Acceso a redes" error={errors.acceso_redes}>
        {(props) => (
          <input
            type="checkbox"
            className="size-4 self-start"
            {...props}
            {...formulario.register("acceso_redes")}
          />
        )}
      </CampoFormulario>
      {!usuario && (
        <p className="text-sm text-muted-foreground">
          La persona recibe un mail para elegir su contraseña.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={crear.isPending || editar.isPending}>
          Guardar
        </Button>
        <Button type="button" variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
