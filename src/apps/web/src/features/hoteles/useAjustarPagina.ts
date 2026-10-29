import { useEffect } from "react";

/**
 * Si el total cambia (por ejemplo, tras ocultar o restaurar una reseña) y la página elegida queda
 * fuera de rango, vuelve a la última válida; si sigue en rango, la conserva. Solo corrige con datos
 * confirmados por el servidor: no con los de la caché mientras se refrescan ni con un placeholder.
 */
export function useAjustarPagina(
  pagina: number,
  setPagina: (pagina: number) => void,
  consulta: {
    data?: { total: number; por_pagina: number } | undefined;
    isFetching: boolean;
    isPlaceholderData: boolean;
  },
) {
  const { data, isFetching, isPlaceholderData } = consulta;
  const confirmada = data && !isFetching && !isPlaceholderData ? data : undefined;
  const ultima = confirmada
    ? Math.max(1, Math.ceil(confirmada.total / confirmada.por_pagina))
    : undefined;
  useEffect(() => {
    if (ultima !== undefined && pagina > ultima) setPagina(ultima);
  }, [pagina, ultima, setPagina]);
}
