import { zodResolver } from "@hookform/resolvers/zod";
import type { Alerta } from "@rumbo/shared";
import { esquemaRecordatorio, type DatosRecordatorio } from "@rumbo/shared/esquemas";
import { useCrearRecordatorio, useEditarRecordatorio } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CampoFormulario } from "@/components/CampoFormulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aplicarErroresDelServidor } from "@/lib/errores";

/** Entidad a la que queda asociado un recordatorio nuevo (CU-28): una sola, ya elegida por quien lo abre. */
export interface AsociadoRecordatorio {
  tipo: "cliente" | "oportunidad" | "viaje";
  id: string;
  etiqueta: string;
}

export interface PropiedadesFormularioRecordatorio {
  cliente: AxiosInstance;
  /** Alta asociada (p. ej. desde la ficha de un cliente); sin esto el recordatorio es personal. */
  asociado?: AsociadoRecordatorio;
  /** Si viene, el formulario edita ese recordatorio manual pendiente. */
  alerta?: Alerta;
  alCerrar: () => void;
  alGuardar?: (alerta: Alerta) => void;
}

const CAMPOS = ["descripcion", "fecha"] as const;

/** Alta y edición de un recordatorio manual (CU-28, pantalla 6). */
export function FormularioRecordatorio({
  cliente,
  asociado,
  alerta,
  alCerrar,
  alGuardar,
}: PropiedadesFormularioRecordatorio) {
  const crear = useCrearRecordatorio(cliente);
  const editar = useEditarRecordatorio(cliente);
  const [error, setError] = useState<string | null>(null);
  const formulario = useForm<DatosRecordatorio>({
    resolver: zodResolver(esquemaRecordatorio),
    defaultValues: { descripcion: alerta?.descripcion ?? "", fecha: alerta?.fecha ?? "" },
  });
  const { errors, isSubmitting } = formulario.formState;

  async function enviar({ descripcion, fecha }: DatosRecordatorio) {
    setError(null);
    try {
      const guardada = alerta
        ? await editar.mutateAsync({ id: alerta.id, cambios: { descripcion, fecha } })
        : await crear.mutateAsync({
            descripcion,
            fecha,
            ...(asociado && { [`${asociado.tipo}_id`]: asociado.id }),
          });
      alGuardar?.(guardada);
    } catch (falla) {
      setError(aplicarErroresDelServidor(falla, CAMPOS, formulario.setError));
    }
  }

  return (
    <form
      noValidate
      aria-label={alerta ? "Editar recordatorio" : "Nuevo recordatorio"}
      className="flex flex-col gap-4 rounded-2xl border bg-card p-5"
      onSubmit={(evento) => void formulario.handleSubmit(enviar)(evento)}
    >
      <h2 className="text-lg font-semibold">
        {alerta ? "Editar recordatorio" : "Nuevo recordatorio"}
      </h2>
      <CampoFormulario id="descripcion" etiqueta="Descripción" error={errors.descripcion}>
        {(props) => <Input {...props} {...formulario.register("descripcion")} />}
      </CampoFormulario>
      <CampoFormulario id="fecha" etiqueta="Fecha" error={errors.fecha}>
        {(props) => <Input type="date" {...props} {...formulario.register("fecha")} />}
      </CampoFormulario>
      {asociado && <p className="text-sm text-muted-foreground">Asociado a: {asociado.etiqueta}</p>}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          Guardar
        </Button>
        <Button type="button" variant="outline" onClick={alCerrar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
