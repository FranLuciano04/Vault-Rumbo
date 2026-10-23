import { zodResolver } from "@hookform/resolvers/zod";
import type { Destino } from "@rumbo/shared";
import { useCrearDestino, useEditarDestino } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoFormulario } from "../CampoFormulario";
import { aplicarErroresDelServidor } from "../errores";
import { type DatosDestino, esquemaDestino } from "../esquemas";

const CAMPOS = ["nombre", "pais", "region", "notas"] as const;

/** Alta y edición de un destino (RF-089); el 409 por nombre y país repetidos (RF-090) deja el formulario abierto. */
export function FormularioDestino({
  cliente,
  destino,
  onCerrar,
}: {
  cliente: AxiosInstance;
  destino?: Destino;
  onCerrar: () => void;
}) {
  const crear = useCrearDestino(cliente);
  const editar = useEditarDestino(cliente);
  const [error, setError] = useState<string | null>(null);
  const formulario = useForm<DatosDestino>({
    resolver: zodResolver(esquemaDestino),
    defaultValues: {
      nombre: destino?.nombre ?? "",
      pais: destino?.pais ?? "",
      region: destino?.region ?? "",
      notas: destino?.notas ?? "",
    },
  });
  const { errors } = formulario.formState;

  async function guardar({ region, notas, ...obligatorios }: DatosDestino) {
    setError(null);
    const datos = { ...obligatorios, region: region || null, notas: notas || null };
    try {
      if (destino) await editar.mutateAsync({ destinoId: destino.id, datos });
      else await crear.mutateAsync(datos);
      onCerrar();
    } catch (falla) {
      setError(aplicarErroresDelServidor(falla, CAMPOS, formulario.setError));
    }
  }

  return (
    <form
      noValidate
      aria-label={destino ? `Editar ${destino.nombre}` : "Nuevo destino"}
      className="flex max-w-md flex-col gap-4 rounded-md border p-4"
      onSubmit={(evento) => void formulario.handleSubmit(guardar)(evento)}
    >
      <CampoFormulario id="destino-nombre" etiqueta="Nombre" error={errors.nombre}>
        {(props) => <Input {...props} {...formulario.register("nombre")} />}
      </CampoFormulario>
      <CampoFormulario id="destino-pais" etiqueta="País" error={errors.pais}>
        {(props) => <Input {...props} {...formulario.register("pais")} />}
      </CampoFormulario>
      <CampoFormulario id="destino-region" etiqueta="Región" error={errors.region}>
        {(props) => <Input {...props} {...formulario.register("region")} />}
      </CampoFormulario>
      <CampoFormulario id="destino-notas" etiqueta="Notas" error={errors.notas}>
        {(props) => <Input {...props} {...formulario.register("notas")} />}
      </CampoFormulario>
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
