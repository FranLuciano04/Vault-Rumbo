---
id: T-108
titulo: Probar de punta a punta el circuito de CU-01
modulo: M6 — Viajes y economía
capa: e2e
estado: libre
depende_de: [T-089, T-090, T-094, T-091, T-096, T-097, T-101, T-104, T-106, T-105, T-074, T-085]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-01, RF-001, RF-010, RF-021, RF-032, RF-034, RF-035, RF-054, RF-060, RF-067, RF-101]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-108 Probar de punta a punta el circuito de CU-01

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
**Meta mínima del PC2:** una persona hace en la web el circuito completo de CU-01 contra el sistema real, con permisos por rol, y la prueba pasa en el CI.

## Criterios de aceptación
- [ ] Cliente → consulta → cotización aceptada → reserva (destino con requisitos genera sus alertas, A3) → economía → plan de cuotas (A2) → cobros → viaje `confirmado`.
- [ ] El mismo circuito respeta la visibilidad: un `freelance` no ve el viaje de otro vendedor.
- [ ] El test corre en el job e2e del CI; la semilla de demo suma viajes ficticios en distintos estados.

## Tests esperados
`e2e/cu01.spec.ts`: `CU-01 de la consulta a la venta` paso a paso, nombrado por RF en cada `test.step`.

## Contexto (leer solo esto)
- [[CU-01 De la consulta a la venta]]
- [[Spec de implementación]] §9 (meta del PC2)

## Archivos probables
- `src/apps/web/e2e/cu01.spec.ts`
- `src/backend/rumbo/datos/semillas/viajes.py`

## Fuera de alcance
- Excepciones del viaje (ticket e2e propio).

## Notas de implementación
- **Del plan:** el test arma sus propios datos por API o con las semillas que ya existan (por ejemplo, un destino con requisitos), así no depende de los e2e de M1 ni de M3. Es la prioridad del PC2: si falta tiempo, se trabajan primero los 79 tickets de los que depende este (ver [[Plan de implementación]]).
