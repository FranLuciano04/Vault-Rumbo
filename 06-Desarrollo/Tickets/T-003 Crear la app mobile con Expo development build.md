---
id: T-003
titulo: Crear la app mobile con Expo development build
modulo: M0 — Fundaciones
capa: infra
estado: libre
depende_de: [T-002]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0001, DEC-0015, DEC-0016]
origen: plan
asignado:
tomado_el:
rama:
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
