import { zodResolver } from "@hookform/resolvers/zod";
import { useConfiguracion, useEditarConfiguracion } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoFormulario } from "./CampoFormulario";
import { aplicarErroresDelServidor } from "./errores";
import { type DatosParametros, esquemaParametros } from "./esquemas";

const CAMPOS: { id: string; nombre: keyof DatosParametros; etiqueta: string }[] = [
  {
    id: "vigencia",
    nombre: "vigencia_cotizacion_meses",
    etiqueta: "Vigencia de la cotización (meses)",
  },
  {
    id: "anticipacion",
    nombre: "anticipacion_salida_dias",
    etiqueta: "Anticipación de la salida (días)",
  },
  { id: "recontacto", nombre: "recontacto_meses", etiqueta: "Recontacto de clientes (meses)" },
];

/** Parámetros del negocio (RF-084, pantalla 30 del prototipo). */
export function FormularioParametros({ cliente }: { cliente: AxiosInstance }) {
  const { data: configuracion, isPending, isError } = useConfiguracion(cliente);
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
      setError(
        aplicarErroresDelServidor(
          falla,
          CAMPOS.map(({ nombre }) => nombre),
          formulario.setError,
        ),
      );
    }
  }

  if (isError)
    return (
      <p role="alert" className="text-sm font-medium text-destructive">
        No pudimos cargar los parámetros del negocio. Probá de nuevo en unos minutos.
      </p>
    );
  if (isPending) return <p role="status">Cargando…</p>;

  return (
    <form
      noValidate
      className="flex max-w-md flex-col gap-5"
      onSubmit={(evento) => void formulario.handleSubmit(guardar)(evento)}
    >
      <h2 className="text-lg font-semibold">Parámetros del negocio</h2>
      {CAMPOS.map(({ id, nombre, etiqueta }) => (
        <CampoFormulario key={id} id={id} etiqueta={etiqueta} error={errors[nombre]}>
          {(props) => (
            <Input
              type="number"
              {...props}
              {...formulario.register(nombre, { valueAsNumber: true })}
            />
          )}
        </CampoFormulario>
      ))}
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
