---
id: T-003
titulo: Crear la app mobile con Expo development build
modulo: M0 — Fundaciones
capa: infra
estado: hecho
depende_de: [T-002]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0001, DEC-0015, DEC-0016]
origen: plan
asignado: palomap2003
tomado_el: 19/10/26 19:49
rama: feature/T-003-crear-la-app-mobile-con-expo-development
pr:
---
# T-003 Crear la app mobile con Expo development build

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existe `src/apps/mobile` como app Expo con **development build** (no Expo Go), Expo Router, NativeWind y TypeScript estricto, integrada al workspace pnpm, con Jest + RN Testing Library.

## Criterios de aceptación
- [ ] `pnpm --filter @rumbo/mobile start` arranca el dev server y `pnpm --filter @rumbo/mobile test` corre un test de humo.
- [ ] Expo Router y NativeWind configurados; `typecheck` y `lint` pasan.
- [ ] Queda documentado en `src/apps/mobile/README.md` cómo generar e instalar el development build en un emulador o teléfono.

## Tests esperados
No sigue TDD (`infra`). Se verifica ejecutando los scripts y generando el development build una vez.

## Contexto (leer solo esto)
- [[Spec de implementación]] §3, §4 y §5
- [[DEC-0015 Decisiones de implementación|DEC-0015]] — §5 (NativeWind + Expo Router)
- [[DEC-0016 Autenticación con Firebase|DEC-0016]] — por qué development build

## Archivos probables
- `src/apps/mobile/`

## Fuera de alcance
- Login y pantallas (tickets propios). El SDK de Firebase lo suma el ticket de login mobile.

## Notas de implementación
- **19-20/10 (Paloma):**
  - **Versiones.** Expo SDK 58 (`expo` 58.0.16), RN 0.88.0, React 19.3.0 (la web usa ^19.3.1; no se duplica React en mobile) y NativeWind 4.2.7 con Tailwind 3.4.19. Todas son exactas y salen de `bundledNativeModules.json`. `react-native-css-interop` es dependencia directa porque pnpm no resolvía la transitiva. Los tests van en `__tests__/`, porque todo lo que está en `app/` es ruta de Expo Router.
  - **Development build verificado en el emulador Pixel_7.** Se instala `ar.com.rumbo.mobile`, carga el bundle desde Metro y muestra «Rumbo» con NativeWind aplicado.
  - **Windows.** Hacen falta `LongPathsEnabled=1` y CMake 3.31.6 (ninja 1.12), con `cmake.dir` en `android/local.properties`. Las rutas de `.cxx` de pnpm llegan a 282 caracteres, y el ninja 1.10 de CMake 3.22 falla con «build.ninja still dirty». `subst` no sirve, porque pnpm resuelve la ruta real. Está en el README.
  - **Bug encontrado al generar el build.** La pantalla salía negra porque faltaba `expo-splash-screen`: el dev client no podía ocultar el splash. Se agregó como dependencia y como plugin. No tiene test: la falla es del render nativo y jest no la reproduce.
  - **Review (Opus).** 0 bloqueantes, 0 importantes y 5 menores, todos arreglados.
  - **Modelos.** Implementación y fixes con Sonnet; review con Opus. Sin escalados.
  - **Queda para el equipo.** Cuando se arme el CI, `pnpm install --frozen-lockfile` va a salir con `ERR_PNPM_IGNORED_BUILDS` (`msw`, `@parcel/watcher`, `unrs-resolver`): hay que decidir `approve-builds` o `allowBuilds`. EAS no se configuró.
