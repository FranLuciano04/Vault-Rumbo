import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { manejadoresHotelesPara, resenasMock } from "./hoteles";
import { crearServidor, type RolMock } from "./index";

const servidor = crearServidor();
beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const BASE = "http://localhost/api/resenas";

function conRol(rol: RolMock) {
  servidor.use(...manejadoresHotelesPara(rol));
}

const eliminar = (id: string) => fetch(`${BASE}/${id}`, { method: "DELETE" });

function deEstado(estado: "publicada" | "oculta"): string {
  const r = resenasMock.find((x) => x.estado === estado);
  if (!r) throw new Error(`Falta una reseña mock ${estado}`);
  return r.id;
}

describe("RF-112 DELETE /resenas/{id} del mock (CU-29 A2)", () => {
  it("RF-112 una reseña publicada responde 409 y pide ocultarla primero", async () => {
    conRol("admin");
    const respuesta = await eliminar(deEstado("publicada"));
    expect(respuesta.status).toBe(409);
    const cuerpo = (await respuesta.json()) as { status: number; detail: string };
    expect(cuerpo.status).toBe(409);
    expect(cuerpo.detail).toBe("Solo se elimina una reseña oculta: ocultala primero.");
  });

  it("RF-112 una reseña oculta responde 204", async () => {
    conRol("admin");
    expect((await eliminar(deEstado("oculta"))).status).toBe(204);
  });

  it("RF-112 una reseña inexistente responde 404", async () => {
    conRol("admin");
    expect((await eliminar("00000000-0000-4000-8000-000000000000")).status).toBe(404);
  });

  it("RF-112 como empleado responde 403", async () => {
    conRol("empleado");
    expect((await eliminar(deEstado("oculta"))).status).toBe(403);
  });
});
