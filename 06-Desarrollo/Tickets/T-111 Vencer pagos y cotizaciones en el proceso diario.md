---
id: T-111
titulo: Vencer pagos y cotizaciones en el proceso diario
modulo: M7 — Proceso diario y CRM proactivo
capa: backend
estado: hecho
depende_de: [T-110, T-088, T-067]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-06, CU-12, RF-026]
origen: plan
asignado: palomap2003
tomado_el: 03/11/26 19:04
rama: feature/T-111-vencer-pagos-y-cotizaciones-en-el-proces
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
- Dos pasos en `proceso_diario.PASOS`, «vencimiento de pagos» (`economia.vencer_pagos`) y «vencimiento de cotizaciones» (`oportunidades.vencer_cotizaciones`), que corren antes del recontacto. Cada uno devuelve «N … vencidos» o `None`.
- Las consultas de los repositorios (`pendientes_vencidos_para_modificar` y `enviadas_vencidas_para_modificar`) bloquean con `FOR UPDATE` y usan `populate_existing`, sin filtro de visibilidad porque el proceso no tiene actor. No se exponen a un endpoint. El estado cambia fila por fila por las máquinas de estado: la nueva `estado_cotizacion.vencer` (T5) y la `estado_pago.vencer`, que ya existía. La auditoría queda con `updated_by` en `None`.
- Borde estricto: el día del vencimiento o el último día de vigencia todavía no vence. No se tocan la `Alerta` del pago (EST-Pago T3) ni la `Oportunidad` (EST-Cotización T5).
- El refactor no cambió nada. El fix solo aplicó el formato de ruff al test (`--tocar-tests`, un cambio mecánico).
- Menores de la review que quedan anotados: (1) los pasos cargan todas las filas vencidas sin paginar, aceptable para el volumen de una PyME; si crece, procesarlas en lotes con `LIMIT`. (2) Ningún test cubre la concurrencia ni que `updated_by` quede en `None`.
- Fuera del ticket: EST-Cotización se contradice sobre si la vigencia por defecto de 1 mes está validada (§63 contra §44 y §98). Hay que corregirla en el vault.
- Modelos: tests con sonnet, implementación y refactor con opus, review de seguridad con sonnet. No hubo escalados.
