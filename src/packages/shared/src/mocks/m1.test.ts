import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { crearServidor } from "./index";
import { manejadoresM1 } from "./m1";

type Esquema = {
  $ref?: string;
  type?: string | string[];
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, Esquema>;
  items?: Esquema;
  anyOf?: Esquema[];
  nullable?: boolean;
};
type Operacion = {
  requestBody?: { content: Record<string, { schema: Esquema }> };
  responses: Record<string, { content?: Record<string, { schema?: Esquema }> }>;
};
type Contrato = {
  paths: Record<string, Record<string, Operacion>>;
  components: { schemas: Record<string, Esquema> };
};

const contrato = JSON.parse(
  readFileSync(new URL("../../openapi.json", import.meta.url), "utf8"),
) as Contrato;

// Rutas del PC1 (módulos seguridad/usuarios y configuracion), sin /api; sin restablecer-password.
const RUTAS: [string, string, string][] = [
  ["RF-144", "GET", "/usuarios"],
  ["RF-144", "POST", "/usuarios"],
  ["RF-007", "GET", "/usuarios/asesores"],
  ["RF-144", "GET", "/usuarios/{usuario_id}"],
  ["RF-147", "PATCH", "/usuarios/{usuario_id}"],
  ["RF-148", "POST", "/usuarios/{usuario_id}/baja"],
  ["RF-022", "GET", "/configuracion"],
  ["RF-022", "PUT", "/configuracion"],
  ["RF-083", "PUT", "/usuarios/{usuario_id}/comision-por-defecto"],
  ["RF-089", "GET", "/destinos"],
  ["RF-089", "POST", "/destinos"],
  ["RF-089", "GET", "/destinos/{destino_id}"],
  ["RF-089", "PATCH", "/destinos/{destino_id}"],
  ["RF-091", "POST", "/destinos/{destino_id}/baja"],
  ["RF-092", "POST", "/destinos/{destino_id}/reactivar"],
  ["RF-086", "GET", "/destinos/{destino_id}/requisitos"],
  ["RF-086", "POST", "/destinos/{destino_id}/requisitos"],
  ["RF-087", "PATCH", "/requisitos-destino/{requisito_id}"],
  ["RF-088", "POST", "/requisitos-destino/{requisito_id}/baja"],
  ["RF-093", "GET", "/operadores"],
  ["RF-093", "POST", "/operadores"],
  ["RF-093", "GET", "/operadores/{operador_id}"],
  ["RF-093", "PATCH", "/operadores/{operador_id}"],
  ["RF-095", "POST", "/operadores/{operador_id}/baja"],
  ["RF-096", "POST", "/operadores/{operador_id}/reactivar"],
];

const ID = "7c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f";

function operacion(metodo: string, ruta: string): Operacion | undefined {
  const paths = contrato.paths;
  return (paths[`/api${ruta}`] ?? paths[ruta])?.[metodo.toLowerCase()];
}

function codigoExito(op: Operacion): string {
  return Object.keys(op.responses)
    .filter((c) => c.startsWith("2"))
    .sort()[0] as string;
}

function resolver(esquema: Esquema): Esquema {
  let actual = esquema;
  while (actual.$ref) {
    actual = contrato.components.schemas[actual.$ref.split("/").pop() as string] as Esquema;
  }
  return actual;
}

/** Validador mínimo de JSON Schema: tipos, enum, required, properties e items. */
function errores(valor: unknown, esquema: Esquema, ruta = "$"): string[] {
  const e = resolver(esquema);
  if (valor === null)
    return e.nullable || e.anyOf?.some((s) => s.type === "null") ? [] : [`${ruta}: null`];
  if (e.anyOf) {
    const opciones = e.anyOf.map((s) => errores(valor, s, ruta));
    return opciones.some((o) => o.length === 0) ? [] : (opciones[0] as string[]);
  }
  if (e.enum && !e.enum.includes(valor)) return [`${ruta}: fuera del enum`];
  const tipo = Array.isArray(e.type) ? e.type[0] : e.type;
  if (tipo === "object" || e.properties) {
    if (typeof valor !== "object" || Array.isArray(valor)) return [`${ruta}: no es objeto`];
    const obj = valor as Record<string, unknown>;
    const out: string[] = [];
    for (const campo of e.required ?? []) {
      if (!(campo in obj)) out.push(`${ruta}.${campo}: falta`);
    }
    for (const [campo, sub] of Object.entries(e.properties ?? {})) {
      if (campo in obj) out.push(...errores(obj[campo], sub, `${ruta}.${campo}`));
    }
    return out;
  }
  if (tipo === "array") {
    if (!Array.isArray(valor)) return [`${ruta}: no es array`];
    return valor.flatMap((v, i) => (e.items ? errores(v, e.items, `${ruta}[${i}]`) : []));
  }
  if (tipo === "string" && typeof valor !== "string") return [`${ruta}: no es string`];
  if (tipo === "integer" && !Number.isInteger(valor)) return [`${ruta}: no es integer`];
  if (tipo === "number" && typeof valor !== "number") return [`${ruta}: no es number`];
  if (tipo === "boolean" && typeof valor !== "boolean") return [`${ruta}: no es boolean`];
  return [];
}

/** Valor mínimo válido para el esquema de entrada (solo los campos requeridos). */
function ejemplo(esquema: Esquema): unknown {
  const e = resolver(esquema);
  if (e.enum) return e.enum[0];
  if (e.anyOf) return ejemplo(e.anyOf.find((s) => s.type !== "null") ?? (e.anyOf[0] as Esquema));
  const tipo = Array.isArray(e.type) ? e.type[0] : e.type;
  if (tipo === "object" || e.properties) {
    const props = e.properties ?? {};
    return Object.fromEntries(
      (e.required ?? []).map((campo) => [campo, ejemplo(props[campo] as Esquema)]),
    );
  }
  if (tipo === "array") return [];
  if (tipo === "integer" || tipo === "number") return 1;
  if (tipo === "boolean") return true;
  return "texto";
}

const servidor = crearServidor(...manejadoresM1);
beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

describe("RF-151 mocks MSW de usuarios y configuración respetan el contrato", () => {
  it("RF-151 el openapi de shared publica todas las rutas del módulo y ninguna de restablecer-password", () => {
    for (const [, metodo, ruta] of RUTAS) {
      expect(operacion(metodo, ruta), `${metodo} ${ruta} falta en openapi.json`).toBeDefined();
    }
    const rutas = Object.keys(contrato.paths);
    expect(rutas.filter((r) => r.includes("restablecer") || r.includes("password"))).toEqual([]);
  });

  it("RF-151 hay un handler MSW por cada ruta del módulo", () => {
    expect(manejadoresM1).toHaveLength(RUTAS.length);
  });

  it.each(RUTAS)(
    "%s el mock de %s %s responde el código de éxito con el esquema del contrato",
    async (_rf, metodo, ruta) => {
      const op = operacion(metodo, ruta);
      expect(op, `${metodo} ${ruta} falta en openapi.json`).toBeDefined();
      const exito = codigoExito(op as Operacion);
      const url = "http://localhost/api" + ruta.replace(/\{[^}]+\}/g, ID);
      const entrada = (op as Operacion).requestBody?.content["application/json"]?.schema;

      const res = await fetch(url, {
        method: metodo,
        headers: { "content-type": "application/json" },
        body: entrada ? JSON.stringify(ejemplo(entrada)) : undefined,
      });

      expect(res.status).toBe(Number(exito));
      const esquema = (op as Operacion).responses[exito]?.content?.["application/json"]?.schema;
      if (esquema) {
        const cuerpo: unknown = await res.json();
        expect(errores(cuerpo, esquema)).toEqual([]);
      }
    },
  );

  it("RF-151 los listados mock traen datos ficticios (al menos un ítem) y paginación", async () => {
    for (const ruta of ["/usuarios", "/destinos", "/operadores"]) {
      const res = await fetch(`http://localhost/api${ruta}`);
      const cuerpo = (await res.json()) as { items: unknown[]; total: number };

      expect(cuerpo.items.length, ruta).toBeGreaterThan(0);
      expect(cuerpo.total, ruta).toBeGreaterThanOrEqual(cuerpo.items.length);
    }
  });
});
