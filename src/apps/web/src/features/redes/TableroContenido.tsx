import { mensajeDeError, type ContenidoRed } from "@rumbo/shared";
import { useDescartarContenido, useEditarContenido } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { COLUMNAS } from "./etiquetas";
import { TarjetaContenido } from "./TarjetaContenido";

/** Kanban de contenido (RF-114): una columna por estado, con las piezas de cada una. */
export function TableroContenido({
  cliente,
  piezas,
  alEditar,
}: {
  cliente: AxiosInstance;
  piezas: ContenidoRed[];
  alEditar: (pieza: ContenidoRed) => void;
}) {
  const editar = useEditarContenido(cliente);
  const descartar = useDescartarContenido(cliente);
  const error = editar.error ?? descartar.error;
  const ocupada = editar.isPending || descartar.isPending;

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mensajeDeError(error)}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNAS.map(({ estado, etiqueta }) => {
          const deLaColumna = piezas.filter((pieza) => pieza.estado_kanban === estado);
          return (
            <section key={estado} className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3">
              <h2 className="text-sm font-semibold">
                {etiqueta} <span className="text-muted-foreground">({deLaColumna.length})</span>
              </h2>
              {deLaColumna.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin piezas en esta columna.</p>
              )}
              {deLaColumna.map((pieza) => (
                <TarjetaContenido
                  key={pieza.id}
                  pieza={pieza}
                  ocupada={ocupada}
                  alMover={(estado_kanban) => {
                    editar.mutate({ contenidoId: pieza.id, cambios: { estado_kanban } });
                  }}
                  alEditar={() => {
                    alEditar(pieza);
                  }}
                  alDescartar={() => {
                    descartar.mutate(pieza.id);
                  }}
                />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
