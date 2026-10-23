import { describe, expect, it } from "vitest";
import { esquemaAltaCliente } from "./clientes";

const valido = { nombre: "Ana Pérez", contacto: "ana@mail.test", segmento: "pareja" };

describe("RF-001 instagram del cliente en el esquema zod del alta (T-149, DEC-0017)", () => {
  it("RF-001 el instagram es opcional: sin el campo el alta sigue siendo válida", () => {
    expect(esquemaAltaCliente.safeParse(valido).success).toBe(true);
  });

  it("RF-001 acepta un instagram válido y lo conserva en la salida", () => {
    const r = esquemaAltaCliente.safeParse({ ...valido, instagram: "viajes.ana" });
    expect(r.success).toBe(true);
    expect(r.data).toHaveProperty("instagram", "viajes.ana");
  });

  it.each([
    ["@Viajes.Ana", "viajes.ana"],
    ["  ana_01 ", "ana_01"],
    ["  @Ana_01  ", "ana_01"],
  ])("RF-001 normaliza %j a %j", (crudo, esperado) => {
    const r = esquemaAltaCliente.safeParse({ ...valido, instagram: crudo });
    expect(r.success).toBe(true);
    expect(r.data).toHaveProperty("instagram", esperado);
  });

  it.each(["", "   ", "@", " @ "])("RF-001 %j (vacío o solo @) se transforma en null", (crudo) => {
    const r = esquemaAltaCliente.safeParse({ ...valido, instagram: crudo });
    expect(r.success).toBe(true);
    expect(r.data).toHaveProperty("instagram", null);
  });

  it("RF-001 acepta null explícito", () => {
    const r = esquemaAltaCliente.safeParse({ ...valido, instagram: null });
    expect(r.success).toBe(true);
    expect(r.data).toHaveProperty("instagram", null);
  });

  it.each([
    "viajes ana",
    "ana-01",
    "ana!",
    "ñandú",
    "@@ana",
    "ana@mail.test",
    "a".repeat(31),
    "\uFEFFana",
  ])("RF-001 rechaza el formato inválido %j", (crudo) => {
    expect(esquemaAltaCliente.safeParse({ ...valido, instagram: crudo }).success).toBe(false);
  });

  it("RF-002 el instagram solo no alcanza como contacto mínimo", () => {
    const sinContacto = { nombre: "Ana Pérez", segmento: "pareja", instagram: "ana_01" };
    expect(esquemaAltaCliente.safeParse(sinContacto).success).toBe(false);
    expect(esquemaAltaCliente.safeParse({ ...sinContacto, contacto: "" }).success).toBe(false);
  });

  it("RF-002 el instagram como valor de contacto no es un contacto válido", () => {
    expect(esquemaAltaCliente.safeParse({ ...valido, contacto: "@ana_01" }).success).toBe(false);
  });
});
