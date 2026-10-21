---
id: T-022
titulo: Armar el shell mobile con sus pestañas
modulo: M0 — Fundaciones
capa: mobile
estado: hecho
depende_de: [T-015, T-003]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [RNF-14, CU-24]
origen: plan
asignado: FranLucianoo
tomado_el: 21/10/26 17:28
rama: feature/T-022-armar-el-shell-mobile-con-sus-pestanas
pr:
---
# T-022 Armar el shell mobile con sus pestañas

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La app mobile tiene la navegación del prototipo con las pestañas Agenda, Clientes y Más, el tema con los tokens del Figma y la guarda de sesión que manda al login.

## Criterios de aceptación
- [ ] Expo Router con los grupos `(auth)` y `(pestanas)` y pantallas placeholder para agenda, clientes y más.
- [ ] El tema de NativeWind reproduce los tokens del sistema de diseño.
- [ ] Sin sesión, la app abre el login; con sesión, la agenda.

## Tests esperados
`describe('navegación mobile')`: con y sin sesión (mock de `/auth/yo`), las pestañas visibles.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 35, 57, 59 (PNG en `07-Entregables/Prototipo/img/`)
- [[Prototipo UI]] — «Sistema de diseño» y «Mobile completo»

## Archivos probables
- `src/apps/mobile/app/`
- `src/apps/mobile/tailwind.config.js`

## Fuera de alcance
- El login y el contenido de cada pestaña.

## Notas de implementación
- **Implementación (21/10/26, Francisco):**
  - Expo Router con `(auth)/login` y `(pestanas)/{agenda,clientes,mas}` como placeholders. `app/index.tsx` es un `<Redirect href="/agenda" />`.
  - La guarda en `(pestanas)/_layout.tsx` usa `useYo`:
    - mientras carga, muestra «Cargando…»;
    - con un 401, va a `/login`;
    - con cualquier otro error, muestra «No pudimos verificar tu sesión» y no muestra las pestañas.
  - `BotonPestana` usa `role="tab"`, con la píldora `bg-secondary` en la pestaña activa.
  - El tema en `tailwind.config.js` usa los tokens hex de la web y Plus Jakarta Sans. `src/cliente.ts` lee `EXPO_PUBLIC_API_URL`, documentada en el README y en `.env.example` (`10.0.2.2` en el emulador de Android). `obtenerToken` devuelve `null` hasta el ticket del login mobile.
  - Dependencias nuevas: `@rumbo/shared` (workspace) y `@tanstack/react-query`.
- **Desvíos:**
  - Las pestañas no tienen íconos, porque mobile todavía no tiene librería de íconos.
  - Se borró `inicio.test.tsx` (humo de T-003), que quedó obsoleto con el `Redirect`. El caso `/` lo cubre `navegacion.test`. Se hizo con autorización del orquestador (`--tocar-tests`).
- **Review (Opus):** 0 bloqueantes, 2 importantes y 5 menores, todos arreglados en el fix:
  - la guarda fallaba abierta con errores que no eran 401;
  - el efecto con `isReady()` se reemplazó por `<Redirect>`;
  - se quitó el override amplio de eslint;
  - los mocks ya no son virtuales;
  - se sacó `axios`;
  - se documentó la URL de la API;
  - la trazabilidad del test de tema pasó a RNF-14.
- **Verificación:** 13 tests, con una cobertura del 82,6 %. Lint y typecheck pasan. `expo export --platform android` genera el bundle, así que Metro resuelve `@rumbo/shared`. No se probó en un dispositivo.
- **Incidente:** `tickets.mjs fase` hace `git add -A` y se coló un cambio local de `.obsidian/app.json`. Se restauró en un commit aparte, sin reescribir la historia.
- **Modelos:** tests, verde, refactor y fix con Sonnet; review con Opus. No hubo escalados.
