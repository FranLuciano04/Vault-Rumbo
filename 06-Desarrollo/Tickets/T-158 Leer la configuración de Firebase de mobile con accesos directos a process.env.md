---
id: T-158
titulo: Leer la configuración de Firebase de mobile con accesos directos a process.env
modulo: M0 — Fundaciones
capa: mobile
estado: hecho
depende_de: []
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-24, RF-140, DEC-0016]
origen: review-codex M0
asignado: Nahuel Viniegra
tomado_el: 23/10/26 17:06
rama: feature/T-158-leer-la-configuracion-de-firebase-de-mob
pr:
---
# T-158 Leer la configuración de Firebase de mobile con accesos directos a process.env

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La app mobile arranca Firebase Auth con la configuración real del `.env`: API key, dominio, proyecto, app ID, URL del emulador y cliente web de Google. Hoy `src/lib/firebase.ts` lee las variables a través de un alias (`const entorno = process.env`), y el transformador de Expo solo incorpora al bundle los accesos literales `process.env.EXPO_PUBLIC_*`. Por eso Firebase recibe todo `undefined` y no se puede iniciar sesión (hallazgo H-01 de [[M0 — review Codex]]).

## Criterios de aceptación
- [ ] Cada variable se lee con un acceso directo `process.env.EXPO_PUBLIC_<NOMBRE>`, sin alias ni acceso dinámico. No queda ningún `EXPO_PUBLIC_*` de la app leído de otra forma.
- [ ] Un test pasa `src/lib/firebase.ts` por `babel-preset-expo` y verifica que se reconozcan las seis variables: aparecen en `metadata.publicEnvVars` o se reemplazan por su valor en modo producción. Ese test falla con el código actual.
- [ ] Los tests existentes de `__tests__/firebase.test.ts` y del login siguen pasando.

## Tests esperados
- `describe("RF-140 configuración de Firebase en el bundle")`: transformar el módulo con Babel y el preset de Expo (caller `metro`) y comprobar las seis claves: `EXPO_PUBLIC_FIREBASE_API_KEY`, `…_AUTH_DOMAIN`, `…_PROJECT_ID`, `…_APP_ID`, `…_AUTH_EMULATOR_URL` y `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
- Que `initializeApp` reciba los valores definidos en el entorno del test, sin mockear la lectura de las variables.

## Contexto (leer solo esto)
- [[M0 — review Codex]] — H-01 y su triage
- [[CU-24 Iniciar sesión]] — flujo principal en mobile
- `src/apps/mobile/src/lib/firebase.ts`
- `src/apps/mobile/.env.example`
- Plugin de referencia: `babel-preset-expo/build/plugins/inline-env-vars.js` (en `src/node_modules/.pnpm/`)

## Archivos probables
- `src/apps/mobile/src/lib/firebase.ts`
- `src/apps/mobile/__tests__/firebase.test.ts` (o un test nuevo de la transformación)

## Fuera de alcance
- Cambiar la forma de iniciar sesión o la persistencia.
- La web: Vite reemplaza `import.meta.env` de otra manera.

## Notas de implementación
- `src/lib/firebase.ts` lee las seis variables como `process.env.EXPO_PUBLIC_*` literales. El alias existía porque `process.env` quedaba tipado como `any`: se sumó `"expo/types"` a `types` del `tsconfig` de mobile, y eso permitió sacar también el cast de `EXPO_PUBLIC_API_URL` en `src/cliente.ts`.
- Tests: `__tests__/firebase-env.test.ts` transforma el módulo con `babel-preset-expo` (caller `metro`). Comprueba `publicEnvVars`, el reemplazo en producción y que no haya alias. `@babel/core` y el preset se resuelven desde `jest-expo` con `createRequire`, porque no son dependencias directas. `__tests__/firebase-config.test.ts` pasaba ya en el rojo: Jest no aplica el inline de Metro, así que queda como guarda de regresión.
- Se agregó `@types/node` como devDependency. Sus tipos se cargan solo en el test, con `/// <reference types="node" />`, para no sumar los globales de Node a la app.
- Review (Sonnet, `reviewer-seguridad`): sin fallas de seguridad. 2 importantes de lint en el test y 2 menores (`"node"` en el tsconfig de la app y restaurar solo las claves de `process.env`); los cuatro se arreglaron, con autorización para tocar el test.
- Prettier marca `__tests__/firebase.test.ts` y `__tests__/login.test.tsx`, que ya venían así de antes y no se tocaron.
- Modelos: tests con Sonnet; implementación, refactor (sin cambios) y fix con Opus; review con Sonnet. Sin escalados.
