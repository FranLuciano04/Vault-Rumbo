---
id: T-104
titulo: Registrar el cobro de un pago en la web
modulo: M6 — Viajes y economía
capa: web
estado: libre
depende_de: [T-103]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-12, RF-067, RF-068, RF-070, RF-071]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-104 Registrar el cobro de un pago en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se registra el cobro de un pago (forma de pago, moneda y tipo de cambio) y se revierte un cobro cargado por error; la ficha refleja el nuevo saldo y estado.

## Criterios de aceptación
- [ ] Diálogo de cobro del prototipo con forma de pago y moneda.
- [ ] Revertir cobro con confirmación.
- [ ] Saldo y estado del viaje actualizados tras la operación.

## Tests esperados
`describe('RF-067 cobro')`, `describe('RF-068 otra moneda')`, `describe('RF-070 revertir')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 18 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-12 Registrar cobro de un pago]]

## Archivos probables
- `src/apps/web/src/features/viajes/plan/`

## Fuera de alcance
- —

## Notas de implementación
