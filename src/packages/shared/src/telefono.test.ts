import { enlaceLlamada, normalizarTelefonoAR } from "./telefono";

describe("normalizarTelefonoAR (contacto de clientes, CU-03)", () => {
  it.each([
    ["11 5555-1234", "5491155551234"],
    ["011 5555-1234", "5491155551234"],
    ["011 15 5555-1234", "5491155551234"],
    ["0351 15 555-9876", "5493515559876"],
    ["+54 9 11 5555-1234", "5491155551234"],
    ["+54 11 5555-1234", "5491155551234"],
    ["+54 9 351 555-9876", "5493515559876"],
    ["5491155551234", "5491155551234"],
    ["(011) 5555.1234", "5491155551234"],
  ])("%s -> %s", (entrada, esperado) => {
    expect(normalizarTelefonoAR(entrada)).toBe(esperado);
  });

  it.each([
    "consultar por Instagram",
    "",
    "sosa.familia@mail.test",
    "5555-123",
    "11 5555-1234 / 11 4444-5555",
    "11 5555-1234, 11 4444-5555",
    "11 5555-1234 11 4444-5555",
    "+1 305 555 1234",
  ])("%j -> null", (entrada) => {
    expect(normalizarTelefonoAR(entrada)).toBeNull();
  });
});

describe("enlaceLlamada", () => {
  it.each([
    ["11 5555-1234", "tel:1155551234"],
    ["+54 9 11 5555-1234", "tel:+5491155551234"],
    ["+1 305 555 1234", "tel:+13055551234"],
    ["4444-5555", "tel:44445555"],
  ])("%s -> %s", (entrada, esperado) => {
    expect(enlaceLlamada(entrada)).toBe(esperado);
  });

  it.each(["consultar por Instagram", "sosa.familia@mail.test", "11 5555-1234 / 11 4444-5555", ""])(
    "%j -> null",
    (entrada) => {
      expect(enlaceLlamada(entrada)).toBeNull();
    },
  );
});

describe("espacios Unicode (los mismos que el \s de JavaScript)", () => {
  it.each([" ", " ", "　", " ", "﻿"])("%j separa dígitos como un espacio", (espacio) => {
    expect(normalizarTelefonoAR(`11${espacio}4567${espacio}8901`)).toBe("5491145678901");
  });

  it("los dígitos que no son ASCII no cuentan", () => {
    expect(normalizarTelefonoAR("١١٤٥٦٧٨٩٠١")).toBeNull();
  });
});
