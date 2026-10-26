import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { crearServidor } from "./index";
import {
  destinosMock,
  manejadoresM1,
  operadoresMock,
  requisitoOtroDestinoMock,
  requisitosMock,
  usuarioDeBajaMock,
  usuariosMock,
} from "./m1";

type Esquema = {
  $ref?: string;
  type?: string | string[];
  enum?: unknown[];
  format?: string;
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
  if (e.format === "email") return "nuevo@rumbo.test";
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
      const idDestino = requisitosMock[0].destino_id;
      const url =
        "http://localhost/api" +
        (ruta === "/destinos/{destino_id}/requisitos"
          ? ruta.replace("{destino_id}", idDestino)
          : ruta
        ).replace(/\{[^}]+\}/g, ID);
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

describe("RF-086 el mock de requisitos filtra por destino_id (H-02)", () => {
  type Pagina = { items: { destino_id: string }[]; total: number };

  it("RF-086 devuelve solo los requisitos del destino pedido", async () => {
    const destino = requisitosMock[0].destino_id;
    const res = await fetch(`http://localhost/api/destinos/${destino}/requisitos`);
    const cuerpo = (await res.json()) as Pagina;

    expect(cuerpo.items.length).toBeGreaterThan(0);
    expect(cuerpo.items.every((r) => r.destino_id === destino)).toBe(true);
    expect(cuerpo.items.map((r) => r.destino_id)).not.toContain(
      requisitoOtroDestinoMock.destino_id,
    );
    expect(cuerpo.total).toBe(cuerpo.items.length);
  });

  it("RF-086 devuelve una lista vacía para un destino sin requisitos", async () => {
    const sinRequisitos = destinosMock.find(
      (d) => ![...requisitosMock, requisitoOtroDestinoMock].some((r) => r.destino_id === d.id),
    );
    expect(sinRequisitos).toBeDefined();
    const res = await fetch(`http://localhost/api/destinos/${sinRequisitos?.id}/requisitos`);
    const cuerpo = (await res.json()) as Pagina;

    expect(cuerpo.items).toEqual([]);
    expect(cuerpo.total).toBe(0);
  });
});

// --- H-02: los handlers por defecto responden como el backend en filtros y errores ------------

const API = "http://localhost/api";
const JSON_H = { "content-type": "application/json" };

type Listado = {
  items: { nombre: string; activo: boolean }[];
  total: number;
  pagina: number;
  por_pagina: number;
};

function enviar(metodo: string, ruta: string, cuerpo?: unknown) {
  return fetch(`${API}${ruta}`, {
    method: metodo,
    headers: JSON_H,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
}

/**
 * Un problem+json del status pedido. Un 422 trae `errores` como el backend (`detail` fijo y un
 * `{campo, mensaje}` por campo inválido); `campos`, si se pasa, son exactamente esos `campo`.
 */
async function esProblema(res: Response, status: number, campos?: string[]) {
  expect(res.status).toBe(status);
  expect(res.headers.get("content-type") ?? "").toMatch(/^application\/problem\+json/);
  const cuerpo = (await res.json()) as {
    status: number;
    detail?: string;
    errores?: { campo: string; mensaje: string }[];
  };
  expect(cuerpo.status).toBe(status);
  if (status === 422) {
    expect(cuerpo.detail).toBe("Los datos enviados no son válidos.");
    expect(cuerpo.errores?.length).toBeGreaterThan(0);
    for (const e of cuerpo.errores ?? []) {
      expect(e.campo).toEqual(expect.any(String));
      expect(e.mensaje).toEqual(expect.any(String));
    }
    if (campos) expect(cuerpo.errores?.map((e) => e.campo).sort()).toEqual([...campos].sort());
  }
  return cuerpo;
}

const activos = <T extends { activo: boolean }>(lista: readonly T[]) =>
  lista.filter((x) => x.activo);
const inactivos = <T extends { activo: boolean }>(lista: readonly T[]) =>
  lista.filter((x) => !x.activo);

describe.each([
  ["RF-089", "destinos", destinosMock as { nombre: string; activo: boolean }[]],
  ["RF-093", "operadores", operadoresMock as { nombre: string; activo: boolean }[]],
])("%s GET /api/%s respeta activo, buscar y paginación del backend (H-02)", (rf, ruta, mock) => {
  it(`${rf} sin parámetros trae solo los activos (activo=true por defecto)`, async () => {
    const cuerpo = (await (await enviar("GET", `/${ruta}`)).json()) as Listado;

    expect(cuerpo.items.map((i) => i.nombre).sort()).toEqual(
      activos(mock)
        .map((i) => i.nombre)
        .sort(),
    );
    expect(cuerpo.total).toBe(activos(mock).length);
  });

  it(`${rf} activo=false trae solo los de baja`, async () => {
    const cuerpo = (await (await enviar("GET", `/${ruta}?activo=false`)).json()) as Listado;

    expect(cuerpo.items.map((i) => i.nombre)).toEqual(inactivos(mock).map((i) => i.nombre));
    expect(cuerpo.total).toBe(inactivos(mock).length);
  });

  it(`${rf} buscar ignora mayúsculas y tildes`, async () => {
    const buscado = activos(mock)[0] as { nombre: string };
    const consulta = encodeURIComponent(
      buscado.nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase(),
    );
    const cuerpo = (await (await enviar("GET", `/${ruta}?buscar=${consulta}`)).json()) as Listado;

    expect(cuerpo.items.map((i) => i.nombre)).toContain(buscado.nombre);
    expect(cuerpo.items.length).toBeLessThan(activos(mock).length);
    expect(cuerpo.total).toBe(cuerpo.items.length);
  });

  it(`${rf} buscar sin coincidencias devuelve una lista vacía`, async () => {
    const cuerpo = (await (
      await enviar("GET", `/${ruta}?buscar=zzzinexistente`)
    ).json()) as Listado;

    expect(cuerpo.items).toEqual([]);
    expect(cuerpo.total).toBe(0);
  });

  it(`${rf} pagina con pagina y por_pagina, y total cuenta todos los activos`, async () => {
    const p1 = (await (await enviar("GET", `/${ruta}?pagina=1&por_pagina=1`)).json()) as Listado;
    const p2 = (await (await enviar("GET", `/${ruta}?pagina=2&por_pagina=1`)).json()) as Listado;

    expect(p1.items).toHaveLength(1);
    expect(p2.items).toHaveLength(1);
    expect(p2.items[0]?.nombre).not.toBe(p1.items[0]?.nombre);
    expect(p1.total).toBe(activos(mock).length);
    expect(p2).toMatchObject({ pagina: 2, por_pagina: 1 });
  });
});

describe("RF-089 destinos: buscar también mira el país (H-02)", () => {
  it("RF-089 buscar por país sin tildes encuentra el destino", async () => {
    const cuerpo = (await (await enviar("GET", "/destinos?buscar=mexico")).json()) as Listado;

    expect(cuerpo.items.map((i) => i.nombre)).toEqual(["Cancún"]);
  });
});

describe("RF-090 destinos: nombre repetido da 409 problem+json (H-02)", () => {
  it.each(["Cancún", "cancún", "CANCUN", "cancun", "  Cancún  ", "CANCÚN"])(
    "RF-090 el alta con el nombre %j ya existente da 409",
    async (nombre) => {
      await esProblema(await enviar("POST", "/destinos", { nombre, pais: "México" }), 409);
    },
  );

  it("RF-090 los espacios internos se colapsan al comparar", async () => {
    await esProblema(
      await enviar("POST", "/destinos", { nombre: "punta   CANA", pais: "RD" }),
      409,
    );
  });

  it("RF-090 también choca contra un destino inactivo", async () => {
    await esProblema(await enviar("POST", "/destinos", { nombre: "roma", pais: "Italia" }), 409);
  });

  it("RF-090 un nombre distinto se da de alta (201)", async () => {
    const res = await enviar("POST", "/destinos", { nombre: "Mendoza", pais: "Argentina" });

    expect(res.status).toBe(201);
    expect(((await res.json()) as { nombre: string }).nombre).toBe("Mendoza");
  });

  it("RF-090 renombrar a un nombre ajeno da 409", async () => {
    await esProblema(
      await enviar("PATCH", `/destinos/${destinosMock[0].id}`, { nombre: "  cancun " }),
      409,
    );
  });

  it("RF-090 renombrar al propio nombre con otra grafía no es duplicado (200)", async () => {
    const res = await enviar("PATCH", `/destinos/${destinosMock[0].id}`, { nombre: "BARILOCHE" });

    expect(res.status).toBe(200);
    expect(((await res.json()) as { nombre: string }).nombre).toBe("BARILOCHE");
  });
});

describe("RF-094 operadores: nombre repetido da 409 problem+json (H-02)", () => {
  it.each([
    "Despegar Mayorista",
    "despegar mayorista",
    "DESPEGAR MAYORISTA",
    "  Despegar Mayorista  ",
    "despegar   mayorista",
  ])("RF-094 el alta con el nombre %j ya existente da 409", async (nombre) => {
    await esProblema(await enviar("POST", "/operadores", { nombre }), 409);
  });

  it("RF-094 también choca contra un operador inactivo", async () => {
    await esProblema(await enviar("POST", "/operadores", { nombre: "andes travel" }), 409);
  });

  it("RF-094 un nombre distinto se da de alta (201)", async () => {
    const res = await enviar("POST", "/operadores", { nombre: "Operadora Nueva" });

    expect(res.status).toBe(201);
  });

  it("RF-094 renombrar a un nombre ajeno da 409", async () => {
    await esProblema(
      await enviar("PATCH", `/operadores/${operadoresMock[1].id}`, {
        nombre: "  despegar mayorista ",
      }),
      409,
    );
  });

  it("RF-094 renombrar al propio nombre con otra grafía no es duplicado (200)", async () => {
    const res = await enviar("PATCH", `/operadores/${operadoresMock[0].id}`, {
      nombre: "DESPEGAR MAYORISTA",
    });

    expect(res.status).toBe(200);
  });
});

describe("RF-022 PUT /api/configuracion valida los rangos del esquema (H-02)", () => {
  const valido = {
    vigencia_cotizacion_meses: 2,
    anticipacion_salida_dias: 5,
    recontacto_meses: 3,
  };

  it("RF-022 con valores válidos responde 200 y refleja los nuevos", async () => {
    const res = await enviar("PUT", "/configuracion", valido);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject(valido);
  });

  it("RF-022 anticipación en 0 es válida (ge=0)", async () => {
    const res = await enviar("PUT", "/configuracion", { ...valido, anticipacion_salida_dias: 0 });

    expect(res.status).toBe(200);
  });

  it.each([
    ["vigencia_cotizacion_meses", 0],
    ["recontacto_meses", 0],
    ["anticipacion_salida_dias", -1],
    ["vigencia_cotizacion_meses", -3],
  ])("RF-022 %s = %d da 422 problem+json", async (campo, valor) => {
    await esProblema(await enviar("PUT", "/configuracion", { ...valido, [campo]: valor }), 422);
  });

  it("RF-022 los tres valores fuera de rango a la vez dan 422", async () => {
    await esProblema(
      await enviar("PUT", "/configuracion", {
        vigencia_cotizacion_meses: 0,
        anticipacion_salida_dias: -1,
        recontacto_meses: 0,
      }),
      422,
    );
  });

  it.each(["vigencia_cotizacion_meses", "anticipacion_salida_dias", "recontacto_meses"])(
    "RF-022 si falta %s da 422 (el PUT reemplaza los tres)",
    async (campo) => {
      const cuerpo = Object.fromEntries(Object.entries(valido).filter(([c]) => c !== campo));

      await esProblema(await enviar("PUT", "/configuracion", cuerpo), 422);
    },
  );
});

describe("RF-144 usuarios: filtro activo y errores de negocio (H-02)", () => {
  const alta = { nombre: "Nueva Persona", email: "nueva@rumbo.test", rol: "empleado" };

  it("RF-144 sin activo el listado trae altas y bajas", async () => {
    const cuerpo = (await (await enviar("GET", "/usuarios")).json()) as Listado;

    expect(cuerpo.items).toHaveLength(usuariosMock.length + 1);
  });

  it("RF-144 activo=false trae solo los dados de baja", async () => {
    const cuerpo = (await (await enviar("GET", "/usuarios?activo=false")).json()) as Listado;

    expect(cuerpo.items).toEqual([usuarioDeBajaMock]);
    expect(cuerpo.total).toBe(1);
  });

  it("RF-144 el alta con un email nuevo responde 201", async () => {
    const res = await enviar("POST", "/usuarios", alta);

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ email: alta.email, rol: "empleado" });
  });

  it.each(["ana@rumbo.test", "ANA@Rumbo.Test", "  ana@rumbo.test  "])(
    "RF-146 el alta con el email %j ya usado da 409 (sin distinguir mayúsculas)",
    async (email) => {
      await esProblema(await enviar("POST", "/usuarios", { ...alta, email }), 409);
    },
  );

  it.each(["no-es-email", "sin@punto", "con espacio@x.test"])(
    "RF-144 el alta con el email inválido %j da 422",
    async (email) => {
      await esProblema(await enviar("POST", "/usuarios", { ...alta, email }), 422);
    },
  );

  it("RF-144 el alta con un rol inexistente da 422", async () => {
    await esProblema(await enviar("POST", "/usuarios", { ...alta, rol: "superadmin" }), 422);
  });

  it("RF-144 el alta sin nombre da 422", async () => {
    await esProblema(await enviar("POST", "/usuarios", { ...alta, nombre: "" }), 422);
  });

  it("RF-149 dar de baja al único admin activo da 409", async () => {
    await esProblema(await enviar("POST", `/usuarios/${usuariosMock[0].id}/baja`), 409);
  });

  it("RF-149 quitarle el rol admin al único admin activo da 409", async () => {
    await esProblema(
      await enviar("PATCH", `/usuarios/${usuariosMock[0].id}`, { rol: "empleado" }),
      409,
    );
  });

  it("RF-149 editar el nombre del admin sin cambiarle el rol sigue funcionando (200)", async () => {
    const res = await enviar("PATCH", `/usuarios/${usuariosMock[0].id}`, { nombre: "Lucía F." });

    expect(res.status).toBe(200);
  });

  it("RF-148 la baja de un usuario que no es el último admin responde 200 inactivo", async () => {
    const res = await enviar("POST", `/usuarios/${usuariosMock[1].id}/baja`);

    expect(res.status).toBe(200);
    expect(((await res.json()) as { activo: boolean }).activo).toBe(false);
  });
});

describe("RF-084 comisión por defecto: validación del esquema (H-02)", () => {
  const ruta = `/usuarios/${usuariosMock[1].id}/comision-por-defecto`;

  it("RF-084 un par válido responde 200", async () => {
    const res = await enviar("PUT", ruta, {
      comision_default_tipo: "porcentaje",
      comision_default_valor: "12.5",
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ comision_default_tipo: "porcentaje" });
  });

  it("RF-084 ambos en null la quitan (200)", async () => {
    const res = await enviar("PUT", ruta, {
      comision_default_tipo: null,
      comision_default_valor: null,
    });

    expect(res.status).toBe(200);
  });

  it.each([
    { comision_default_tipo: "porcentaje", comision_default_valor: "100.01" },
    { comision_default_tipo: "porcentaje", comision_default_valor: "-0.01" },
    { comision_default_tipo: "importe", comision_default_valor: "-1" },
    { comision_default_tipo: "importe", comision_default_valor: null },
    { comision_default_tipo: null, comision_default_valor: "10" },
    { comision_default_tipo: "importe", comision_default_valor: "10.123" },
  ])("RF-084 %j da 422 problem+json", async (cuerpo) => {
    await esProblema(await enviar("PUT", ruta, cuerpo), 422);
  });
});

describe("RF-022 y RF-084 los 422 traen errores por campo como el backend (H-02)", () => {
  it("RF-022 la configuración nombra cada campo fuera de rango", async () => {
    await esProblema(
      await enviar("PUT", "/configuracion", {
        vigencia_cotizacion_meses: 0,
        anticipacion_salida_dias: -1,
        recontacto_meses: 0,
      }),
      422,
      ["vigencia_cotizacion_meses", "anticipacion_salida_dias", "recontacto_meses"],
    );
  });

  it("RF-022 un campo que falta se nombra en errores", async () => {
    await esProblema(
      await enviar("PUT", "/configuracion", {
        vigencia_cotizacion_meses: 1,
        anticipacion_salida_dias: 1,
      }),
      422,
      ["recontacto_meses"],
    );
  });

  const rutaComision = `/usuarios/${usuariosMock[1].id}/comision-por-defecto`;

  it("RF-084 un valor negativo se nombra en comision_default_valor", async () => {
    await esProblema(
      await enviar("PUT", rutaComision, {
        comision_default_tipo: "importe",
        comision_default_valor: "-1",
      }),
      422,
      ["comision_default_valor"],
    );
  });

  it.each([
    [{ comision_default_tipo: "importe", comision_default_valor: null }],
    [{ comision_default_tipo: null, comision_default_valor: "10" }],
    [{ comision_default_tipo: "porcentaje", comision_default_valor: "100.01" }],
  ])("RF-084 la regla cruzada %j se informa en el campo body", async (cuerpo) => {
    await esProblema(await enviar("PUT", rutaComision, cuerpo), 422, ["body"]);
  });

  it("RF-084 un tipo fuera del enum se nombra en comision_default_tipo", async () => {
    await esProblema(
      await enviar("PUT", rutaComision, {
        comision_default_tipo: "regalo",
        comision_default_valor: "10",
      }),
      422,
      ["comision_default_tipo"],
    );
  });

  it("RF-144 el alta de usuario nombra los campos inválidos", async () => {
    await esProblema(
      await enviar("POST", "/usuarios", { nombre: "", email: "mal", rol: "otro" }),
      422,
      ["nombre", "email", "rol"],
    );
  });
});

describe("RF-090, RF-094, RF-086 y RF-144 validan el cuerpo antes que el 409 (H-02)", () => {
  const largo = (n: number) => "x".repeat(n);

  it.each([
    [{ nombre: "", pais: "México" }, ["nombre"]],
    [{ nombre: largo(121), pais: "México" }, ["nombre"]],
    [{ nombre: "Mendoza", pais: "" }, ["pais"]],
    [{ nombre: "Mendoza", pais: largo(81) }, ["pais"]],
    [{ nombre: "Mendoza", pais: "Argentina", region: largo(81) }, ["region"]],
    [{ pais: "Argentina" }, ["nombre"]],
    [{ nombre: "Mendoza" }, ["pais"]],
    [{ nombre: null, pais: "Argentina" }, ["nombre"]],
    // Si además repite un nombre, gana el 422.
    [{ nombre: "Cancún", pais: "" }, ["pais"]],
  ])("RF-090 el alta de destino %j da 422", async (cuerpo, campos) => {
    await esProblema(await enviar("POST", "/destinos", cuerpo), 422, campos);
  });

  it.each([
    [{ nombre: "" }, ["nombre"]],
    [{ nombre: null }, ["nombre"]],
    [{ pais: null }, ["pais"]],
    [{ pais: "" }, ["pais"]],
    [{ nombre: largo(121) }, ["nombre"]],
    [{ region: largo(81) }, ["region"]],
    [{ nombre: "Cancún", pais: "" }, ["pais"]],
  ])("RF-090 la edición de destino %j da 422", async (cuerpo, campos) => {
    await esProblema(await enviar("PATCH", `/destinos/${destinosMock[0].id}`, cuerpo), 422, campos);
  });

  it("RF-090 la edición de destino admite vaciar region y notas (200)", async () => {
    const res = await enviar("PATCH", `/destinos/${destinosMock[0].id}`, {
      region: null,
      notas: null,
    });

    expect(res.status).toBe(200);
  });

  it.each([
    [{ nombre: "" }, ["nombre"]],
    [{ nombre: largo(121) }, ["nombre"]],
    [{ contacto: "x" }, ["nombre"]],
    [{ nombre: null }, ["nombre"]],
    [{ nombre: "Operadora Nueva", contacto: largo(201) }, ["contacto"]],
    [{ nombre: "Despegar Mayorista", contacto: largo(201) }, ["contacto"]],
  ])("RF-094 el alta de operador %j da 422", async (cuerpo, campos) => {
    await esProblema(await enviar("POST", "/operadores", cuerpo), 422, campos);
  });

  it.each([
    [{ nombre: "" }, ["nombre"]],
    [{ nombre: null }, ["nombre"]],
    [{ contacto: largo(201) }, ["contacto"]],
  ])("RF-094 la edición de operador %j da 422", async (cuerpo, campos) => {
    await esProblema(
      await enviar("PATCH", `/operadores/${operadoresMock[0].id}`, cuerpo),
      422,
      campos,
    );
  });

  it("RF-094 la edición de operador admite quitar el contacto (200)", async () => {
    const res = await enviar("PATCH", `/operadores/${operadoresMock[0].id}`, { contacto: null });

    expect(res.status).toBe(200);
  });

  it.each([
    [{ rol: "superadmin" }, ["rol"]],
    [{ rol: null }, ["rol"]],
    [{ nombre: "" }, ["nombre"]],
    [{ nombre: null }, ["nombre"]],
    [{ acceso_redes: "si" }, ["acceso_redes"]],
    [{ rol: "superadmin", nombre: "" }, ["rol", "nombre"]],
  ])("RF-144 la edición de usuario %j da 422", async (cuerpo, campos) => {
    await esProblema(await enviar("PATCH", `/usuarios/${usuariosMock[1].id}`, cuerpo), 422, campos);
  });

  const requisito = { nombre: "Visa", tipo: "visa", obligatorio: true, anticipacion_dias: 10 };
  const rutaRequisitos = `/destinos/${destinosMock[1].id}/requisitos`;

  it("RF-086 el alta de requisito válida responde 201", async () => {
    expect((await enviar("POST", rutaRequisitos, requisito)).status).toBe(201);
  });

  it.each([
    [{ tipo: "otra-cosa" }, ["tipo"]],
    [{ anticipacion_dias: -1 }, ["anticipacion_dias"]],
    [{ anticipacion_dias: 1.5 }, ["anticipacion_dias"]],
    [{ nombre: "" }, ["nombre"]],
    [{ obligatorio: "si" }, ["obligatorio"]],
    [{ tipo: "otra-cosa", anticipacion_dias: -1 }, ["tipo", "anticipacion_dias"]],
  ])("RF-086 el alta de requisito con %j da 422", async (cambio, campos) => {
    await esProblema(
      await enviar("POST", rutaRequisitos, { ...requisito, ...cambio }),
      422,
      campos,
    );
  });

  it.each(["nombre", "tipo", "obligatorio", "anticipacion_dias"])(
    "RF-086 el alta de requisito sin %s da 422",
    async (campo) => {
      const cuerpo = Object.fromEntries(Object.entries(requisito).filter(([c]) => c !== campo));

      await esProblema(await enviar("POST", rutaRequisitos, cuerpo), 422, [campo]);
    },
  );

  it.each([
    [{ tipo: "otra-cosa" }, ["tipo"]],
    [{ tipo: null }, ["tipo"]],
    [{ anticipacion_dias: -1 }, ["anticipacion_dias"]],
    [{ anticipacion_dias: null }, ["anticipacion_dias"]],
    [{ nombre: null }, ["nombre"]],
    [{ obligatorio: null }, ["obligatorio"]],
  ])("RF-086 la edición de requisito %j da 422", async (cuerpo, campos) => {
    await esProblema(
      await enviar("PATCH", `/requisitos-destino/${requisitosMock[0].id}`, cuerpo),
      422,
      campos,
    );
  });

  it("RF-086 la edición de requisito admite anticipación 0 y descripción en null (200)", async () => {
    const res = await enviar("PATCH", `/requisitos-destino/${requisitosMock[0].id}`, {
      anticipacion_dias: 0,
      descripcion: null,
    });

    expect(res.status).toBe(200);
  });
});

describe("RF-090, RF-094 y RF-146 los 409 llevan el texto del backend (H-02)", () => {
  const detalle = async (res: Response) =>
    ((await esProblema(res, 409)) as { detail: string }).detail;

  it("RF-090 el destino repetido nombra al existente, con su grafía", async () => {
    expect(await detalle(await enviar("POST", "/destinos", { nombre: "cancun", pais: "X" }))).toBe(
      "Ya existe un destino llamado «Cancún».",
    );
  });

  it("RF-094 el operador repetido nombra al existente, con su grafía", async () => {
    expect(await detalle(await enviar("POST", "/operadores", { nombre: "andes travel" }))).toBe(
      "Ya existe un operador llamado «Andes Travel».",
    );
  });

  it("RF-146 el email repetido usa el texto del backend", async () => {
    const alta = { nombre: "N", email: "ana@rumbo.test", rol: "empleado" };

    expect(await detalle(await enviar("POST", "/usuarios", alta))).toBe(
      "Ya existe un usuario con ese email.",
    );
  });

  it("RF-146 el email de un usuario dado de baja también cuenta", async () => {
    const alta = { nombre: "N", email: usuarioDeBajaMock.email, rol: "empleado" };

    await esProblema(await enviar("POST", "/usuarios", alta), 409);
  });

  it("RF-149 el último admin usa el texto del backend", async () => {
    expect(await detalle(await enviar("POST", `/usuarios/${usuariosMock[0].id}/baja`))).toBe(
      "Es el único administrador activo: asigná otro antes de quitarle el rol o darlo de baja.",
    );
  });
});

describe("RF-149 y RF-144 último admin, orden y alta de usuario (H-02)", () => {
  it("RF-149 reenviar rol admin al único admin responde 200", async () => {
    const res = await enviar("PATCH", `/usuarios/${usuariosMock[0].id}`, { rol: "admin" });

    expect(res.status).toBe(200);
  });

  it("RF-149 un admin dado de baja no cuenta como otro admin", async () => {
    expect(usuarioDeBajaMock).toMatchObject({ rol: "admin", activo: false });
    await esProblema(await enviar("POST", `/usuarios/${usuariosMock[0].id}/baja`), 409);
  });

  it.each([
    ["false", [usuarioDeBajaMock.nombre]],
    ["0", [usuarioDeBajaMock.nombre]],
    ["true", usuariosMock.map((u) => u.nombre).sort()],
    ["1", usuariosMock.map((u) => u.nombre).sort()],
  ])("RF-144 GET /usuarios?activo=%s filtra como FastAPI", async (parametro, esperados) => {
    const cuerpo = (await (await enviar("GET", `/usuarios?activo=${parametro}`)).json()) as Listado;

    expect(cuerpo.items.map((i) => i.nombre).sort()).toEqual(esperados);
  });

  it.each(["destinos", "operadores", "usuarios"])(
    "RF-089 el listado de %s va ordenado por nombre sin tildes ni mayúsculas",
    async (ruta) => {
      const cuerpo = (await (await enviar("GET", `/${ruta}?activo=true`)).json()) as Listado;
      const nombres = cuerpo.items.map((i) =>
        i.nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(),
      );

      expect(nombres.length).toBeGreaterThan(1);
      expect(nombres).toEqual([...nombres].sort());
    },
  );

  it("RF-144 el alta responde con los datos enviados, normalizados, y sin comisión", async () => {
    const res = await enviar("POST", "/usuarios", {
      nombre: "  Nueva Persona ",
      email: "  Nueva@Rumbo.Test ",
      rol: "freelance",
      acceso_redes: true,
    });
    const cuerpo = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(201);
    expect(cuerpo).toMatchObject({
      nombre: "Nueva Persona",
      email: "nueva@rumbo.test",
      rol: "freelance",
      activo: true,
      acceso_redes: true,
      comision_default_tipo: null,
      comision_default_valor: null,
    });
    expect(usuariosMock.map((u) => u.id)).not.toContain(cuerpo["id"]);
  });

  it("RF-144 el alta sin acceso_redes lo deja en false", async () => {
    const res = await enviar("POST", "/usuarios", {
      nombre: "Otra",
      email: "otra@rumbo.test",
      rol: "empleado",
    });

    expect(((await res.json()) as { acceso_redes: boolean }).acceso_redes).toBe(false);
  });
});
