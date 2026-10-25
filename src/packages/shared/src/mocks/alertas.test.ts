import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Alerta, TipoAlerta } from "../modelos";
import { alertasAjenasMock, alertasMock, manejadoresAlertas, progresoMock } from "./alertas";
import { crearServidor } from "./index";

type Esquema = { required?: string[]; enum?: string[] };
const contrato = JSON.parse(
  readFileSync(new URL("../../openapi.json", import.meta.url), "utf8"),
) as { components: { schemas: Record<string, Esquema> } };

const servidor = crearServidor(...manejadoresAlertas);
beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const BASE = "http://localhost/api/alertas";
const json = { "content-type": "application/json" };

function deTipo(tipo: TipoAlerta): Alerta {
  const alerta = alertasMock.find((a) => a.tipo === tipo);
  if (!alerta) throw new Error(`Falta la alerta mock de tipo ${tipo}`);
  return alerta;
}

// Pendiente y vencida (insistencia), vista (salida), resuelta (reseña) y de pago.
const pendiente = deTipo("insistencia");
const vista = deTipo("salida");
const resuelta = deTipo("resena");
const pago = deTipo("pago");

async function items(consulta = ""): Promise<Alerta[]> {
  return ((await (await fetch(`${BASE}${consulta}`)).json()) as { items: Alerta[] }).items;
}

const accion = (id: string, ruta: string, cuerpo?: object) =>
  fetch(`${BASE}/${id}/${ruta}`, {
    method: "POST",
    headers: json,
    body: cuerpo && JSON.stringify(cuerpo),
  });

describe("CU-14 agenda ficticia de alertas", () => {
  it("CU-14 hay una alerta de cada tipo del esquema", () => {
    const tipos = contrato.components.schemas["TipoAlerta"]?.enum ?? [];

    expect(tipos.length).toBeGreaterThan(0);
    expect(alertasMock.map((a) => a.tipo).sort()).toEqual([...tipos].sort());
  });

  it("CU-14 cada alerta trae los campos requeridos y un estado del enum", () => {
    const esquema = contrato.components.schemas["Alerta"] as unknown as { allOf: Esquema[] };
    const requeridos = esquema.allOf.flatMap((p) => p.required ?? []);
    const estados = contrato.components.schemas["EstadoAlerta"]?.enum ?? [];

    expect(requeridos.length).toBeGreaterThan(0);
    for (const a of [...alertasMock, ...alertasAjenasMock]) {
      for (const campo of requeridos) expect(a).toHaveProperty(campo);
      expect(estados).toContain(a.estado);
    }
  });

  it("CU-14 las alertas ajenas son de otro responsable", () => {
    expect(alertasAjenasMock.length).toBeGreaterThanOrEqual(2);
    for (const a of alertasAjenasMock) expect(a.propietario_id).not.toBe(pendiente.propietario_id);
  });

  it("CU-14 el progreso cuenta las resueltas hoy sobre el total del día", async () => {
    const res = await fetch(`${BASE}/progreso-del-dia`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(progresoMock());
  });
});

describe("CU-14 listado de /api/alertas", () => {
  it("CU-14 por defecto lista las propias no resueltas hasta hoy", async () => {
    const lista = await items();

    expect(lista.length).toBeGreaterThan(0);
    expect(lista.every((a) => a.estado !== "resuelta" && a.fecha <= "2026-10-25")).toBe(true);
    expect(lista.every((a) => a.propietario_id === pendiente.propietario_id)).toBe(true);
  });

  it("CU-14 proximas=true lista solo las pendientes posteriores a hoy", async () => {
    const lista = await items("?proximas=true");

    expect(lista.length).toBeGreaterThan(0);
    expect(lista.every((a) => a.estado === "pendiente" && a.fecha > "2026-10-25")).toBe(true);
  });

  it("CU-14 filtra por tipo y estado", async () => {
    expect((await items("?tipo=pago")).map((a) => a.tipo)).toEqual(["pago"]);
    expect((await items("?estado=resuelta")).map((a) => a.estado)).toEqual(["resuelta"]);
  });

  it("CU-14 propietario_id trae las de ese responsable en vez de la agenda de Ana", async () => {
    const ajena = alertasAjenasMock.find((a) => a.estado !== "resuelta") as Alerta;

    const lista = await items(`?propietario_id=${ajena.propietario_id}`);

    expect(lista.length).toBeGreaterThan(0);
    expect(lista.every((a) => a.propietario_id === ajena.propietario_id)).toBe(true);
    expect(lista.map((a) => a.id)).toContain(ajena.id);
  });

  it("CU-14 cada alerta mock trae el responsable y el contexto del origen", () => {
    for (const a of [...alertasMock, ...alertasAjenasMock]) {
      expect(a.responsable).toEqual({ id: a.propietario_id, nombre: expect.any(String) as string });
      expect(Object.keys(a.contexto).sort()).toEqual(["cliente", "oportunidad", "pago", "viaje"]);
    }
  });

  it("CU-14 propietario_id lista solo la agenda de ese responsable, con los demás filtros", async () => {
    const ajena = alertasAjenasMock[0] as Alerta;

    const lista = await items(`?propietario_id=${ajena.propietario_id}&tipo=${ajena.tipo}`);

    expect(lista).toEqual([ajena]);
  });
});

describe("CU-14 acciones sobre una alerta (EST-Alerta)", () => {
  it("CU-14 GET /api/alertas/{id} responde la alerta o 404, también para una ajena", async () => {
    expect(await (await fetch(`${BASE}/${pendiente.id}`)).json()).toEqual(pendiente);
    const ausente = await fetch(`${BASE}/00000000-0000-4000-8000-000000000000`);
    const ajena = await fetch(`${BASE}/${(alertasAjenasMock[0] as Alerta).id}`);

    expect(ausente.status).toBe(404);
    expect(ausente.headers.get("content-type")).toContain("application/problem+json");
    expect(ajena.status).toBe(404);
  });

  it("CU-28 POST crea un recordatorio manual pendiente y rechaza más de una entidad", async () => {
    const crear = (extra: object) =>
      fetch(BASE, {
        method: "POST",
        headers: json,
        body: JSON.stringify({ fecha: "2026-11-05", descripcion: "Llamar a Ana", ...extra }),
      });

    const creada = await crear({});
    const dos = await crear({ viaje_id: pendiente.id, cliente_id: pendiente.id });

    expect(creada.status).toBe(201);
    expect(await creada.json()).toMatchObject({ tipo: "manual", estado: "pendiente" });
    expect(dos.status).toBe(422);
  });

  it("CU-28 PATCH edita una pendiente y responde 409 si está vista o resuelta", async () => {
    const editar = (id: string) =>
      fetch(`${BASE}/${id}`, {
        method: "PATCH",
        headers: json,
        body: JSON.stringify({ descripcion: "Nuevo texto" }),
      });

    expect(await (await editar(pendiente.id)).json()).toMatchObject({ descripcion: "Nuevo texto" });
    expect((await editar(vista.id)).status).toBe(409);
    expect((await editar(resuelta.id)).status).toBe(409);
  });

  it("CU-14 marcar como vista solo sale de pendiente", async () => {
    expect(await (await accion(pendiente.id, "vista")).json()).toMatchObject({ estado: "vista" });
    expect((await accion(vista.id, "vista")).status).toBe(409);
    expect((await accion(resuelta.id, "vista")).status).toBe(409);
  });

  it("CU-14 resolver sale de pendiente o vista y da 409 si ya está resuelta", async () => {
    expect(await (await accion(pendiente.id, "resolver")).json()).toMatchObject({
      estado: "resuelta",
    });
    expect(await (await accion(vista.id, "resolver")).json()).toMatchObject({
      estado: "resuelta",
    });
    expect((await accion(resuelta.id, "resolver")).status).toBe(409);
  });

  it("CU-14 A2 resolver una alerta de pago da 409: se resuelve al registrar el cobro", async () => {
    const res = await accion(pago.id, "resolver");

    expect(res.status).toBe(409);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
  });

  it("CU-14 posponer solo una pendiente, a un día posterior a su fecha y a hoy", async () => {
    // Vencida el 24/10: la nueva fecha tiene que superar también el «hoy» (25/10).
    expect((await accion(pendiente.id, "posponer", { fecha: "2026-10-25" })).status).toBe(422);
    expect((await accion(pendiente.id, "posponer", { fecha: "2026-10-24" })).status).toBe(422);
    expect(
      await (await accion(pendiente.id, "posponer", { fecha: "2026-10-26" })).json(),
    ).toMatchObject({
      fecha: "2026-10-26",
    });
    // Futura: tiene que superar su propia fecha.
    const futura = deTipo("manual");
    expect((await accion(futura.id, "posponer", { fecha: futura.fecha })).status).toBe(422);
    expect((await accion(vista.id, "posponer", { fecha: "2026-12-01" })).status).toBe(409);
    expect((await accion(resuelta.id, "posponer", { fecha: "2026-12-01" })).status).toBe(409);
  });
});
