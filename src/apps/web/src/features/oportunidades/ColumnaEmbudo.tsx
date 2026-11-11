import { useDndContext, useDroppable } from "@dnd-kit/core";
import {
  ETIQUETA_ESTADO_OPORTUNIDAD,
  type EstadoOportunidad,
  type Oportunidad,
  type UsuarioActual,
} from "@rumbo/shared";
import type { useOportunidadesPorPaginas } from "@rumbo/shared/hooks";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { puedeEscribirOportunidad } from "./permisos";
import { TarjetaOportunidad } from "./TarjetaOportunidad";
import { DESTINOS_POR_ESTADO } from "./transiciones";

/**
 * Columna del embudo con el total del servidor. Mientras se arrastra una tarjeta, las columnas que no
 * son destino válido de su estado quedan deshabilitadas y no reciben el soltar (RF-016).
 */
export function ColumnaEmbudo({
  estado,
  consulta,
  usuario,
  alMover,
  bloqueada,
}: {
  estado: EstadoOportunidad;
  consulta: ReturnType<typeof useOportunidadesPorPaginas>;
  usuario: UsuarioActual;
  alMover: (oportunidad: Oportunidad, destino: EstadoOportunidad) => void;
  /** Hay un cambio de estado en curso: no se arrastra ni se abre el menú. */
  bloqueada: boolean;
}) {
  const arrastrada = useDndContext().active?.data.current?.["oportunidad"] as
    Oportunidad | undefined;
  const esDestinoValido = arrastrada
    ? DESTINOS_POR_ESTADO[arrastrada.estado].includes(estado)
    : false;
  const deshabilitada = arrastrada !== undefined && !esDestinoValido;
  const { setNodeRef, isOver } = useDroppable({
    id: estado,
    disabled: !esDestinoValido,
  });
  const oportunidades = consulta.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section
      ref={setNodeRef}
      aria-disabled={deshabilitada ? true : undefined}
      className={cn(
        "space-y-2 rounded-lg bg-muted/50 p-3 transition-opacity",
        // La columna de origen no se atenúa: parecería que la tarjeta desaparece.
        deshabilitada && arrastrada.estado !== estado && "opacity-40",
        isOver && "ring-2 ring-primary",
      )}
    >
      <h2 className="flex items-center justify-between text-sm font-semibold">
        {ETIQUETA_ESTADO_OPORTUNIDAD[estado]}{" "}
        <span className="tabular-nums text-muted-foreground">{consulta.data?.pages[0]?.total}</span>
      </h2>
      <ul className="space-y-2">
        {oportunidades.map((o) => (
          <TarjetaOportunidad
            key={o.id}
            oportunidad={o}
            bloqueada={bloqueada}
            alMover={
              puedeEscribirOportunidad(usuario, o)
                ? (destino) => {
                    alMover(o, destino);
                  }
                : undefined
            }
          />
        ))}
      </ul>
      {consulta.isFetchNextPageError && (
        <p role="alert" className="text-xs text-destructive">
          No pudimos traer más oportunidades.
        </p>
      )}
      {consulta.hasNextPage && (
        <Button
          variant="ghost"
          className="w-full"
          disabled={consulta.isFetchingNextPage}
          onClick={() => void consulta.fetchNextPage()}
        >
          Ver más
        </Button>
      )}
    </section>
  );
}
