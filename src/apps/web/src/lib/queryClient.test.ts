import { ErrorApi } from "@rumbo/shared";
import { describe, expect, it } from "vitest";
import { crearQueryClient } from "./queryClient";

function errorApi(status: number): ErrorApi {
  const e = new ErrorApi(`HTTP ${status}`);
  e.status = status;
  return e;
}

function debeReintentar(falla: unknown, intento = 0): boolean {
  const retry = crearQueryClient().getDefaultOptions().queries?.retry;
  if (typeof retry === "function") return retry(intento, falla as Error);
  if (typeof retry === "number") return intento < retry;
  if (retry === undefined) return intento < 3; // valor por defecto de TanStack Query
  return retry;
}

describe("RF-003 política de reintentos del QueryClient de la app", () => {
  it.each([400, 403, 404, 422])("no reintenta un ErrorApi %i (se muestra enseguida)", (status) => {
    expect(debeReintentar(errorApi(status))).toBe(false);
  });

  it("reintenta un error de red (sin respuesta)", () => {
    expect(debeReintentar(new Error("Network Error"))).toBe(true);
  });

  it("reintenta un 503 del servidor", () => {
    expect(debeReintentar(errorApi(503))).toBe(true);
  });

  it("deja de reintentar un error de red tras 3 intentos", () => {
    expect(debeReintentar(new Error("Network Error"), 3)).toBe(false);
  });
});
