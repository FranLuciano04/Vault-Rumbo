import { HttpResponse } from "msw";

/** Texto comparable: minúsculas, sin tildes y con los espacios colapsados (como el backend). */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

/** Respuesta paginada con `pagina` y `por_pagina` de la URL (por defecto 1 y 20). */
export function pagina(todos: unknown[], url: URL) {
  const numero = Number(url.searchParams.get("pagina") ?? 1);
  const porPagina = Number(url.searchParams.get("por_pagina") ?? 20);
  const salto = (numero - 1) * porPagina;
  return HttpResponse.json({
    items: todos.slice(salto, salto + porPagina),
    total: todos.length,
    pagina: numero,
    por_pagina: porPagina,
  });
}
