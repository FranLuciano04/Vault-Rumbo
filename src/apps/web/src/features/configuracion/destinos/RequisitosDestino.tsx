import type { Destino, RequisitoDestino } from "@rumbo/shared";
import { useDarDeBajaRequisitoDestino, useRequisitosDestino } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { mensajeDeError } from "@/lib/errores";
import { TIPOS_REQUISITO } from "../esquemas";
import { FormularioRequisito } from "./FormularioRequisito";

const etiquetaTipo = (tipo: RequisitoDestino["tipo"]) =>
  TIPOS_REQUISITO.find(({ valor }) => valor === tipo)?.etiqueta ?? tipo;

/** Requisitos del destino elegido (RF-086): listado, alta, edición y baja con confirmación. */
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
  const [porQuitar, setPorQuitar] = useState<RequisitoDestino | null>(null);

  function confirmarBaja(requisito: RequisitoDestino) {
    setPorQuitar(null);
    quitar.mutate(requisito.id);
  }

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
      {porQuitar && (
        <div
          role="alertdialog"
          aria-label={`Quitar ${porQuitar.nombre}`}
          className="flex max-w-md flex-col gap-3 rounded-md border p-4 text-sm"
        >
          <p>
            ¿Quitar «{porQuitar.nombre}»? Quitar un requisito es una baja lógica: no se puede
            deshacer desde acá.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                confirmarBaja(porQuitar);
              }}
            >
              Confirmar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPorQuitar(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
      {quitar.isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mensajeDeError(quitar.error)}
        </p>
      )}
      {isError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          No pudimos cargar los requisitos. Probá de nuevo en unos minutos.
        </p>
      ) : (
        data &&
        (data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este destino todavía no tiene requisitos.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 font-medium">Requisito</th>
                  <th className="py-2 font-medium">Tipo</th>
                  <th className="py-2 font-medium">Carácter</th>
                  <th className="py-2 font-medium">Anticipación</th>
                  <th className="py-2 font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((requisito) => (
                  <tr key={requisito.id} className="border-b">
                    <td className="py-2">{requisito.nombre}</td>
                    <td className="py-2">{etiquetaTipo(requisito.tipo)}</td>
                    <td className="py-2">
                      {requisito.obligatorio ? "Obligatorio" : "Recomendado"}
                    </td>
                    <td className="py-2">{requisito.anticipacion_dias} días antes</td>
                    <td className="py-2">
                      <div className="flex justify-end gap-2">
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
                            setPorQuitar(requisito);
                          }}
                        >
                          Quitar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.total > data.items.length && (
              <p role="status" className="text-sm text-muted-foreground">
                Mostramos {data.items.length} de {data.total} requisitos.
              </p>
            )}
          </>
        ))
      )}
      <div className="rounded-md bg-muted p-4 text-sm">
        <p className="font-medium">Los cambios aplican a los viajes futuros</p>
        <p className="text-muted-foreground">
          No se reescriben las alertas ya generadas. Quitar un requisito es una baja lógica.
        </p>
      </div>
    </section>
  );
}
