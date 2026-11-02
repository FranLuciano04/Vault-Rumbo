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
    const cuerpo = (await respuesta.json()) as { status: number; title: string; detail: string };
    expect(cuerpo.status).toBe(409);
    expect(cuerpo.detail).toBe("Solo se elimina una reseña oculta: ocultala primero.");
    expect(cuerpo).toMatchObject({ title: "Conflicto" });
    expect(respuesta.headers.get("content-type")).toContain("application/problem+json");
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

describe("RF-043 GET /hoteles?nombre= del mock (H-05)", () => {
  const buscar = async (params: string) => {
    conRol("empleado");
    const respuesta = await fetch(`http://localhost/api/hoteles?${params}`);
    return (await respuesta.json()) as { items: { nombre: string }[]; total: number };
  };

  it("RF-043 filtra por nombre conteniendo el texto, sin distinguir mayúsculas", async () => {
    const cuerpo = await buscar("nombre=LLAO");
    expect(cuerpo.items.map((h) => h.nombre)).toEqual(["Hotel Llao Llao"]);
    expect(cuerpo.total).toBe(1);
  });

  it("RF-043 coincide por una parte del nombre y se combina con destino_id", async () => {
    const todos = await buscar("nombre=hotel");
    expect(todos.items.length).toBeGreaterThan(0);
    expect(todos.items.every((h) => h.nombre.toLowerCase().includes("hotel"))).toBe(true);
    const sinCoincidencia = await buscar(
      "nombre=llao&destino_id=9c2d4e61-1a7f-4b38-8d05-6e3f1a2b4c22",
    );
    expect(sinCoincidencia.total).toBe(0);
  });

  it("RF-043 sin nombre o con nombre vacío devuelve el catálogo activo completo", async () => {
    const sin = await buscar("por_pagina=100");
    const vacio = await buscar("por_pagina=100&nombre=");
    expect(vacio.total).toBe(sin.total);
    expect(sin.total).toBeGreaterThan(1);
  });
});
