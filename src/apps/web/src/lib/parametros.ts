import { z } from "zod";

/** El id que llega en la URL, o `""` si no tiene formato UUID (se ignora, como un estado desconocido). */
export function idDeUrl(valor: string | null) {
  const id = z.guid().safeParse(valor);
  return id.success ? id.data : "";
}
