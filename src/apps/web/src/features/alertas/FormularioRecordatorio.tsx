import { zodResolver } from "@hookform/resolvers/zod";
import type { Alerta } from "@rumbo/shared";
import { esquemaRecordatorio, type DatosRecordatorio } from "@rumbo/shared/esquemas";
import { useCrearRecordatorio, useEditarRecordatorio } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { CampoFormulario } from "@/components/CampoFormulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aplicarErroresDelServidor } from "@/lib/errores";
import { AsociarCliente } from "./AsociarCliente";

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
  const [conCliente, setConCliente] = useState(false);
  const [elegido, setElegido] = useState<AsociadoRecordatorio | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const asociadoFinal = asociado ?? elegido;
  // La asociación se elige solo en el alta y cuando quien abre el formulario no la fijó.
  const eligeAsociado = !asociado && !alerta;
  const formulario = useForm<DatosRecordatorio>({
    resolver: zodResolver(esquemaRecordatorio),
    defaultValues: { descripcion: alerta?.descripcion ?? "", fecha: alerta?.fecha ?? "" },
  });
  const { errors, isSubmitting } = formulario.formState;
  const { setFocus } = formulario;

  useEffect(() => {
    if (typeof formRef.current?.scrollIntoView === "function") {
      formRef.current.scrollIntoView({ block: "nearest" });
    }
    setFocus("descripcion");
  }, [setFocus]);

  async function enviar({ descripcion, fecha }: DatosRecordatorio) {
    setError(null);
    if (conCliente && !asociadoFinal) {
      setError("Elegí un cliente o dejá el recordatorio como personal.");
      return;
    }
    try {
      const guardada = alerta
        ? await editar.mutateAsync({ id: alerta.id, cambios: { descripcion, fecha } })
        : await crear.mutateAsync({
            descripcion,
            fecha,
            ...(asociadoFinal && { [`${asociadoFinal.tipo}_id`]: asociadoFinal.id }),
          });
      // Con la fecha enviada: es la que ve quien guarda, para avisarle.
      alGuardar?.({ ...guardada, fecha });
    } catch (falla) {
      setError(aplicarErroresDelServidor(falla, CAMPOS, formulario.setError));
    }
  }

  return (
    <form
      ref={formRef}
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
      {eligeAsociado && (
        <AsociarCliente
          cliente={cliente}
          conCliente={conCliente}
          elegido={elegido}
          alCambiarModo={setConCliente}
          alElegir={setElegido}
        />
      )}
      {asociadoFinal && (
        <p className="text-sm text-muted-foreground">Asociado a: {asociadoFinal.etiqueta}</p>
      )}
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
