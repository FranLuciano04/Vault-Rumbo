---
id: T-111
titulo: Vencer pagos y cotizaciones en el proceso diario
modulo: M7 — Proceso diario y CRM proactivo
capa: backend
estado: libre
depende_de: [T-110, T-088, T-067]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-06, CU-12, RF-026]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-111 Vencer pagos y cotizaciones en el proceso diario

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada noche, los pagos pendientes con fecha pasada pasan a `vencido` y las cotizaciones enviadas sin respuesta y fuera de vigencia pasan a `vencida`.

## Criterios de aceptación
- [ ] Paso de vencimiento de pagos según EST-Pago.
- [ ] Paso de vencimiento de cotizaciones según EST-Cotización (RF-026, CU-06 A5).
- [ ] Idempotente: correrlo dos veces no cambia nada más.

## Tests esperados
`tests/negocio/test_jobs_vencimientos.py`: `test_vence_pago_pendiente`, `test_rf026_vence_cotizacion_enviada`, `test_no_toca_pagados`, `test_idempotente`.

## Contexto (leer solo esto)
- [[EST-Pago]]
- [[EST-Cotización]]
- [[CU-06 Emitir cotización]] — A5
- [[CU-12 Registrar cobro de un pago]] — A1

## Archivos probables
- `src/backend/rumbo/negocio/servicios/proceso_diario.py`

## Fuera de alcance
- —

## Notas de implementación
