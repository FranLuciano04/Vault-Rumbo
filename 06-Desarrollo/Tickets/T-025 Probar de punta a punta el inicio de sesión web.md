---
id: T-025
titulo: Probar de punta a punta el inicio de sesión web
modulo: M0 — Fundaciones
capa: e2e
estado: libre
depende_de: [T-021, T-016, T-017, T-024, T-018]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-24, RF-140, RF-142, RF-143]
origen: plan
asignado:
tomado_el:
rama:
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
