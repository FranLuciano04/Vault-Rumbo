import { readFileSync } from "fs";
import { dirname, resolve } from "path";

// `@babel/core` y `babel-preset-expo` no son dependencias directas de mobile: se resuelven desde
// `jest-expo`, que las trae, igual que lo hace Metro con la app.
const desdeJestExpo = dirname(require.resolve("jest-expo/package.json"));
const babel = require(require.resolve("@babel/core", { paths: [desdeJestExpo] })) as {
  transformSync: (
    code: string,
    opts: Record<string, unknown>,
  ) => { code: string; metadata: { publicEnvVars?: string[] } } | null;
};
const presetExpo = require.resolve("babel-preset-expo", { paths: [desdeJestExpo] });

const ARCHIVO = resolve(__dirname, "../src/lib/firebase.ts");

const VARIABLES = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
  "EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL",
  "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
];

function transformar(isDev: boolean) {
  const resultado = babel.transformSync(readFileSync(ARCHIVO, "utf8"), {
    filename: ARCHIVO,
    babelrc: false,
    configFile: false,
    presets: [presetExpo],
    caller: { name: "metro", platform: "android", isDev, bundler: "metro" },
  });
  if (!resultado) throw new Error("Babel no devolvió resultado");
  return resultado;
}

describe("RF-140 configuración de Firebase en el bundle", () => {
  it.each(VARIABLES)("%s se reconoce como variable pública del bundle", (nombre) => {
    const { metadata } = transformar(true);
    expect(metadata.publicEnvVars ?? []).toContain(nombre);
  });

  it("en producción las seis variables se reemplazan por su valor en el bundle", () => {
    const previo = { ...process.env };
    VARIABLES.forEach((nombre) => {
      process.env[nombre] = `valor-${nombre}`;
    });
    try {
      const { code } = transformar(false);
      VARIABLES.forEach((nombre) => expect(code).toContain(`valor-${nombre}`));
    } finally {
      process.env = previo;
    }
  });

  it("el módulo no lee EXPO_PUBLIC_* a través de un alias de process.env", () => {
    const fuente = readFileSync(ARCHIVO, "utf8");
    expect(fuente).not.toMatch(/=\s*process\.env\s*(as\b[^;]*)?;/);
  });
});
