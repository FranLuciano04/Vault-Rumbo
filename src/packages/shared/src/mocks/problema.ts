import { HttpResponse } from "msw";

/** Respuesta de error de los mocks: un problem+json como el de la API. */
export function respuestaProblema(status: number, title: string, extra: object = {}) {
  return HttpResponse.json(
    { title, status, ...extra },
    {
      status,
      headers: { "content-type": "application/problem+json" },
    },
  );
}
