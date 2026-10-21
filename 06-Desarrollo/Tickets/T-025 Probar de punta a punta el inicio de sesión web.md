---
id: T-025
titulo: Probar de punta a punta el inicio de sesión web
modulo: M0 — Fundaciones
capa: e2e
estado: hecho
depende_de: [T-021, T-016, T-017, T-024, T-018]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-24, RF-140, RF-142, RF-143]
origen: plan
asignado: FranLucianoo
tomado_el: 21/10/26 16:30
rama: feature/T-025-probar-de-punta-a-punta-el-inicio-de-ses
pr:
---
# T-025 Probar de punta a punta el inicio de sesión web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Playwright prueba el inicio y el cierre de sesión contra el Compose con el Auth Emulator, y el CI corre los e2e en cada PR que toca código.

## Criterios de aceptación
- [ ] Playwright configurado en `apps/web/e2e` con un setup global que levanta el Compose de e2e y corre `datos-iniciales`.
- [ ] Pasan: login de la dueña con email, credenciales inválidas, usuario no habilitado y cierre de sesión.
- [ ] El CI tiene un job e2e que corre cuando cambian `src/`.

## Tests esperados
`e2e/seguridad.spec.ts`: `RF-140 la dueña inicia sesión`, `RF-142 credenciales inválidas`, `RF-142 usuario no habilitado`, `RF-143 cierra la sesión`.

## Contexto (leer solo esto)
- [[CU-24 Iniciar sesión]]
- [[Spec de implementación]] §6 (E2e web)

## Archivos probables
- `src/apps/web/playwright.config.ts`
- `src/apps/web/e2e/`
- `.github/workflows/ci.yml`

## Fuera de alcance
- Google en e2e (se prueba a mano); la app mobile (prueba manual en la barrera).

## Notas de implementación
- **Implementación (21/10/26, Francisco):**
  - Playwright está en `src/apps/web/e2e/`. `compose.ts` levanta `docker-compose.yml` + `docker-compose.e2e.yml` como proyecto propio `rumbo-e2e`, en el puerto 8081 (`E2E_HTTP_PORT`). Así no toca la demo local: ni su base, ni sus imágenes, ni su puerto.
  - El setup da de alta en el emulador la cuenta de la dueña y una sin alta, y corre `datos-iniciales --demo`. El teardown hace `down -v`. Con `E2E_MANTENER=1` el stack queda arriba para depurar.
  - En el CI se sumó el job `e2e`: corre cuando cambia `src/`, entra en «CI ok» y, si falla, sube los logs del Compose y el informe de Playwright.
  - Para convivir con Vitest y tsc: Vitest excluye `e2e/**`, y `tsconfig` suma `node` y los archivos de e2e.
- **Verificación:** 4/4 e2e en Windows contra el Compose real, en cuatro corridas, una de ellas en frío. Pasan los 46 tests de Vitest, lint y typecheck. El job del CI se prueba por primera vez en el PR.
- **Review (Opus):** 0 bloqueantes, 2 importantes y 2 menores, todos arreglados en el fix:
  - el proyecto Compose propio;
  - el puerto definido en un solo lugar;
  - los logs del CI cuando falla un test;
  - la limpieza si falla el setup.
- **Quedan anotados:**
  - El puerto 9099 del Auth Emulator es fijo, así que dos corridas e2e simultáneas en la misma máquina chocarían.
  - Docker Desktop en Windows a veces corta el primer `fetch` al emulador. Hay un reintento de hasta 60 s.
- **Modelos:** tests y fix con Sonnet, review con Opus. No hubo verde: los e2e no destaparon bugs del sistema.
