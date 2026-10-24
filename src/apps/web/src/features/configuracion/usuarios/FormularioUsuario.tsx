import { zodResolver } from "@hookform/resolvers/zod";
import type { Usuario } from "@rumbo/shared";
import { useCrearUsuario, useEditarUsuario } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoFormulario, CLASE_SELECT } from "../CampoFormulario";
import { aplicarErroresDelServidor } from "../errores";
import { type DatosUsuario, ROLES, esquemaEdicionUsuario, esquemaUsuario } from "../esquemas";

const CAMPOS = ["nombre", "email", "rol", "acceso_redes"] as const;

const tieneRedesPorRol = (rol: string) => rol === "admin" || rol === "dueno";

/**
 * Alta (RF-144) y edición (RF-147) de un usuario. Al editar no cambia el email (identifica la cuenta
 * de Firebase), y el PATCH lleva únicamente lo que se tocó. Los 403 y 409 del servidor (RF-146,
 * RF-149) se muestran como aviso y dejan el formulario abierto.
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
    resolver: zodResolver(usuario ? esquemaEdicionUsuario : esquemaUsuario),
    defaultValues: {
      nombre: usuario?.nombre ?? "",
      email: usuario?.email ?? "",
      rol: usuario?.rol ?? "empleado",
      acceso_redes: usuario?.acceso_redes ?? false,
    },
  });
  const { errors, dirtyFields } = formulario.formState;
  const rol = useWatch({ control: formulario.control, name: "rol" });
  // Admin y dueño tienen acceso a redes siempre, por su rol (DEC-0013).
  const redesPorRol = tieneRedesPorRol(rol);

  async function guardar(datos: DatosUsuario) {
    setError(null);
    try {
      if (usuario) {
        const cambios = {
          ...(dirtyFields.nombre && { nombre: datos.nombre }),
          ...(dirtyFields.rol && { rol: datos.rol }),
          ...(dirtyFields.acceso_redes && { acceso_redes: datos.acceso_redes }),
        };
        // Sin cambios no hay nada que enviar.
        if (Object.keys(cambios).length > 0) {
          await editar.mutateAsync({ usuarioId: usuario.id, datos: cambios });
        }
      } else {
        await crear.mutateAsync(datos);
      }
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
        {(props) => <Input {...props} {...formulario.register("nombre")} />}
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
          <select
            className={CLASE_SELECT}
            {...props}
            {...formulario.register("rol", {
              onChange: (evento: { target: { value: string } }) => {
                if (tieneRedesPorRol(evento.target.value))
                  formulario.setValue("acceso_redes", true, { shouldDirty: true });
              },
            })}
          >
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
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4"
              {...props}
              disabled={redesPorRol}
              {...formulario.register("acceso_redes")}
            />
            {redesPorRol && <span className="text-sm text-muted-foreground">Por su rol</span>}
          </div>
        )}
      </CampoFormulario>
      {rol === "freelance" && (
        <p className="rounded-md bg-muted p-3 text-sm">
          <strong>Freelance: ve solo lo suyo.</strong> Sus clientes, oportunidades, viajes, pagos y
          comisiones, más el catálogo compartido. Los clientes que cree quedan a su nombre.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {usuario
          ? "Los cambios aplican en el próximo inicio de sesión."
          : "La persona recibe un mail para elegir su contraseña."}
      </p>
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
