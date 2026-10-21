import { defineConfig, devices } from "@playwright/test";
import { URL_BASE } from "./e2e/compose";

// E2e web (T-025): el navegador entra por nginx del Compose de e2e (web + API + Postgres +
// Auth Emulator). El setup global lo levanta y la baja al terminar (ver e2e/compose.ts).

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  // Comparten una sola base y un emulador: en serie y sin paralelismo.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  use: {
    baseURL: URL_BASE,
    locale: "es-AR",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
