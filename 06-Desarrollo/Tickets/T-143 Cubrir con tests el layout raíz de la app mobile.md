---
id: T-143
titulo: Cubrir con tests el layout raíz de la app mobile
modulo: M0 — Fundaciones
capa: mobile
estado: libre
depende_de: [T-003]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0015, RNF-15]
origen: hallazgo T-018
asignado:
tomado_el:
rama:
pr:
---
# T-143 Cubrir con tests el layout raíz de la app mobile

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La app mobile alcanza el umbral de cobertura del CI (≥ 70 %), así el job Mobile de T-018 deja de estar en rojo. Hoy la cobertura es 50 %, porque `src/apps/mobile/app/_layout.tsx` está en 0 % y hay un solo test.

## Criterios de aceptación
- [ ] `_layout.tsx` tiene tests que verifican lo que renderiza hoy: las pantallas que registra y el proveedor o tema que aplique.
- [ ] `pnpm --filter @rumbo/mobile test:cobertura` con `--coverageThreshold` global de 70 %, igual que en el CI, sale con código 0.

## Tests esperados
Tests de render con la librería de testing que ya usa mobile. No se cambia el comportamiento de `_layout.tsx`: si un test necesita un cambio de código, el implementador lo justifica.

## Contexto (leer solo esto)
- [[Spec de implementación]] §4 (comandos y umbrales de mobile)
- `.github/workflows/ci.yml`, job `mobile` (comando exacto de cobertura)

## Archivos probables
- `src/apps/mobile/app/_layout.tsx`
- `src/apps/mobile/__tests__/…`

## Fuera de alcance
- El shell con pestañas (T-022). Si T-022 se hace antes y reescribe `_layout.tsx`, este ticket cubre el layout que quede.

## Notas de implementación
- **Origen:** lo decidió Nahuel en T-018: el umbral de mobile se mantiene en 70 % y el test faltante va en un ticket aparte.
