---
id: T-093
titulo: Ajustar los pagos de un plan ya definido
modulo: M6 — Viajes y economía
capa: backend
estado: libre
depende_de: [T-092]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-11, RF-065, RF-066, RF-153]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-093 Ajustar los pagos de un plan ya definido

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Un pago no cobrado se reprograma, se anula (baja lógica) o se divide para cobrar una parte, manteniendo el plan cuadrado y sus alertas al día.

## Criterios de aceptación
- [ ] `PATCH /pagos/{id}` reprograma el vencimiento y mueve su alerta (A3); uno cobrado → 409.
- [ ] `POST /pagos/{id}/anular` lo anula y resuelve su alerta; el plan queda desbalanceado hasta rebalancear (A4).
- [ ] `POST /pagos/{id}/dividir` lo parte en dos pagos que suman lo mismo, cada uno con su alerta (A6).

## Tests esperados
`tests/api/test_plan_pagos.py`: `test_rf065_reprogramar`, `test_rf065_reprogramar_cobrado_409`, `test_rf066_anular`, `test_dividir_cuota`.

## Contexto (leer solo esto)
- [[CU-11 Definir plan de cuotas]] — A3, A4 y A6
- [[EST-Pago]]
- Contrato: `src/packages/shared/openapi.json` (módulo `economia`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/economia.py`
- `src/backend/rumbo/presentacion/routers/economia.py`

## Fuera de alcance
- —

## Notas de implementación
