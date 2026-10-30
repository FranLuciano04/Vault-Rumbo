import { zodResolver } from "@hookform/resolvers/zod";
import type { Viaje } from "@rumbo/shared";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { CampoFormulario } from "@/components/CampoFormulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aplicarErroresDelServidor } from "@/lib/errores";
import { esquemaTramo, type DatosTramo } from "./esquemas";

/** Formulario de fechas de un tramo, para agregarlo o editarlo; `enviar` rechaza con el error de la API. */
export function FormularioTramo({
  viaje,
  titulo,
  inicial,
  textoEnviar,
  enviar,
  cancelar,
}: {
  viaje: Viaje;
  titulo: string;
  inicial: DatosTramo;
  textoEnviar: string;
  enviar: (datos: DatosTramo, cambiados: (keyof DatosTramo)[]) => Promise<void>;
  cancelar: () => void;
}) {
  const esquema = useMemo(() => esquemaTramo(viaje), [viaje]);
  const [aviso, setAviso] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<DatosTramo>({
    resolver: zodResolver(esquema),
    defaultValues: inicial,
  });
  const { errors, isSubmitting, dirtyFields } = formState;

  async function guardar(datos: DatosTramo) {
    setAviso(null);
    const cambiados = (Object.keys(dirtyFields) as (keyof DatosTramo)[]).filter(
      (campo) => dirtyFields[campo],
    );
    try {
      await enviar(datos, cambiados);
    } catch (falla) {
      setAviso(aplicarErroresDelServidor(falla, ["check_in", "check_out"], setError));
    }
  }

  return (
    <form
      noValidate
      aria-label={titulo}
      className="mt-3 flex flex-col gap-3 rounded-xl bg-muted/40 p-4"
      onSubmit={(evento) => void handleSubmit(guardar)(evento)}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <CampoFormulario id="tramo-check-in" etiqueta="Check-in" error={errors.check_in}>
          {(props) => <Input type="date" {...props} {...register("check_in")} />}
        </CampoFormulario>
        <CampoFormulario id="tramo-check-out" etiqueta="Check-out" error={errors.check_out}>
          {(props) => <Input type="date" {...props} {...register("check_out")} />}
        </CampoFormulario>
        <CampoFormulario
          id="tramo-vencimiento"
          etiqueta="Vencimiento del pago al proveedor (opcional)"
        >
          {(props) => <Input type="date" {...props} {...register("vencimiento_pago_proveedor")} />}
        </CampoFormulario>
      </div>
      {aviso && (
        <p role="alert" className="text-sm text-destructive">
          {aviso}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {textoEnviar}
        </Button>
        <Button type="button" variant="outline" onClick={cancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
