---
id: T-143
titulo: Cubrir con tests el layout raíz de la app mobile
modulo: M0 — Fundaciones
capa: mobile
estado: hecho
depende_de: [T-003]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0015, RNF-15]
origen: hallazgo T-018
asignado: Nahuel Viniegra
tomado_el: 20/10/26 17:11
rama: feature/T-143-cubrir-con-tests-el-layout-raiz-de-la-ap
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
- **Desvío del flujo:** el ticket cubre con tests de caracterización un código que ya existía. Por eso no hubo rojo (la fase se corrió sin `--test`, como en e2e) ni verde.
  - Para que los tests no fueran vacíos, se hizo una prueba de mutación: con `headerShown: true` fallan 2 de los 4 tests.
  - La primera versión no detectaba el header y se reescribió.
- Hecho: `__tests__/layout.test.tsx` usa `renderRouter` con el `LayoutRaiz` real.
  - El header se detecta por la prop `hidden` de `RNSScreenStackHeaderConfig`, de react-native-screens 4.30.0. Ante un upgrade hay que revisar ese nombre.
  - `global.css` se mockea en el test.
- Cobertura de mobile: 100 %, antes 50 %. Lint y typecheck pasan.
- Review con opus: 0 bloqueantes, 0 importantes y 2 menores. Se arregló el comentario sobre la dependencia. Queda como menor que el test de navegación prueba sobre todo a expo-router.
- Modelos: tests y fix con sonnet; review con opus.
