import { formatearFecha, type ContenidoRed } from "@rumbo/shared";
import { CalendarDays, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { COLUMNAS, ETIQUETA_CANAL } from "./etiquetas";

const ETIQUETA_ESTADO_FECHA: Partial<Record<ContenidoRed["estado_kanban"], string>> = {
  publicado: "Publicado a mano",
  descartado: "Descartada",
};

/** Una pieza del tablero (RF-114, RF-115, RF-117): avanzar o retroceder, editar y descartar con confirmación. */
export function TarjetaContenido({
  pieza,
  ocupada,
  soloLectura = false,
  alMover,
  alEditar,
  alProponer,
  alDescartar,
}: {
  pieza: ContenidoRed;
  ocupada: boolean;
  /** Una pieza descartada se conserva pero no admite acciones. */
  soloLectura?: boolean;
  alMover: (estado: ContenidoRed["estado_kanban"]) => void;
  alEditar: () => void;
  alProponer: () => void;
  alDescartar: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const posicion = COLUMNAS.findIndex(({ estado }) => estado === pieza.estado_kanban);
  const publicada = pieza.estado_kanban === "publicado";
  const anterior = posicion > 0 ? COLUMNAS[posicion - 1] : undefined;
  const siguiente = publicada ? undefined : COLUMNAS[posicion + 1];
  const conAcciones = !soloLectura && !publicada;
  // La propuesta con IA (CU-20 A3) se ofrece mientras la pieza se está pensando o produciendo.
  const conPropuesta = pieza.estado_kanban === "idea" || pieza.estado_kanban === "en_produccion";
  const Icono = publicada ? Check : CalendarDays;

  return (
    <article className="flex flex-col gap-2 rounded-xl border bg-card p-3 text-sm">
      <span className="self-start rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
        {ETIQUETA_CANAL[pieza.canal]}
      </span>
      <p className="font-medium">{pieza.titulo}</p>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icono aria-hidden="true" className="size-3.5" />
        {`${ETIQUETA_ESTADO_FECHA[pieza.estado_kanban] ?? "Programado"} · ${formatearFecha(pieza.fecha_publicacion)}`}
      </p>
      {conAcciones && !confirmando && (
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
          {conPropuesta && (
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Propuesta con IA para «${pieza.titulo}»`}
              onClick={alProponer}
            >
              Propuesta con IA
            </Button>
          )}
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
