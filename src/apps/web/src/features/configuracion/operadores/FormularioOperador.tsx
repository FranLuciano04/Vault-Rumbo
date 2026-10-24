import { zodResolver } from "@hookform/resolvers/zod";
import type { Operador } from "@rumbo/shared";
import { useCrearOperador, useEditarOperador } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoFormulario } from "@/components/CampoFormulario";
import { aplicarErroresDelServidor } from "@/lib/errores";
import { type DatosOperador, esquemaOperador } from "../esquemas";

const CAMPOS = ["nombre", "contacto"] as const;

/** Alta y edición de un operador (RF-093); el 409 por nombre repetido (RF-094) deja el formulario abierto. */
export function FormularioOperador({
  cliente,
  operador,
  onCerrar,
}: {
  cliente: AxiosInstance;
  operador?: Operador;
  onCerrar: () => void;
}) {
  const crear = useCrearOperador(cliente);
  const editar = useEditarOperador(cliente);
  const [error, setError] = useState<string | null>(null);
  const formulario = useForm<DatosOperador>({
    resolver: zodResolver(esquemaOperador),
    defaultValues: {
      nombre: operador?.nombre ?? "",
      contacto: operador?.contacto ?? "",
    },
  });
  const { errors } = formulario.formState;

  async function guardar({ nombre, contacto }: DatosOperador) {
    setError(null);
    const datos = { nombre, contacto: contacto || null };
    try {
      if (operador) await editar.mutateAsync({ operadorId: operador.id, datos });
      else await crear.mutateAsync(datos);
      onCerrar();
    } catch (falla) {
      setError(aplicarErroresDelServidor(falla, CAMPOS, formulario.setError));
    }
  }

  return (
    <form
      noValidate
      aria-label={operador ? `Editar ${operador.nombre}` : "Nuevo operador"}
      className="flex max-w-md flex-col gap-4 rounded-md border p-4"
      onSubmit={(evento) => void formulario.handleSubmit(guardar)(evento)}
    >
      <CampoFormulario id="operador-nombre" etiqueta="Nombre" error={errors.nombre}>
        {(props) => <Input {...props} {...formulario.register("nombre")} />}
      </CampoFormulario>
      <CampoFormulario
        id="operador-contacto"
        etiqueta="Contacto (opcional)"
        error={errors.contacto}
      >
        {(props) => <Input {...props} {...formulario.register("contacto")} />}
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
