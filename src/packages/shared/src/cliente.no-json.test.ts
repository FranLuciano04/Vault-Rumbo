import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ErrorApi, crearCliente } from "./cliente";
import { crearServidor } from "./mocks";

const BASE = "http://rumbo.test/api";
const HTML = '<!doctype html><html><body><div id="root"></div></body></html>';

const servidor = crearServidor(
  http.get(
    `${BASE}/auth/yo`,
    () => new HttpResponse(HTML, { status: 200, headers: { "content-type": "text/html" } }),
  ),
  http.get(`${BASE}/sin-tipo`, () => {
    const respuesta = new HttpResponse(HTML, { status: 200 });
    respuesta.headers.delete("content-type");
    return respuesta;
  }),
  http.get(`${BASE}/ok`, () => HttpResponse.json({ ok: true })),
  http.get(
    `${BASE}/problema-json`,
    () =>
      new HttpResponse(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      }),
  ),
  http.delete(`${BASE}/clientes/1`, () => new HttpResponse(null, { status: 204 })),
);

beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

describe("cliente HTTP: respuestas 2xx que no son JSON (API apagada detrás del proxy)", () => {
  const cliente = () => crearCliente({ baseURL: BASE, obtenerToken: () => "t" });

  it("RF-141 rechaza con ErrorApi un 200 text/html (el index.html de Vite)", async () => {
    const error = await cliente()
      .get("/auth/yo")
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as ErrorApi).status).toBe(200);
  });

  it("RF-141 rechaza con ErrorApi un 200 sin content-type", async () => {
    const error = await cliente()
      .get("/sin-tipo")
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorApi);
  });

  it("RF-141 deja pasar un 200 application/json con charset", async () => {
    const respuesta = await cliente().get("/problema-json");

    expect(respuesta.data).toEqual({ ok: true });
  });

  it("RF-141 deja pasar un 204 sin cuerpo ni content-type", async () => {
    const respuesta = await cliente().delete("/clientes/1");

    expect(respuesta.status).toBe(204);
  });

  it("RF-141 deja pasar un 200 JSON normal", async () => {
    const respuesta = await cliente().get("/ok");

    expect(respuesta.data).toEqual({ ok: true });
  });
});
