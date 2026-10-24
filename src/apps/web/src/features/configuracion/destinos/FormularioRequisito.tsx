import { zodResolver } from "@hookform/resolvers/zod";
import type { RequisitoDestino } from "@rumbo/shared";
import { useCrearRequisitoDestino, useEditarRequisitoDestino } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoFormulario, CLASE_SELECT } from "@/components/CampoFormulario";
import { aplicarErroresDelServidor } from "@/lib/errores";
import { type DatosRequisito, esquemaRequisito, TIPOS_REQUISITO } from "../esquemas";

const CAMPOS = ["nombre", "tipo", "obligatorio", "descripcion", "anticipacion_dias"] as const;

/** Alta y edición de un requisito de un destino (RF-086). */
export function FormularioRequisito({
  cliente,
  destinoId,
  requisito,
  onCerrar,
}: {
  cliente: AxiosInstance;
  destinoId: string;
  requisito?: RequisitoDestino;
  onCerrar: () => void;
}) {
  const crear = useCrearRequisitoDestino(cliente);
  const editar = useEditarRequisitoDestino(cliente);
  const [error, setError] = useState<string | null>(null);
  const formulario = useForm<DatosRequisito>({
    resolver: zodResolver(esquemaRequisito),
    defaultValues: {
      nombre: requisito?.nombre ?? "",
      tipo: requisito?.tipo ?? "documentacion",
      obligatorio: requisito?.obligatorio ?? false,
      descripcion: requisito?.descripcion ?? "",
      // Sin valor cargado queda vacío ("" limpia el campo) para que haya que ingresarlo.
      anticipacion_dias: (requisito?.anticipacion_dias ?? "") as number,
    },
  });
  const { errors } = formulario.formState;

  async function guardar({ descripcion, ...resto }: DatosRequisito) {
    setError(null);
    const datos = { ...resto, descripcion: descripcion || null };
    try {
      if (requisito) await editar.mutateAsync({ requisitoId: requisito.id, datos });
      else await crear.mutateAsync({ destinoId, datos });
      onCerrar();
    } catch (falla) {
      setError(aplicarErroresDelServidor(falla, CAMPOS, formulario.setError));
    }
  }

  return (
    <form
      noValidate
      aria-label={requisito ? `Editar ${requisito.nombre}` : "Nuevo requisito"}
      className="flex max-w-md flex-col gap-4 rounded-md border p-4"
      onSubmit={(evento) => void formulario.handleSubmit(guardar)(evento)}
    >
      <CampoFormulario id="requisito-nombre" etiqueta="Nombre" error={errors.nombre}>
        {(props) => <Input {...props} {...formulario.register("nombre")} />}
      </CampoFormulario>
      <CampoFormulario id="requisito-tipo" etiqueta="Tipo" error={errors.tipo}>
        {(props) => (
          <select className={CLASE_SELECT} {...props} {...formulario.register("tipo")}>
            {TIPOS_REQUISITO.map(({ valor, etiqueta }) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        )}
      </CampoFormulario>
      <CampoFormulario id="requisito-obligatorio" etiqueta="Obligatorio" error={errors.obligatorio}>
        {(props) => (
          <input
            type="checkbox"
            className="size-4 self-start"
            {...props}
            {...formulario.register("obligatorio")}
          />
        )}
      </CampoFormulario>
      <CampoFormulario id="requisito-descripcion" etiqueta="Descripción" error={errors.descripcion}>
        {(props) => <Input {...props} {...formulario.register("descripcion")} />}
      </CampoFormulario>
      <CampoFormulario
        id="requisito-anticipacion"
        etiqueta="Anticipación (días)"
        error={errors.anticipacion_dias}
      >
        {(props) => (
          <Input
            type="number"
            {...props}
            {...formulario.register("anticipacion_dias", { valueAsNumber: true })}
          />
        )}
      </CampoFormulario>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={crear.isPending || editar.isPending}>
          Guardar requisito
        </Button>
        <Button type="button" variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
