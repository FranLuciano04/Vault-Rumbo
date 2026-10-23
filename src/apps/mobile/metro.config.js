const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// `@rumbo/shared` trae su propia copia de React y de TanStack Query (las de la web): se resuelven
// siempre desde la app para que el bundle tenga una sola instancia de React (si no, los hooks fallan).
const UNA_SOLA_COPIA = new Set(["react", "@tanstack/react-query"]);
config.resolver.resolveRequest = (contexto, nombre, plataforma) =>
  contexto.resolveRequest(
    UNA_SOLA_COPIA.has(nombre)
      ? { ...contexto, originModulePath: path.join(__dirname, "package.json") }
      : contexto,
    nombre,
    plataforma,
  );

module.exports = withNativeWind(config, { input: "./global.css" });
