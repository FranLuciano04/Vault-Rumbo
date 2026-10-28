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

type Props = { cliente: AxiosInstance; oportunidad: Oportunidad };

/** Completar o corregir el destino y los pasajeros desde el detalle (RF-013, DEC-0023). */
export function EdicionDestinoPasajeros({ cliente, oportunidad }: Props) {
  const [abierto, setAbierto] = useState(false);
  if (abierto) {
    return (
      <FormularioDestinoPasajeros
        cliente={cliente}
        oportunidad={oportunidad}
        alCerrar={() => {
          setAbierto(false);
        }}
      />
    );
  }
  const incompleta = oportunidad.destino_consultado === null || oportunidad.pasajeros === null;
  return (
    <Button
      variant="outline"
      onClick={() => {
        setAbierto(true);
      }}
    >
      {incompleta ? "Completar destino y pasajeros" : "Editar destino y pasajeros"}
    </Button>
  );
}

/** Se monta solo mientras está abierto: los valores iniciales salen siempre de la oportunidad actual. */
function FormularioDestinoPasajeros({
  cliente,
  oportunidad,
  alCerrar,
}: Props & { alCerrar: () => void }) {
  const editar = useEditarOportunidad(cliente);
  const [error, setError] = useState<string | null>(null);
  const formulario = useForm<EntradaDestinoPasajeros, unknown, DatosDestinoPasajeros>({
    resolver: zodResolver(
      esquemaDestinoPasajeros({
        destino: oportunidad.destino_consultado !== null,
        pasajeros: oportunidad.pasajeros !== null,
      }),
    ),
    defaultValues: {
      destino_consultado: oportunidad.destino_consultado ?? "",
      pasajeros: oportunidad.pasajeros ?? Number.NaN,
    },
  });
  const { errors, isSubmitting } = formulario.formState;

  async function enviar(datos: DatosDestinoPasajeros) {
    setError(null);
    // Solo viajan los datos cargados que cambiaron; si no hay ninguno, no hay PATCH.
    const cambios: DatosDestinoPasajeros = {};
    if (datos.destino_consultado && datos.destino_consultado !== oportunidad.destino_consultado) {
      cambios.destino_consultado = datos.destino_consultado;
    }
    if (datos.pasajeros !== undefined && datos.pasajeros !== oportunidad.pasajeros) {
      cambios.pasajeros = datos.pasajeros;
    }
    if (Object.keys(cambios).length === 0) {
      alCerrar();
      return;
    }
    try {
      await editar.mutateAsync({ oportunidadId: oportunidad.id, cambios });
      alCerrar();
    } catch (falla) {
      setError(aplicarErroresDelServidor(falla, CAMPOS, formulario.setError));
    }
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
        <Button type="button" variant="outline" onClick={alCerrar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
