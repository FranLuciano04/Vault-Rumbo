import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { manejadorYo, usuariosPorRol, crearServidor, type RolMock } from "./index";

type Esquema = { required?: string[]; properties?: Record<string, { enum?: string[] }> };
type Contrato = {
  paths: Record<string, { get: { responses: Record<string, unknown> } }>;
  components: { schemas: Record<string, Esquema> };
};

const contrato = JSON.parse(
  readFileSync(new URL("../../openapi.json", import.meta.url), "utf8"),
) as Contrato;

function esquemaDeYo(): Esquema {
  const ok = contrato.paths["/api/auth/yo"]?.get.responses["200"] as {
    content: { "application/json": { schema: { $ref: string } } };
  };
  const nombre = ok.content["application/json"].schema.$ref.split("/").pop() as string;
  return contrato.components.schemas[nombre] as Esquema;
}

const ROLES: RolMock[] = ["admin", "dueno", "empleado", "freelance"];

const servidor = crearServidor();
beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

describe("RF-141 mock MSW de GET /api/auth/yo por rol", () => {
  it("RF-141 hay un usuario mock por cada rol del esquema", () => {
    const rolesDelEsquema = esquemaDeYo().properties?.rol?.enum ?? [];

    expect(rolesDelEsquema.length).toBeGreaterThan(0);
    expect(Object.keys(usuariosPorRol).sort()).toEqual([...rolesDelEsquema].sort());
  });

  it.each(ROLES)(
    "RF-141 el usuario mock del rol %s trae los campos requeridos del esquema",
    (rol) => {
      const usuario = usuariosPorRol[rol];

      for (const campo of esquemaDeYo().required ?? []) {
        expect(usuario).toHaveProperty(campo);
      }
      expect(usuario.rol).toBe(rol);
    },
  );

  it.each(ROLES)("RF-141 manejadorYo(%s) responde 200 con ese usuario", async (rol) => {
    servidor.use(manejadorYo(rol));

    const res = await fetch("http://localhost/api/auth/yo");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(usuariosPorRol[rol]);
  });
});
