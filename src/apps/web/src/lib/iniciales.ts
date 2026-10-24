/** Iniciales de las dos primeras palabras de un nombre, para los avatares. */
export const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join("");
