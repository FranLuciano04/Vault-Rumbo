import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ErrorApi, crearCliente } from "./cliente";
import { crearServidor } from "./mocks";

const BASE = "http://rumbo.test/api";
let autorizacionRecibida: string | null | undefined;

const servidor = crearServidor(
  http.get(`${BASE}/eco`, ({ request }) => {
    autorizacionRecibida = request.headers.get("authorization");
    return HttpResponse.json({ ok: true });
  }),
  http.post(`${BASE}/viajes/1/cancelar`, () =>
    HttpResponse.json(
      { title: "Conflicto", status: 409, detail: "El viaje ya está cancelado" },
      { status: 409, headers: { "content-type": "application/problem+json" } },
    ),
  ),
  http.get(`${BASE}/caido`, () => new HttpResponse("Bad Gateway", { status: 502 })),
  http.post(`${BASE}/clientes`, () =>
    HttpResponse.json(
      {
        title: "Datos inválidos",
        status: 422,
        detail: "Hay campos inválidos",
        errores: [{ campo: "email", mensaje: "formato inválido" }],
      },
      { status: 422, headers: { "content-type": "application/problem+json" } },
    ),
  ),
);

beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  servidor.resetHandlers();
  autorizacionRecibida = undefined;
});
afterAll(() => servidor.close());

describe("cliente HTTP", () => {
  it("RNF-04 agrega Authorization Bearer con el token de obtenerToken", async () => {
    const cliente = crearCliente({ baseURL: BASE, obtenerToken: async () => "abc123" });

    await cliente.get("/eco");

    expect(autorizacionRecibida).toBe("Bearer abc123");
  });

  it("RNF-04 consulta obtenerToken en cada request, no una sola vez", async () => {
    let n = 0;
    const cliente = crearCliente({ baseURL: BASE, obtenerToken: () => `t${++n}` });

    await cliente.get("/eco");
    expect(autorizacionRecibida).toBe("Bearer t1");
    await cliente.get("/eco");
    expect(autorizacionRecibida).toBe("Bearer t2");
  });

  it("RNF-04 no agrega Authorization si no hay sesión (token null)", async () => {
    const cliente = crearCliente({ baseURL: BASE, obtenerToken: () => null });

    await cliente.get("/eco");

    expect(autorizacionRecibida).toBeNull();
  });

  it("RNF-04 traduce un 409 problem+json a ErrorApi tipado", async () => {
    const cliente = crearCliente({ baseURL: BASE, obtenerToken: () => "t" });

    const error = await cliente.post("/viajes/1/cancelar").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorApi);
    const e = error as ErrorApi;
    expect(e.status).toBe(409);
    expect(e.title).toBe("Conflicto");
    expect(e.detail).toBe("El viaje ya está cancelado");
  });

  it("RNF-04 conserva la lista errores por campo de un 422", async () => {
    const cliente = crearCliente({ baseURL: BASE, obtenerToken: () => "t" });

    const error = (await cliente.post("/clientes", {}).catch((e: unknown) => e)) as ErrorApi;

    expect(error).toBeInstanceOf(ErrorApi);
    expect(error.status).toBe(422);
    expect(error.errores).toEqual([{ campo: "email", mensaje: "formato inválido" }]);
  });

  it("RNF-04 traduce un error sin problem+json (502 texto plano) a ErrorApi", async () => {
    const cliente = crearCliente({ baseURL: BASE, obtenerToken: () => "t" });

    const error = (await cliente.get("/caido").catch((e: unknown) => e)) as ErrorApi;

    expect(error).toBeInstanceOf(ErrorApi);
    expect(error.name).toBe("ErrorApi");
    expect(error.status).toBe(502);
  });
});
