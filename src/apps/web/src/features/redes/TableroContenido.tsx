import { mensajeDeError, type ContenidoRed } from "@rumbo/shared";
import { claveContenidos, useDescartarContenido, useEditarContenido } from "@rumbo/shared/hooks";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TarjetaContenido } from "./TarjetaContenido";
import type { ColumnaTablero } from "./useTableroContenido";

/** Kanban de contenido (RF-114): una columna por consulta, con sus piezas y «Ver más». */
export function TableroContenido({
  cliente,
  columnas,
  soloLectura = false,
  alEditar,
}: {
  cliente: AxiosInstance;
  columnas: ColumnaTablero[];
  soloLectura?: boolean;
  alEditar: (pieza: ContenidoRed) => void;
}) {
  const queryClient = useQueryClient();
  const editar = useEditarContenido(cliente);
  const descartar = useDescartarContenido(cliente);
  // Solo se ve el error de la última acción: una que sale bien lo limpia.
  const [error, setError] = useState<unknown>(null);
  const ocupada = editar.isPending || descartar.isPending;
  const resultado = {
    onSuccess: () => {
      setError(null);
    },
    // Si el servidor rechaza el movimiento, el tablero puede estar desactualizado: se vuelve a leer.
    onError: (falla: unknown) => {
      setError(falla);
      void queryClient.invalidateQueries({ queryKey: claveContenidos });
    },
  };

  return (
    <div className="flex flex-col gap-3">
      {error !== null && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mensajeDeError(error)}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columnas.map(({ estado, etiqueta, consulta, nota }) => {
          const piezas = consulta.data?.pages.flatMap((pagina) => pagina.items) ?? [];
          return (
            <section key={estado} className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3">
              <h2 className="text-sm font-semibold">
                {etiqueta}{" "}
                <span className="text-muted-foreground tabular-nums">
                  ({consulta.data?.pages[0]?.total ?? 0})
                </span>
              </h2>
              {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
              {piezas.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin piezas en esta columna.</p>
              )}
              {piezas.map((pieza) => (
                <TarjetaContenido
                  key={pieza.id}
                  pieza={pieza}
                  ocupada={ocupada}
                  soloLectura={soloLectura}
                  alMover={(estado_kanban) => {
                    editar.mutate({ contenidoId: pieza.id, cambios: { estado_kanban } }, resultado);
                  }}
                  alEditar={() => {
                    alEditar(pieza);
                  }}
                  alDescartar={() => {
                    descartar.mutate(pieza.id, resultado);
                  }}
                />
              ))}
              {consulta.isFetchNextPageError && (
                <p role="alert" className="text-xs text-destructive">
                  No pudimos traer más piezas.
                </p>
              )}
              {consulta.hasNextPage && (
                <Button
                  variant="ghost"
                  className="w-full"
                  aria-label={`Ver más piezas de ${etiqueta}`}
                  disabled={consulta.isFetchingNextPage}
                  onClick={() => void consulta.fetchNextPage()}
                >
                  Ver más
                </Button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
