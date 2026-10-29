import { useEffect } from "react";

/**
 * Si el total cambia (por ejemplo, tras ocultar o restaurar una reseña) y la página elegida queda
 * fuera de rango, vuelve a la última válida; si sigue en rango, la conserva.
 */
export function useAjustarPagina(
  pagina: number,
  setPagina: (pagina: number) => void,
  lista: { total: number; por_pagina: number } | undefined,
) {
  const ultima = lista ? Math.max(1, Math.ceil(lista.total / lista.por_pagina)) : undefined;
  useEffect(() => {
    if (ultima !== undefined && pagina > ultima) setPagina(ultima);
  }, [pagina, ultima, setPagina]);
}
