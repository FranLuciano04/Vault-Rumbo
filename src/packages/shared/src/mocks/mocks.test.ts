import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { crearServidor, manejadoresEjemplo } from "./index";

const servidor = crearServidor();

beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

describe("RNF-04 utilidades MSW de @rumbo/shared", () => {
  it("expone al menos un handler de ejemplo", () => {
    expect(manejadoresEjemplo.length).toBeGreaterThan(0);
  });

  it("el handler de ejemplo GET /api/auth/yo responde con el usuario", async () => {
    const res = await fetch("http://localhost/api/auth/yo");

    expect(res.status).toBe(200);
    expect(await res.json()).toHaveProperty("email");
  });

  it("un test puede sobreescribir un handler con servidor.use", async () => {
    servidor.use(
      http.get("http://localhost/api/auth/yo", () => HttpResponse.json({ email: "x@y.z" })),
    );

    const res = await fetch("http://localhost/api/auth/yo");

    expect(await res.json()).toEqual({ email: "x@y.z" });
  });
});
