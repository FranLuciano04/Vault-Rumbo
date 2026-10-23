// `@rumbo/shared` trae su propia copia de React y de TanStack Query (las de la web): se fuerzan las
// de la app para que haya una sola instancia de React, como hace `metro.config.js` en el bundle.
const UNA_SOLA_COPIA = ["react", "@tanstack/react-query"];

module.exports = {
  preset: "jest-expo",
  // El primer `renderRouter("./app")` de cada archivo carga dentro del test la entrada completa de
  // expo-router (~4 s con la caché fría) más el SDK de Firebase de `src/lib/firebase.ts` (~1,5 s):
  // en CI, que corre en frío, el primer test de navegación tarda 6-10 s y excedía los 5 s por defecto.
  testTimeout: 20000,
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
