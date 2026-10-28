import { zodResolver } from "@hookform/resolvers/zod";
import type { Oportunidad } from "@rumbo/shared";
import { useEditarOportunidad } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CampoFormulario } from "@/components/CampoFormulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aplicarErroresDelServidor } from "@/lib/errores";
import {
  esquemaDestinoPasajeros,
  type DatosDestinoPasajeros,
  type EntradaDestinoPasajeros,
} from "./esquemas";

const CAMPOS = ["destino_consultado", "pasajeros"] as const;

/** Completar o corregir el destino y los pasajeros desde el detalle (RF-013, DEC-0023); no se pueden vaciar. */
export function EdicionDestinoPasajeros({
  cliente,
  oportunidad,
}: {
  cliente: AxiosInstance;
  oportunidad: Oportunidad;
}) {
  const editar = useEditarOportunidad(cliente);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formulario = useForm<EntradaDestinoPasajeros, unknown, DatosDestinoPasajeros>({
    resolver: zodResolver(esquemaDestinoPasajeros),
    defaultValues: {
      destino_consultado: oportunidad.destino_consultado ?? "",
      pasajeros: oportunidad.pasajeros ?? Number.NaN,
    },
  });
  const { errors, isSubmitting } = formulario.formState;
  const incompleta = oportunidad.destino_consultado === null || oportunidad.pasajeros === null;

  async function enviar(datos: DatosDestinoPasajeros) {
    setError(null);
    try {
      await editar.mutateAsync({ oportunidadId: oportunidad.id, cambios: datos });
      setAbierto(false);
    } catch (falla) {
      setError(aplicarErroresDelServidor(falla, CAMPOS, formulario.setError));
    }
  }

  if (!abierto) {
    return (
      <Button variant="outline" onClick={() => { setAbierto(true); }}>
        {incompleta ? "Completar destino y pasajeros" : "Editar destino y pasajeros"}
      </Button>
    );
  }
  return (
    <form
      noValidate
      aria-label="Destino y pasajeros"
      className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
      onSubmit={(evento) => void formulario.handleSubmit(enviar)(evento)}
    >
      <CampoFormulario id="edicion-destino" etiqueta="Destino" error={errors.destino_consultado}>
        {(props) => <Input {...props} {...formulario.register("destino_consultado")} />}
      </CampoFormulario>
      <CampoFormulario id="edicion-pasajeros" etiqueta="Pasajeros" error={errors.pasajeros}>
        {(props) => (
          <Input
            type="number"
            min={1}
            {...props}
            {...formulario.register("pasajeros", { valueAsNumber: true })}
          />
        )}
      </CampoFormulario>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          Guardar
        </Button>
        <Button type="button" variant="outline" onClick={() => { setAbierto(false); }}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
