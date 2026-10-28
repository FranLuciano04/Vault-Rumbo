import { formatearFecha, formatearImporte, formatearPuntaje } from "./formato";

const normalizar = (texto: string) => texto.replace(/[\u00a0\u202f]/g, " ");

describe("RF-141 lib/formato (importes ARS/USD y fechas dd/mm/aa)", () => {
  it("formatea un importe en ARS con separador de miles, coma decimal y símbolo $", () => {
    expect(normalizar(formatearImporte("1234567.5", "ARS"))).toBe("$ 1.234.567,50");
  });

  it("formatea un importe en USD con prefijo US$", () => {
    expect(normalizar(formatearImporte("1500", "USD"))).toBe("US$ 1.500,00");
  });

  it("siempre muestra dos decimales y no pierde precisión en importes grandes (string, nunca float)", () => {
    expect(normalizar(formatearImporte("0", "ARS"))).toBe("$ 0,00");
    expect(normalizar(formatearImporte("9007199254740993.10", "ARS"))).toBe(
      "$ 9.007.199.254.740.993,10",
    );
  });

  it("formatea un importe negativo con signo menos", () => {
    expect(normalizar(formatearImporte("-2500.75", "ARS"))).toMatch(
      /^-\s?\$ 2\.500,75$|^\$ -2\.500,75$/,
    );
  });

  it("formatea una fecha de negocio como dd/mm/aa", () => {
    expect(formatearFecha("2026-10-18")).toBe("18/10/26");
    expect(formatearFecha("2026-01-05")).toBe("05/01/26");
  });

  it("convierte un timestamptz UTC al día de Buenos Aires (America/Argentina/Buenos_Aires)", () => {
    // 01:30 UTC del 19/10 son las 22:30 del 18/10 en Argentina (UTC-3).
    expect(formatearFecha("2026-10-19T01:30:00Z")).toBe("18/10/26");
  });

  it("redondea half-up a dos decimales con acarreo", () => {
    expect(normalizar(formatearImporte("0.999", "ARS"))).toBe("$ 1,00");
    expect(normalizar(formatearImporte("1234.567", "ARS"))).toBe("$ 1.234,57");
    expect(normalizar(formatearImporte("999.995", "ARS"))).toBe("$ 1.000,00");
  });

  it("acepta un importe sin parte entera", () => {
    expect(normalizar(formatearImporte(".5", "ARS"))).toBe("$ 0,50");
  });

  it("no muestra signo si el importe redondeado es cero", () => {
    expect(normalizar(formatearImporte("-0.001", "ARS"))).toBe("$ 0,00");
  });

  it("rechaza un importe que no es decimal", () => {
    expect(() => formatearImporte("1e3", "ARS")).toThrow(/importe/i);
    expect(() => formatearImporte("", "ARS")).toThrow(/importe/i);
  });

  it("rechaza una fecha vacía o inválida", () => {
    expect(() => formatearFecha("")).toThrow(/fecha/i);
    expect(() => formatearFecha("no es fecha")).toThrow(/fecha/i);
  });
});

describe("RF-106 formatearPuntaje", () => {
  it("muestra un decimal con coma y redondea half-up sobre el texto", () => {
    expect(formatearPuntaje("4.50")).toBe("4,5");
    expect(formatearPuntaje("4.35")).toBe("4,4");
    expect(formatearPuntaje("4.34")).toBe("4,3");
    expect(formatearPuntaje("5.00")).toBe("5,0");
    expect(formatearPuntaje("4.95")).toBe("5,0");
  });
});
