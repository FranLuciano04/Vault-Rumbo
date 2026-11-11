import { Star } from "lucide-react";
import { useRef, useState, type ComponentProps, type KeyboardEvent, type Ref } from "react";
import { cn } from "@/lib/utils";

const ESTRELLAS = [1, 2, 3, 4, 5] as const;

/**
 * Puntaje de 1 a 5 con estrellas: un `radiogroup` con una sola estrella en el orden de tabulación;
 * las flechas mueven el foco y la elección juntos, y el mouse previsualiza antes de elegir.
 */
export function SelectorEstrellas({
  id,
  valor,
  alCambiar,
  ref,
  ...aria
}: {
  /** Lo nombra la etiqueta visible `${id}-etiqueta` de `CampoFormulario`. */
  id: string;
  /** Puntaje elegido, o `null` si todavía no se eligió ninguno. */
  valor: number | null;
  alCambiar: (puntaje: number) => void;
  /** Va a la estrella que entra en el orden de tabulación, para que el formulario pueda enfocarla. */
  ref?: Ref<HTMLButtonElement>;
} & Pick<ComponentProps<"div">, "aria-invalid" | "aria-describedby">) {
  const [previsto, setPrevisto] = useState<number | null>(null);
  const botones = useRef<(HTMLButtonElement | null)[]>([]);
  const resaltado = previsto ?? valor ?? 0;

  function alTeclear(evento: KeyboardEvent, actual: number) {
    const paso = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[evento.key];
    if (paso === undefined) return;
    evento.preventDefault();
    const siguiente = ((actual - 1 + paso + ESTRELLAS.length) % ESTRELLAS.length) + 1;
    setPrevisto(null);
    alCambiar(siguiente);
    botones.current[siguiente - 1]?.focus();
  }

  return (
    <div
      role="radiogroup"
      id={id}
      aria-labelledby={`${id}-etiqueta`}
      className="flex gap-1"
      onMouseLeave={() => {
        setPrevisto(null);
      }}
      {...aria}
    >
      {ESTRELLAS.map((n) => (
        <button
          key={n}
          ref={(boton) => {
            botones.current[n - 1] = boton;
            if (n !== (valor ?? 1)) return;
            if (typeof ref === "function") ref(boton);
            else if (ref) ref.current = boton;
          }}
          type="button"
          role="radio"
          aria-checked={valor === n}
          aria-label={n === 1 ? "1 estrella" : `${String(n)} estrellas`}
          tabIndex={n === (valor ?? 1) ? 0 : -1}
          className="rounded-sm p-0.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          data-resaltada={n <= resaltado}
          onClick={() => {
            setPrevisto(null);
            alCambiar(n);
          }}
          onKeyDown={(evento) => {
            alTeclear(evento, n);
          }}
          onMouseEnter={() => {
            setPrevisto(n);
          }}
        >
          <Star
            aria-hidden="true"
            className={cn(
              "size-6",
              n <= resaltado ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  );
}
