import { describe, expect, it } from "vitest";
import config from "./vite.config";

describe("vite.config: proxy de /api para levantar Rumbo en local", () => {
  it("el dev server reenvía /api a http://127.0.0.1:8000 por defecto", () => {
    const proxy = config.server?.proxy?.["/api"];
    const destino = typeof proxy === "string" ? proxy : proxy?.target;

    expect(destino).toBe("http://127.0.0.1:8000");
  });
});
