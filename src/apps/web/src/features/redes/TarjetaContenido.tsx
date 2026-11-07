import { formatearFecha, type ContenidoRed } from "@rumbo/shared";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { COLUMNAS, ETIQUETA_CANAL } from "./etiquetas";

/** Una pieza del tablero (RF-114, RF-115): avanzar o retroceder, editar y descartar con confirmación. */
export function TarjetaContenido({
  pieza,
  ocupada,
  alMover,
  alEditar,
  alDescartar,
}: {
  pieza: ContenidoRed;
  ocupada: boolean;
  alMover: (estado: ContenidoRed["estado_kanban"]) => void;
  alEditar: () => void;
  alDescartar: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const posicion = COLUMNAS.findIndex(({ estado }) => estado === pieza.estado_kanban);
  const publicada = pieza.estado_kanban === "publicado";
  const anterior = posicion > 0 ? COLUMNAS[posicion - 1] : undefined;
  const siguiente = COLUMNAS[posicion + 1];

  return (
    <article className="flex flex-col gap-2 rounded-xl border bg-card p-3 text-sm">
      <p className="font-medium">{pieza.titulo}</p>
      <p className="text-xs text-muted-foreground">
        {ETIQUETA_CANAL[pieza.canal]} · {formatearFecha(pieza.fecha_publicacion)}
      </p>
      {!publicada && !confirmando && (
        <div className="flex flex-wrap gap-1">
          {anterior && (
            <Button
              size="sm"
              variant="outline"
              disabled={ocupada}
              onClick={() => {
                alMover(anterior.estado);
              }}
            >
              {`Retroceder a ${anterior.etiqueta}`}
            </Button>
          )}
          {siguiente && (
            <Button
              size="sm"
              disabled={ocupada}
              onClick={() => {
                alMover(siguiente.estado);
              }}
            >
              {`Avanzar a ${siguiente.etiqueta}`}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={alEditar}>
            Editar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Descartar «${pieza.titulo}»`}
            onClick={() => {
              setConfirmando(true);
            }}
          >
            Descartar
          </Button>
        </div>
      )}
      {confirmando && (
        <div role="group" aria-label="Confirmar descarte" className="flex flex-wrap gap-1">
          <Button
            size="sm"
            disabled={ocupada}
            onClick={() => {
              alDescartar();
              setConfirmando(false);
            }}
          >
            Confirmar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setConfirmando(false);
            }}
          >
            Cancelar
          </Button>
        </div>
      )}
    </article>
  );
}
