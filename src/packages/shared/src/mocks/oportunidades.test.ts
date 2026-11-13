import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { crearServidor } from "./index";
import {
  cotizacionesMock,
  idCotizacionMock,
  idOportunidadMock,
  manejadoresOportunidades,
} from "./oportunidades";

const servidor = crearServidor(...manejadoresOportunidades);
beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const ganar = (cotizacion_id: string) =>
  fetch(`http://localhost/api/oportunidades/${idOportunidadMock.cotizada}/ganar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cotizacion_id }),
  });

describe("RF-016 POST /oportunidades/{id}/ganar del mock (M11 H-03)", () => {
  it("RF-016 un borrador con la validez vencida responde 409, igual que el backend", async () => {
    const base = cotizacionesMock.find((c) => c.id === idCotizacionMock.europa_v2);
    if (!base) throw new Error("Falta la cotización mock europa_v2");
    const borradorVencido = {
      ...base,
      id: "2f8c1d4e-9a30-4b57-8e62-5d7a0c3b1f99",
      estado: "borrador" as const,
      validez_hasta: "2020-01-01",
    };
    cotizacionesMock.push(borradorVencido);
    try {
      const respuesta = await ganar(borradorVencido.id);

      expect(respuesta.status).toBe(409);
      const cuerpo = (await respuesta.json()) as { detail: string };
      expect(cuerpo.detail).toBe("No se puede aceptar una cotización con la vigencia vencida.");
    } finally {
      cotizacionesMock.pop();
    }
  });
});
