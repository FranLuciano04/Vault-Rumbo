import { ETIQUETA_ESTADO_OPORTUNIDAD, type EstadoOportunidad } from "@rumbo/shared";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** Alternativa con teclado al arrastre (RF-016): menú con los destinos válidos, que mueven igual que soltar la tarjeta. */
export function MenuMoverOportunidad({
  nombre,
  destinos,
  alElegir,
}: {
  nombre: string;
  destinos: readonly EstadoOportunidad[];
  alElegir: (destino: EstadoOportunidad) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const primerDestino = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (abierto) primerDestino.current?.focus();
  }, [abierto]);

  return (
    <div
      className="relative"
      onKeyDown={(evento) => {
        if (evento.key === "Escape") setAbierto(false);
      }}
      onBlur={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget)) setAbierto(false);
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => {
          setAbierto(!abierto);
        }}
      >
        Mover {nombre}
      </Button>
      {abierto && (
        <div
          role="menu"
          aria-label={`Mover ${nombre} a`}
          className="absolute left-0 z-10 mt-1 flex min-w-36 flex-col rounded-md border bg-card p-1 shadow-md"
        >
          {destinos.map((destino, indice) => (
            <button
              key={destino}
              ref={indice === 0 ? primerDestino : undefined}
              type="button"
              role="menuitem"
              className="rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent"
              onClick={() => {
                setAbierto(false);
                alElegir(destino);
              }}
            >
              {ETIQUETA_ESTADO_OPORTUNIDAD[destino]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
