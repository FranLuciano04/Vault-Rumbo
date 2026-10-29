---
id: T-088
titulo: Implementar los estados del pago
modulo: M6 — Viajes y economía
capa: backend
estado: tomado
depende_de: [T-007, T-009]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-11, CU-12, RF-066, RF-067, RF-070]
origen: plan
asignado: palomap2003
tomado_el: 29/10/26 16:05
rama: feature/T-088-implementar-los-estados-del-pago
pr:
---
# T-088 Implementar los estados del pago

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
`negocio/estados/pago.py` aplica EST-Pago: cobrar un pago pendiente o vencido, revertir el cobro, anular y vencer.

## Criterios de aceptación
- [ ] Transiciones de EST-Pago implementadas; las inválidas (cobrar uno anulado o pagado, anular uno pagado) lanzan `TransicionInvalida`.
- [ ] Revertir un cobro vuelve a `pendiente` o `vencido` según la fecha.
- [ ] Vencer solo aplica a pendientes con fecha pasada.

## Tests esperados
`tests/negocio/test_estados_pago.py`: una prueba por transición válida e inválida.

## Contexto (leer solo esto)
- [[EST-Pago]]
- [[CU-11 Definir plan de cuotas]]
- [[CU-12 Registrar cobro de un pago]]

## Archivos probables
- `src/backend/rumbo/negocio/estados/pago.py`

## Fuera de alcance
- El plan de pagos y los cobros (tickets propios).

## Notas de implementación
