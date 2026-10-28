import { Button } from "@/components/ui/button";

/** Anterior/Siguiente de una lista de reseñas; no se muestra si todo entra en una sola página. */
export function PaginadorResenas({
  pagina,
  total,
  porPagina,
  alCambiar,
}: {
  pagina: number;
  total: number;
  porPagina: number;
  alCambiar: (pagina: number) => void;
}) {
  const ultima = Math.max(1, Math.ceil(total / porPagina));
  if (ultima === 1) return null;
  return (
    <nav aria-label="Paginación de reseñas" className="flex items-center justify-end gap-2">
      <span className="text-sm text-muted-foreground">
        Página {pagina} de {ultima}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pagina <= 1}
        onClick={() => {
          alCambiar(pagina - 1);
        }}
      >
        Anterior
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pagina >= ultima}
        onClick={() => {
          alCambiar(pagina + 1);
        }}
      >
        Siguiente
      </Button>
    </nav>
  );
}
