import { describe, expect, it } from "vitest";
import { esquemaAltaCliente, esquemaEdicionCliente } from "./clientes";

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

  it("RF-031 admite preferencias y asesor asignado en null", () => {
    const r = esquemaAltaCliente.safeParse({
      ...valido,
      preferencias: null,
      asesor_asignado_id: null,
    });

    expect(r.success).toBe(true);
  });
});

describe("RF-003 esquema zod de la edición de cliente (CU-03, H-04)", () => {
  it("RF-003 admite la confirmación explícita de duplicado y la conserva", () => {
    const r = esquemaEdicionCliente.safeParse({ nombre: "Ana P.", confirmar_duplicado: true });

    expect(r.success).toBe(true);
    expect(r.data).toEqual({ nombre: "Ana P.", confirmar_duplicado: true });
  });

  it("RF-003 la confirmación de duplicado es opcional y tiene que ser booleana", () => {
    expect(esquemaEdicionCliente.safeParse({ nombre: "Ana P." }).success).toBe(true);
    expect(esquemaEdicionCliente.safeParse({ confirmar_duplicado: "si" }).success).toBe(false);
    expect(esquemaEdicionCliente.safeParse({ confirmar_duplicado: null }).success).toBe(false);
  });
});
