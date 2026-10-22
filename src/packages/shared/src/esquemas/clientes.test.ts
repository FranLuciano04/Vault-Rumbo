import { describe, expect, it } from "vitest";
import { esquemaAltaCliente } from "./clientes";

const valido = { nombre: "Ana Pérez", contacto: "ana@mail.test", segmento: "pareja" };

describe("RF-031 esquema zod del alta de cliente (CU-02)", () => {
  it("RF-031 acepta nombre, contacto y segmento válidos", () => {
    expect(esquemaAltaCliente.safeParse(valido).success).toBe(true);
  });

  it("RF-031 acepta un WhatsApp como contacto", () => {
    expect(
      esquemaAltaCliente.safeParse({ ...valido, contacto: "+54 9 11 5555-1234" }).success,
    ).toBe(true);
  });

  it("RF-031 rechaza el nombre vacío", () => {
    expect(esquemaAltaCliente.safeParse({ ...valido, nombre: "" }).success).toBe(false);
  });

  it("RF-031 rechaza un nombre de más de 120 caracteres", () => {
    expect(esquemaAltaCliente.safeParse({ ...valido, nombre: "x".repeat(121) }).success).toBe(
      false,
    );
  });

  it("RF-031 rechaza un contacto que no es teléfono ni email (CU-02 paso 3)", () => {
    expect(esquemaAltaCliente.safeParse({ ...valido, contacto: "sin contacto" }).success).toBe(
      false,
    );
  });

  it("RF-031 rechaza un segmento fuera del enum", () => {
    expect(esquemaAltaCliente.safeParse({ ...valido, segmento: "otro" }).success).toBe(false);
  });

  it("RF-031 admite la confirmación explícita de duplicado (CU-02 A1)", () => {
    const r = esquemaAltaCliente.safeParse({ ...valido, confirmar_duplicado: true });

    expect(r.success).toBe(true);
  });
});
