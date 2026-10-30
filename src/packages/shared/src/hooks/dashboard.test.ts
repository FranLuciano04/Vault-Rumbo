// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { crearCliente } from "../cliente";
import { crearServidor } from "../mocks";
import { manejadoresDashboardPara } from "../mocks/dashboard";
import { descargarReporte } from "./dashboard";

const servidor = crearServidor(...manejadoresDashboardPara("dueno"));
beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const cliente = crearCliente({ baseURL: "http://localhost", obtenerToken: () => "token" });

describe("CU-22 descargarReporte", () => {
  it("CU-22 devuelve los bytes del archivo en Excel", async () => {
    const bytes = await descargarReporte(cliente, "ventas", "xlsx");

    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  it("CU-22 un reporte inexistente llega con el detail del problem+json", async () => {
    await expect(descargarReporte(cliente, "no-existe", "pdf")).rejects.toMatchObject({
      status: 404,
      detail: "El reporte no existe.",
    });
  });
});
