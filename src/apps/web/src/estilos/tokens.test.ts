import { readFileSync } from "node:fs";
import path from "node:path";

const leer = (archivo: string) => readFileSync(path.resolve(import.meta.dirname, archivo), "utf8");
const tokens = leer("tokens.css");
const index = leer("index.css");

describe("RNF-11 tokens de diseño del prototipo (Figma)", () => {
  it("define la paleta azul del equipo y el gris", () => {
    for (const color of ["#22506f", "#73a5c4", "#d9d9d9"]) {
      expect(tokens.toLowerCase()).toContain(color);
    }
  });

  it("usa Plus Jakarta Sans como tipografía y la expone al tema de Tailwind", () => {
    expect(tokens).toContain("Plus Jakarta Sans");
    expect(index).toMatch(/--font-sans:/);
  });

  it("usa una escala de espaciado base de 4 px", () => {
    expect(`${tokens}\n${index}`).toMatch(/--spacing:\s*(4px|0?\.25rem)/);
  });

  it("el color primario deja de ser el neutral de shadcn", () => {
    expect(tokens).not.toMatch(/--primary:\s*oklch\(0\.205 0 0\)/);
  });
});
