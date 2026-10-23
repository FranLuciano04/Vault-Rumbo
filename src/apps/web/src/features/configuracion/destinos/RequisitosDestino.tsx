import type { Destino, RequisitoDestino } from "@rumbo/shared";
import { useDarDeBajaRequisitoDestino, useRequisitosDestino } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TIPOS_REQUISITO } from "../esquemas";
import { FormularioRequisito } from "./FormularioRequisito";

const etiquetaTipo = (tipo: RequisitoDestino["tipo"]) =>
  TIPOS_REQUISITO.find(({ valor }) => valor === tipo)?.etiqueta ?? tipo;

/** Requisitos del destino elegido (RF-086): listado, alta, edición y baja. */
export function RequisitosDestino({
  cliente,
  destino,
}: {
  cliente: AxiosInstance;
  destino: Destino;
}) {
  const { data, isError } = useRequisitosDestino(cliente, destino.id);
  const quitar = useDarDeBajaRequisitoDestino(cliente);
  // `null` = formulario cerrado, `"nuevo"` = alta, un requisito = edición.
  const [formulario, setFormulario] = useState<RequisitoDestino | "nuevo" | null>(null);
  const requisitos = data?.items.filter(({ activo }) => activo) ?? [];

  return (
    <section aria-labelledby="titulo-requisitos" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 id="titulo-requisitos" className="text-lg font-semibold">
          Requisitos de {destino.nombre}
        </h2>
        <Button
          onClick={() => {
            setFormulario("nuevo");
          }}
        >
          Agregar requisito
        </Button>
      </div>
      {formulario && (
        <FormularioRequisito
          key={formulario === "nuevo" ? "nuevo" : formulario.id}
          cliente={cliente}
          destinoId={destino.id}
          requisito={formulario === "nuevo" ? undefined : formulario}
          onCerrar={() => {
            setFormulario(null);
          }}
        />
      )}
      {isError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          No pudimos cargar los requisitos. Probá de nuevo en unos minutos.
        </p>
      ) : (
        data &&
        (requisitos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este destino todavía no tiene requisitos.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 font-medium">Requisito</th>
                <th className="py-2 font-medium">Tipo</th>
                <th className="py-2 font-medium">Obligatorio</th>
                <th className="py-2 font-medium">Anticipación</th>
                <th className="py-2 font-medium">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {requisitos.map((requisito) => (
                <tr key={requisito.id} className="border-b">
                  <td className="py-2">{requisito.nombre}</td>
                  <td className="py-2">{etiquetaTipo(requisito.tipo)}</td>
                  <td className="py-2">{requisito.obligatorio ? "Sí" : "No"}</td>
                  <td className="py-2">{requisito.anticipacion_dias} días</td>
                  <td className="flex justify-end gap-2 py-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormulario(requisito);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={quitar.isPending}
                      onClick={() => {
                        quitar.mutate(requisito.id);
                      }}
                    >
                      Quitar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))
      )}
    </section>
  );
}
