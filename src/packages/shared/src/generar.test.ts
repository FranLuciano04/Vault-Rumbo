import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const raiz = path.resolve(import.meta.dirname, "..");
const paquete = JSON.parse(readFileSync(path.join(raiz, "package.json"), "utf8")) as {
  scripts: Record<string, string>;
};

describe("RNF-04 generación de tipos desde el OpenAPI", () => {
  it("el script generar lee openapi.json y escribe src/tipos.gen.ts", () => {
    const script = paquete.scripts["generar"] ?? "";

    expect(script).toContain("openapi.json");
    expect(script).toContain("src/tipos.gen.ts");
  });

  it("openapi.json existe y es un documento OpenAPI 3", () => {
    const ruta = path.join(raiz, "openapi.json");

    expect(existsSync(ruta)).toBe(true);
    expect(JSON.parse(readFileSync(ruta, "utf8"))).toHaveProperty("openapi");
  });

  it("tipos.gen.ts existe y declara paths y components", () => {
    const ruta = path.join(raiz, "src", "tipos.gen.ts");

    expect(existsSync(ruta)).toBe(true);
    const texto = readFileSync(ruta, "utf8");
    expect(texto).toMatch(/export interface paths/);
    expect(texto).toMatch(/export interface components/);
  });
});
