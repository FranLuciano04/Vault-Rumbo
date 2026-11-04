import { describe, expect, it } from "vitest";
import { diasDelPeriodo, huecoInicial, moverAncla } from "./periodo";

describe("RF-137 periodo del calendario", () => {
  it.each([
    ["mes", "2026-12-15", 1, "2027-01-01"],
    ["mes", "2027-01-20", -1, "2026-12-01"],
    ["mes", "2026-11-30", 1, "2026-12-01"],
    ["semana", "2026-12-28", 1, "2027-01-04"],
    ["dia", "2026-12-31", 1, "2027-01-01"],
    ["dia", "2027-01-01", -1, "2026-12-31"],
  ] as const)("mover %s desde %s (%i) lleva a %s", (vista, ancla, sentido, esperado) => {
    const movido = moverAncla(vista, ancla, sentido);
    expect(movido).toBe(esperado);
  });

  it("febrero bisiesto tiene 29 días y el común 28", () => {
    expect(diasDelPeriodo("mes", "2028-02-10")).toHaveLength(29);
    expect(diasDelPeriodo("mes", "2027-02-10")).toHaveLength(28);
  });

  it("la semana que cruza de mes arranca el lunes anterior", () => {
    const dias = diasDelPeriodo("semana", "2026-12-31");
    expect(dias[0]).toBe("2026-12-28");
    expect(dias.at(-1)).toBe("2027-01-03");
  });

  it("el hueco inicial cuenta los días desde el lunes", () => {
    expect(huecoInicial("2026-11-01")).toBe(6);
    expect(huecoInicial("2026-06-01")).toBe(0);
  });
});
