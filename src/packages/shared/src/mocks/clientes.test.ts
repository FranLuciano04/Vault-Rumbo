import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clientesMock, manejadoresClientes } from "./clientes";
import { crearServidor } from "./index";

type Esquema = { required?: string[]; enum?: string[] };
const contrato = JSON.parse(
  readFileSync(new URL("../../openapi.json", import.meta.url), "utf8"),
) as { components: { schemas: Record<string, Esquema> } };

const servidor = crearServidor(...manejadoresClientes);
beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const BASE = "http://localhost/api/clientes";
const json = { "content-type": "application/json" };

describe("RF-031 clientes ficticios", () => {
  it("RF-031 hay al menos tres clientes mock", () => {
    expect(clientesMock.length).toBeGreaterThanOrEqual(3);
  });

  it("RF-031 cada cliente mock trae los campos requeridos del esquema Cliente", () => {
    const requeridos = contrato.components.schemas["Cliente"]?.required ?? [];

    expect(requeridos.length).toBeGreaterThan(0);
    for (const c of clientesMock) {
      for (const campo of requeridos) expect(c).toHaveProperty(campo);
    }
  });

  it("RF-031 el segmento de cada mock pertenece al enum del esquema", () => {
    const enumSegmento = contrato.components.schemas["SegmentoCliente"]?.enum ?? [];

    expect(enumSegmento.length).toBeGreaterThan(0);
    for (const c of clientesMock) expect(enumSegmento).toContain(c["segmento"]);
  });
});

describe("RF-031 handlers MSW de /api/clientes", () => {
  it("RF-031 GET /api/clientes responde la página con items, total, pagina y por_pagina", async () => {
    const res = await fetch(BASE);

    expect(res.status).toBe(200);
    const cuerpo = (await res.json()) as Record<string, unknown>;
    expect(cuerpo["items"]).toEqual(clientesMock);
    expect(cuerpo).toMatchObject({ total: clientesMock.length, pagina: 1, por_pagina: 20 });
  });

  it("RF-031 GET /api/clientes filtra por texto", async () => {
    const nombre = String(clientesMock[0]?.["nombre"]);

    const res = await fetch(`${BASE}?buscar=${encodeURIComponent(nombre)}`);

    const items = ((await res.json()) as { items: { nombre: string }[] }).items;
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((c) => c.nombre.includes(nombre))).toBe(true);
  });

  it("RF-031 GET /api/clientes pagina con por_pagina", async () => {
    const res = await fetch(`${BASE}?pagina=1&por_pagina=1`);

    const cuerpo = (await res.json()) as { items: unknown[]; total: number };
    expect(cuerpo.items).toHaveLength(1);
    expect(cuerpo.total).toBe(clientesMock.length);
  });

  it("RF-031 GET /api/clientes/{id} responde la ficha", async () => {
    const res = await fetch(`${BASE}/${String(clientesMock[0]?.["id"])}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(clientesMock[0]);
  });

  it("RF-031 GET /api/clientes/{id} de un cliente inexistente responde 404 problem+json", async () => {
    const res = await fetch(`${BASE}/00000000-0000-4000-8000-000000000000`);

    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
  });

  it("RF-031 POST /api/clientes crea y responde 201 con el cliente", async () => {
    const res = await fetch(BASE, {
      method: "POST",
      headers: json,
      body: JSON.stringify({
        nombre: "Nuevo Cliente",
        contacto: "nuevo@mail.test",
        segmento: "individual",
      }),
    });

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      nombre: "Nuevo Cliente",
      contacto: "nuevo@mail.test",
    });
  });

  it("RF-031 POST con un contacto ya registrado responde 409 con los duplicados (CU-02 A1)", async () => {
    const res = await fetch(BASE, {
      method: "POST",
      headers: json,
      body: JSON.stringify({
        nombre: "Otra Persona",
        contacto: String(clientesMock[0]?.["contacto"]),
        segmento: "individual",
      }),
    });

    expect(res.status).toBe(409);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    const cuerpo = (await res.json()) as { status: number; duplicados: unknown[] };
    expect(cuerpo.status).toBe(409);
    expect(cuerpo.duplicados).toEqual([clientesMock[0]]);
  });

  it("RF-031 POST duplicado con confirmar_duplicado=true responde 201", async () => {
    const res = await fetch(BASE, {
      method: "POST",
      headers: json,
      body: JSON.stringify({
        nombre: "Otra Persona",
        contacto: String(clientesMock[0]?.["contacto"]),
        segmento: "individual",
        confirmar_duplicado: true,
      }),
    });

    expect(res.status).toBe(201);
  });

  it("RF-031 PATCH /api/clientes/{id} responde la ficha con los campos editados", async () => {
    const res = await fetch(`${BASE}/${String(clientesMock[0]?.["id"])}`, {
      method: "PATCH",
      headers: json,
      body: JSON.stringify({ preferencias: "Prefiere hoteles todo incluido" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      id: clientesMock[0]?.["id"],
      preferencias: "Prefiere hoteles todo incluido",
    });
  });

  it("RF-031 GET /api/clientes/{id}/historial responde oportunidades, viajes y reseñas", async () => {
    const res = await fetch(`${BASE}/${String(clientesMock[0]?.["id"])}/historial`);

    expect(res.status).toBe(200);
    const cuerpo = (await res.json()) as Record<string, unknown>;
    expect(Array.isArray(cuerpo["oportunidades"])).toBe(true);
    expect(Array.isArray(cuerpo["viajes"])).toBe(true);
    expect(Array.isArray(cuerpo["resenas"])).toBe(true);
  });
});

describe("RF-031 filtros y auditoría de los mocks", () => {
  it("RF-031 GET /api/clientes filtra por segmento", async () => {
    const res = await fetch(`${BASE}?segmento=pareja`);

    const items = ((await res.json()) as { items: { segmento: string }[] }).items;
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((c) => c.segmento === "pareja")).toBe(true);
  });

  it("RF-031 GET /api/clientes con mios devuelve solo los del usuario de la sesión", async () => {
    const res = await fetch(`${BASE}?mios=true`);

    const items = ((await res.json()) as { items: { asesor_asignado_id: string | null }[] }).items;
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(clientesMock.length);
    expect(new Set(items.map((c) => c.asesor_asignado_id)).size).toBe(1);
  });

  it("RF-031 cada cliente mock trae la auditoría de solo lectura", () => {
    for (const c of clientesMock) {
      for (const campo of ["created_by", "updated_by", "created_at", "updated_at"]) {
        expect(c).toHaveProperty(campo);
      }
    }
  });

  it("RF-031 el 404 explica que el cliente no existe o no se puede ver", async () => {
    const res = await fetch(`${BASE}/00000000-0000-4000-8000-000000000000`);

    expect(((await res.json()) as { detail: string }).detail).toBe(
      "El cliente no existe o no lo podés ver.",
    );
  });
});
