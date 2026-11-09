import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { ContenidoRed, Pagina, PropuestaIA } from "../modelos";
import { crearServidor, type RolMock } from "./index";
import { contenidosMock, manejadoresRedesPara } from "./redes";

const servidor = crearServidor();
beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const BASE = "http://localhost/api/contenidos";

function conRol(rol: RolMock, accesoRedes?: boolean) {
  servidor.use(...manejadoresRedesPara(rol, accesoRedes));
}

const json = (cuerpo: object) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(cuerpo),
});

const piezaEn = (estado: ContenidoRed["estado_kanban"]) => {
  const pieza = contenidosMock.find((c) => c.estado_kanban === estado);
  if (!pieza) throw new Error(`Falta una pieza mock en ${estado}`);
  return pieza;
};

const editar = (id: string, cambios: object) =>
  fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cambios),
  });

describe("CU-19 tablero de contenido del mock", () => {
  it("CU-19 hay al menos una pieza ficticia en cada columna del kanban", () => {
    const columnas = new Set(contenidosMock.map((c) => c.estado_kanban));

    expect([...columnas].sort()).toEqual(
      ["descartado", "en_produccion", "idea", "listo", "publicado"].sort(),
    );
  });

  it("CU-19 el listado sin filtro de columna excluye las descartadas", async () => {
    conRol("admin");

    const todas = (await (await fetch(BASE)).json()) as Pagina<ContenidoRed>;

    expect(todas.total).toBe(contenidosMock.filter((c) => c.estado_kanban !== "descartado").length);
    expect(todas.items.some((c) => c.estado_kanban === "descartado")).toBe(false);
  });

  it("CU-19 estado_kanban=descartado muestra las descartadas y el resto filtra por columna", async () => {
    conRol("admin");

    const descartadas = (await (
      await fetch(`${BASE}?estado_kanban=descartado`)
    ).json()) as Pagina<ContenidoRed>;
    const ideas = (await (
      await fetch(`${BASE}?estado_kanban=idea`)
    ).json()) as Pagina<ContenidoRed>;

    expect(descartadas.total).toBeGreaterThan(0);
    expect(descartadas.items.every((c) => c.estado_kanban === "descartado")).toBe(true);
    expect(ideas.items.every((c) => c.estado_kanban === "idea")).toBe(true);
  });

  it("RF-114 orden=desc lista de la fecha más nueva a la más vieja y sin orden es ascendente", async () => {
    conRol("admin");

    const asc = (await (await fetch(BASE)).json()) as Pagina<ContenidoRed>;
    const desc = (await (await fetch(`${BASE}?orden=desc`)).json()) as Pagina<ContenidoRed>;

    const fechasAsc = asc.items.map((c) => c.fecha_publicacion);
    const fechasDesc = desc.items.map((c) => c.fecha_publicacion);
    expect(fechasAsc).toEqual([...fechasAsc].sort());
    expect(fechasDesc).toEqual([...fechasDesc].sort().reverse());
    expect(fechasDesc[0]).not.toBe(fechasAsc[0]);
  });

  it("RF-114 un orden inválido responde 422", async () => {
    conRol("admin");

    const respuesta = await fetch(`${BASE}?orden=ascendente`);

    expect(respuesta.status).toBe(422);
  });

  it("CU-19 el freelance recibe 403 aun con la capacidad", async () => {
    conRol("freelance", true);

    expect((await fetch(BASE)).status).toBe(403);
  });

  it("CU-19 el empleado sin acceso a redes recibe 403", async () => {
    conRol("empleado", false);

    expect((await fetch(BASE)).status).toBe(403);
  });

  it.each(["admin", "dueno"] as const)(
    "CU-19 %s entra por rol aunque acceso_redes sea falso",
    async (rol) => {
      conRol(rol, false);

      expect((await fetch(BASE)).status).toBe(200);
    },
  );

  it.each([
    ["idea", "en_produccion", 200],
    ["en_produccion", "idea", 200],
    ["en_produccion", "listo", 200],
    ["listo", "en_produccion", 200],
    ["listo", "publicado", 200],
    ["idea", "listo", 409],
    ["idea", "publicado", 409],
    ["en_produccion", "publicado", 409],
    ["listo", "idea", 409],
    ["idea", "descartado", 409],
    ["listo", "descartado", 409],
    ["idea", "idea", 200],
  ] as const)("CU-19 PATCH de %s a %s responde %i", async (desde, hasta, esperado) => {
    conRol("admin");

    const respuesta = await editar(piezaEn(desde).id, { estado_kanban: hasta });

    expect(respuesta.status).toBe(esperado);
  });

  it.each(["publicado", "descartado"] as const)(
    "CU-19 una pieza %s no admite cambios, ni de fecha",
    async (estado) => {
      conRol("admin");

      const respuesta = await editar(piezaEn(estado).id, { fecha_publicacion: "2027-01-10" });

      expect(respuesta.status).toBe(409);
    },
  );

  it("CU-19 descartar una pieza publicada o descartada responde 409", async () => {
    conRol("dueno");

    for (const estado of ["publicado", "descartado"] as const) {
      const respuesta = await fetch(`${BASE}/${piezaEn(estado).id}/descartar`, { method: "POST" });
      expect(respuesta.status).toBe(409);
    }
  });

  it("CU-19 descartar una pieza anterior a publicado la deja descartada", async () => {
    conRol("dueno");

    const respuesta = await fetch(`${BASE}/${piezaEn("listo").id}/descartar`, { method: "POST" });
    const pieza = (await respuesta.json()) as ContenidoRed;

    expect(pieza.estado_kanban).toBe("descartado");
  });
});

describe("CU-20 propuestas con IA del mock", () => {
  it("CU-20 devuelve borradores sin id, que no se guardan", async () => {
    conRol("empleado", true);

    const respuesta = await fetch(
      `${BASE}/propuestas-ia`,
      json({ tema: "Caribe", canal: "tiktok", tono: "cercano" }),
    );
    const { borradores } = (await respuesta.json()) as PropuestaIA;

    expect(respuesta.status).toBe(200);
    expect(borradores.length).toBeGreaterThan(0);
    expect(borradores[0]).not.toHaveProperty("id");
  });

  it("CU-20 un canal desconocido responde 422", async () => {
    conRol("admin");

    const respuesta = await fetch(`${BASE}/propuestas-ia`, json({ tema: "x", canal: "facebook" }));

    expect(respuesta.status).toBe(422);
  });
});
