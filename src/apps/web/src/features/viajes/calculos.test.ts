import { describe, expect, it } from "vitest";
import { porcentajeDeGanancia } from "./calculos";

describe("RN-01 porcentajeDeGanancia", () => {
  it("RN-01 redondea half-up a 2 decimales: 12.5 % de 1234.50 es 154.31", () => {
    expect(porcentajeDeGanancia("1234.50", "12.5")).toBe("154.31");
  });

  it("RN-01 con ganancia negativa o nula la comisión es cero", () => {
    expect(porcentajeDeGanancia("-200000.00", "10")).toBe("0.00");
    expect(porcentajeDeGanancia("0.00", "10")).toBe("0.00");
  });
});
