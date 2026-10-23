import { zodResolver } from "@hookform/resolvers/zod";
import { useConfiguracion, useEditarConfiguracion } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoFormulario } from "./CampoFormulario";
import { ERROR_AL_GUARDAR, marcarErroresDelServidor } from "./errores";
import { type DatosParametros, esquemaParametros } from "./esquemas";

/** Parámetros del negocio (RF-084, pantalla 30 del prototipo). */
export function FormularioParametros({ cliente }: { cliente: AxiosInstance }) {
  const { data: configuracion, isPending } = useConfiguracion(cliente);
  const editar = useEditarConfiguracion(cliente);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formulario = useForm<DatosParametros>({
    resolver: zodResolver(esquemaParametros),
    values: configuracion && {
      vigencia_cotizacion_meses: configuracion.vigencia_cotizacion_meses,
      anticipacion_salida_dias: configuracion.anticipacion_salida_dias,
      recontacto_meses: configuracion.recontacto_meses,
    },
  });
  const { errors } = formulario.formState;

  async function guardar(datos: DatosParametros) {
    setGuardado(false);
    setError(null);
    try {
      await editar.mutateAsync(datos);
      setGuardado(true);
    } catch (falla) {
      if (!marcarErroresDelServidor(falla, formulario.setError)) setError(ERROR_AL_GUARDAR);
    }
  }

  if (isPending) return <p role="status">Cargando…</p>;

  return (
    <form
      noValidate
      className="flex max-w-md flex-col gap-5"
      onSubmit={(evento) => void formulario.handleSubmit(guardar)(evento)}
    >
      <h2 className="text-lg font-semibold">Parámetros del negocio</h2>
      <CampoFormulario
        id="vigencia"
        etiqueta="Vigencia de la cotización (meses)"
        error={errors.vigencia_cotizacion_meses}
      >
        {(props) => (
          <Input
            type="number"
            {...props}
            {...formulario.register("vigencia_cotizacion_meses", { valueAsNumber: true })}
          />
        )}
      </CampoFormulario>
      <CampoFormulario
        id="anticipacion"
        etiqueta="Anticipación de la salida (días)"
        error={errors.anticipacion_salida_dias}
      >
        {(props) => (
          <Input
            type="number"
            {...props}
            {...formulario.register("anticipacion_salida_dias", { valueAsNumber: true })}
          />
        )}
      </CampoFormulario>
      <CampoFormulario
        id="recontacto"
        etiqueta="Recontacto de clientes (meses)"
        error={errors.recontacto_meses}
      >
        {(props) => (
          <Input
            type="number"
            {...props}
            {...formulario.register("recontacto_meses", { valueAsNumber: true })}
          />
        )}
      </CampoFormulario>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {guardado && (
        <p role="status" className="text-sm text-muted-foreground">
          Parámetros guardados.
        </p>
      )}
      <Button type="submit" className="self-start" disabled={editar.isPending}>
        Guardar parámetros
      </Button>
    </form>
  );
}
