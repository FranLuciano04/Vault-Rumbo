---
id: T-092
titulo: Definir el plan de pagos del viaje
modulo: M6 — Viajes y economía
capa: backend
estado: hecho
depende_de: [T-090, T-088, T-051]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-11, RF-060, RF-061, RF-062, RF-063, RF-064, RF-059]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 29/10/26 19:01
rama: feature/T-092-definir-el-plan-de-pagos-del-viaje
pr:
---
# T-092 Definir el plan de pagos del viaje

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se define (o rebalancea) el plan de pagos del viaje: seña, cuotas y saldo que suman exactamente el precio de venta, cada pago `pendiente` con su alerta de vencimiento.

## Criterios de aceptación
- [ ] `PUT /viajes/{id}/pagos` crea los pagos `pendiente`; si la suma no iguala el precio de venta → 422 (A1, RF-061).
- [ ] Cada pago genera su alerta `pago` de vencimiento (RF-063); un solo pago es válido (A2, RF-064).
- [ ] Rebalancear reemplaza los pagos no cobrados y sus alertas, y respeta los ya cobrados (A5).

## Tests esperados
`tests/api/test_plan_pagos.py`: `test_rf060_definir_plan`, `test_rf061_suma_distinta_422`, `test_rf062_pagos_pendientes`, `test_rf063_alerta_por_pago`, `test_rf064_pago_unico`, `test_rf059_rebalancear_respeta_cobrados`. `GET /viajes/{id}/pagos` con el checklist.

## Contexto (leer solo esto)
- [[CU-11 Definir plan de cuotas]] — flujo principal, A1, A2 y A5
- [[EST-Pago]]
- Contrato: `src/packages/shared/openapi.json` (módulo `economia`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/economia.py`
- `src/backend/rumbo/presentacion/routers/economia.py`

## Fuera de alcance
- Reprogramar, anular y dividir (ticket propio).

## Notas de implementación
- Rebalancear **anula** (no borra) los pagos `pendiente`/`vencido` y resuelve sus alertas `pago` (EST-Pago T5/T8). La suma que tiene que cerrar con `precio_venta` es cobrados + nuevos (A1/A5), validada antes de modificar nada.
- Alerta de cada pago: un mes antes del vencimiento (`sumar_meses(vencimiento, -1)`), en la agenda del responsable del viaje. Viaje cancelado o finalizado → 409.
- Tests corregidos con autorización de la persona (`--tocar-tests`): `test_rf059_rebalancear_respeta_cobrados` guardaba `viejo.id` después de `expire_all()` (`MissingGreenlet`); `test_contrato_m6.py` saca GET/PUT `/viajes/{id}/pagos` de los stubs 501.
- Review (seguridad): importante arreglado — monto 0 daba 500 por `CheckConstraint("monto > 0")`; ahora 422 en el servicio, con `test_rf061_monto_cero_422`. Menores sin arreglar: (1) un pago con vencimiento pasado nace `pendiente` y no `vencido` (falta decidir si se rechaza o lo corrige el proceso diario); (2) el 409 de `PUT /pagos` no está declarado en el OpenAPI (ticket de contrato).
- Modelos: tests sonnet, implementación/refactor/fix opus, review sonnet. Sin escalados.
