import { useId, type ReactNode } from "react";

/** Panel del tablero con una lista; si no hay filas, muestra el texto de vacío. */
export function PanelLista({
  titulo,
  vacio,
  hayFilas,
  children,
}: {
  titulo: string;
  vacio: string;
  hayFilas: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-2xl border bg-card p-4">
      <h2 id={id} className="text-lg font-semibold">
        {titulo}
      </h2>
      {hayFilas ? (
        <ul className="mt-2 flex flex-col gap-1 text-sm">{children}</ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{vacio}</p>
      )}
    </section>
  );
}
