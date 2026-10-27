import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { ClienteListado } from "../cliente";
import { aFicha, clientesMock, manejadoresClientes } from "./clientes";
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
    expect(await res.json()).toEqual(aFicha(clientesMock[0] as ClienteListado));
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
    expect(cuerpo.duplicados).toEqual([aFicha(clientesMock[0] as ClienteListado)]);
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

// --- Fix de la review de M2 (H-07): el mock aplica las mismas reglas que la API ---------------

type Problema = {
  status: number;
  duplicados?: unknown[];
  errores?: { campo: string; mensaje: string }[];
};

const alta = (cuerpo: Record<string, unknown>) =>
  fetch(BASE, {
    method: "POST",
    headers: json,
    body: JSON.stringify({ segmento: "individual", ...cuerpo }),
  });

const editar = (cuerpo: Record<string, unknown>) =>
  fetch(`${BASE}/${String(clientesMock[0]?.["id"])}`, {
    method: "PATCH",
    headers: json,
    body: JSON.stringify(cuerpo),
  });

async function esProblema422(res: Response, campo: string) {
  expect(res.status).toBe(422);
  expect(res.headers.get("content-type")).toContain("application/problem+json");
  const cuerpo = (await res.json()) as Problema;
  expect(cuerpo.status).toBe(422);
  expect(cuerpo.errores?.map((e) => e.campo)).toContain(campo);
}

describe("RF-003 duplicados del POST /api/clientes en el mock (CU-02 A1)", () => {
  it.each([
    ["con otras mayúsculas", "CAMILA BENÍTEZ"],
    ["sin tildes", "camila benitez"],
    ["con espacios de más", "  Camila    Benítez  "],
  ])("RF-003 el mismo nombre %s es duplicado aunque el contacto sea otro", async (_caso, nombre) => {
    const res = await alta({ nombre, contacto: "otro@mail.test" });

    expect(res.status).toBe(409);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    const cuerpo = (await res.json()) as Problema;
    expect(cuerpo.status).toBe(409);
    expect(cuerpo.duplicados).toEqual([aFicha(clientesMock[0] as ClienteListado)]);
  });

  it.each(["+54 9 11 5555-1234", "5491155551234", "011 15-5555-1234", "11 5555 1234"])(
    "RF-003 el teléfono %s es el mismo que +54 9 11 5555-1234 (clave canónica)",
    async (contacto) => {
      const res = await alta({ nombre: "Otra Persona", contacto });

      expect(res.status).toBe(409);
      const cuerpo = (await res.json()) as Problema;
      expect(cuerpo.duplicados).toEqual([aFicha(clientesMock[0] as ClienteListado)]);
    },
  );

  it("RF-003 un teléfono distinto no es duplicado", async () => {
    const res = await alta({ nombre: "Otra Persona", contacto: "11 5555 1235" });

    expect(res.status).toBe(201);
  });

  it("RF-003 el email sin distinguir mayúsculas es duplicado", async () => {
    const res = await alta({ nombre: "Otra Persona", contacto: "SOSA.Familia@Mail.TEST" });

    expect(res.status).toBe(409);
    const cuerpo = (await res.json()) as Problema;
    expect(cuerpo.duplicados).toEqual([aFicha(clientesMock[1] as ClienteListado)]);
  });

  it("RF-003 con confirmar_duplicado=true el duplicado por nombre se crea (DEC-0020)", async () => {
    const res = await alta({
      nombre: "camila benitez",
      contacto: "otro@mail.test",
      confirmar_duplicado: true,
    });

    expect(res.status).toBe(201);
  });
});

describe("RF-002 validación de entrada del mock de clientes (CU-02 A3, CU-03 A2)", () => {
  it.each([
    ["falta el nombre", { contacto: "nuevo@mail.test" }, "nombre"],
    ["el nombre está vacío", { nombre: "   ", contacto: "nuevo@mail.test" }, "nombre"],
    ["falta el contacto", { nombre: "Nuevo Cliente" }, "contacto"],
    ["el contacto no es teléfono ni email", { nombre: "Nuevo", contacto: "sin contacto" }, "contacto"],
    ["el contacto es muy corto", { nombre: "Nuevo", contacto: "123" }, "contacto"],
    ["el email está incompleto", { nombre: "Nuevo", contacto: "ana@" }, "contacto"],
  ])("RF-002 POST responde 422 problem+json si %s", async (_caso, cuerpo, campo) => {
    await esProblema422(await alta(cuerpo), campo);
  });

  it("RF-002 PATCH con nombre null responde 422 problem+json", async () => {
    await esProblema422(await editar({ nombre: null }), "nombre");
  });

  it.each(["sin contacto", "123", "@ana", "ana@"])(
    "RF-002 PATCH con el contacto inválido «%s» responde 422 problem+json",
    async (contacto) => {
      await esProblema422(await editar({ contacto }), "contacto");
    },
  );

  it("RF-002 PATCH con un segmento inválido responde 422 problem+json", async () => {
    await esProblema422(await editar({ segmento: "otro" }), "segmento");
  });

  it("RF-002 PATCH con un teléfono válido sigue respondiendo 200", async () => {
    const res = await editar({ contacto: "+54 9 11 4444-5555" });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ contacto: "+54 9 11 4444-5555" });
  });

  it("RF-005 GET /api/clientes con por_pagina=0 responde 422 problem+json", async () => {
    const res = await fetch(`${BASE}?por_pagina=0`);

    expect(res.status).toBe(422);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect(((await res.json()) as Problema).status).toBe(422);
  });
});

describe("CU-30 y cuerpo del 422 en el mock de clientes", () => {
  it("CU-30 PATCH con no_recontactar lo aplica", async () => {
    const res = await editar({ no_recontactar: true });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ no_recontactar: true });
  });

  it("RF-002 el 422 trae title y detail como el backend", async () => {
    const res = await alta({ nombre: "Nuevo", contacto: "123" });

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({
      title: "Datos inválidos",
      detail: "Los datos enviados no son válidos.",
    });
  });
});

// --- Fix de la review de M2 (H-04): el PATCH del mock avisa de duplicados como el backend -----

const editarCliente = (indice: number, cuerpo: Record<string, unknown>) =>
  fetch(`${BASE}/${String(clientesMock[indice]?.["id"])}`, {
    method: "PATCH",
    headers: json,
    body: JSON.stringify(cuerpo),
  });

describe("RF-003 duplicados del PATCH /api/clientes/{id} en el mock (CU-03, H-04)", () => {
  it("RF-003 cambiar el contacto al de otro cliente responde 409 con su ficha", async () => {
    const res = await editarCliente(1, { contacto: String(clientesMock[0]?.["contacto"]) });

    expect(res.status).toBe(409);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    const cuerpo = (await res.json()) as Problema;
    expect(cuerpo.status).toBe(409);
    expect(cuerpo.duplicados).toEqual([aFicha(clientesMock[0] as ClienteListado)]);
  });

  it.each(["5491155551234", "011 15-5555-1234", "11 5555 1234"])(
    "RF-003 el teléfono %s es el de otro cliente (clave canónica)",
    async (contacto) => {
      const res = await editarCliente(1, { contacto });

      expect(res.status).toBe(409);
      expect(((await res.json()) as Problema).duplicados).toEqual([
        aFicha(clientesMock[0] as ClienteListado),
      ]);
    },
  );

  it("RF-003 el email de otro cliente con otras mayúsculas es duplicado", async () => {
    const res = await editarCliente(0, { contacto: "SOSA.Familia@Mail.TEST" });

    expect(res.status).toBe(409);
    expect(((await res.json()) as Problema).duplicados).toEqual([
      aFicha(clientesMock[1] as ClienteListado),
    ]);
  });

  it.each(["CAMILA BENÍTEZ", "camila benitez", "  Camila    Benítez  "])(
    "RF-003 cambiar el nombre a «%s» (el de otro cliente) responde 409",
    async (nombre) => {
      const res = await editarCliente(1, { nombre });

      expect(res.status).toBe(409);
      expect(((await res.json()) as Problema).duplicados).toEqual([
        aFicha(clientesMock[0] as ClienteListado),
      ]);
    },
  );

  it("RF-003 el propio cliente no cuenta: reenviar su contacto en otro formato o su nombre sin tildes da 200", async () => {
    const contacto = await editarCliente(0, { contacto: "5491155551234" });
    const nombre = await editarCliente(0, { nombre: "CAMILA BENITEZ" });
    const email = await editarCliente(1, { contacto: "SOSA.FAMILIA@mail.test" });

    expect(contacto.status).toBe(200);
    expect(nombre.status).toBe(200);
    expect(email.status).toBe(200);
  });

  it("RF-003 solo se controla lo que cambia: editar otros campos no avisa", async () => {
    const res = await editarCliente(0, { segmento: "familia", preferencias: "Sin escalas" });

    expect(res.status).toBe(200);
  });

  it("RF-003 con confirmar_duplicado=true el PATCH responde 200 y la ficha no lo incluye", async () => {
    const res = await editarCliente(1, {
      contacto: String(clientesMock[0]?.["contacto"]),
      confirmar_duplicado: true,
    });

    expect(res.status).toBe(200);
    const cuerpo = (await res.json()) as Record<string, unknown>;
    expect(cuerpo).toMatchObject({ id: clientesMock[1]?.["id"], contacto: "+54 9 11 5555-1234" });
    expect(cuerpo).not.toHaveProperty("confirmar_duplicado");
  });

  it("RF-003 confirmar_duplicado sin duplicados tampoco aparece en la ficha", async () => {
    const res = await editarCliente(0, { preferencias: "Sin escalas", confirmar_duplicado: true });

    expect(res.status).toBe(200);
    expect((await res.json()) as Record<string, unknown>).not.toHaveProperty(
      "confirmar_duplicado",
    );
  });
});
