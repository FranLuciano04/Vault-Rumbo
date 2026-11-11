import { ETIQUETA_ESTADO_OPORTUNIDAD, type EstadoOportunidad } from "@rumbo/shared";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";

/** Alternativa con teclado al arrastre (RF-016): menú con los destinos válidos, que mueven igual que soltar la tarjeta. */
export function MenuMoverOportunidad({
  nombre,
  destinos,
  deshabilitado = false,
  alElegir,
}: {
  nombre: string;
  destinos: readonly EstadoOportunidad[];
  deshabilitado?: boolean;
  alElegir: (destino: EstadoOportunidad) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const items = () => [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
  useEffect(() => {
    if (abierto) items()[0]?.focus();
  }, [abierto]);

  function alTeclear(evento: KeyboardEvent<HTMLDivElement>) {
    if (!abierto) return;
    if (evento.key === "Escape") {
      setAbierto(false);
      boton.current?.focus();
      return;
    }
    const lista = items();
    const actual = lista.indexOf(document.activeElement as HTMLElement);
    const siguiente = {
      ArrowDown: (actual + 1) % lista.length,
      ArrowUp: (actual - 1 + lista.length) % lista.length,
      Home: 0,
      End: lista.length - 1,
    }[evento.key];
    if (siguiente !== undefined) {
      evento.preventDefault();
      lista[siguiente]?.focus();
    }
  }

  return (
    <div
      className="relative"
      onKeyDown={alTeclear}
      onBlur={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget)) setAbierto(false);
      }}
    >
      <Button
        ref={boton}
        variant="ghost"
        size="sm"
        disabled={deshabilitado}
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
          ref={menu}
          role="menu"
          aria-label={`Mover ${nombre} a`}
          className="absolute left-0 z-10 mt-1 flex min-w-36 flex-col rounded-md border bg-card p-1 shadow-md"
        >
          {destinos.map((destino) => (
            <button
              key={destino}
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
