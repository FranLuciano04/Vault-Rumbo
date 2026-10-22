// `@rumbo/shared` trae su propia copia de React y de TanStack Query (las de la web): se fuerzan las
// de la app para que haya una sola instancia de React, como hace `metro.config.js` en el bundle.
const UNA_SOLA_COPIA = ["react", "@tanstack/react-query"];

module.exports = {
  preset: "jest-expo",
  setupFiles: [
    "./jest.setup.js",
    // Mock oficial del módulo nativo de Google Sign-In.
    "<rootDir>/node_modules/@react-native-google-signin/google-signin/jest/build/jest/setup.js",
  ],
  moduleNameMapper: Object.fromEntries(
    UNA_SOLA_COPIA.map((paquete) => [`^${paquete}$`, require.resolve(paquete)]),
  ),
  collectCoverageFrom: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}", "!**/*.test.{ts,tsx}"],
};
