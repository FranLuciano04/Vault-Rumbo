---
id: T-095
titulo: Revertir un cobro registrado por error
modulo: M6 — Viajes y economía
capa: backend
estado: tomado
depende_de: [T-094]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-12, RF-070]
origen: plan
asignado: FranLucianoo
tomado_el: 30/10/26 11:46
rama: feature/T-095-revertir-un-cobro-registrado-por-error
pr:
---
# T-095 Revertir un cobro registrado por error

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Un cobro cargado por error se revierte: el pago vuelve a pendiente o vencido, su alerta se reabre y el viaje retrocede si el cobro lo había hecho avanzar.

## Criterios de aceptación
- [ ] `POST /pagos/{id}/revertir-cobro` sobre un pago `pagado`; sobre otro estado → 409.
- [ ] Si el viaje estaba `confirmado` por saldo cero vuelve a `vendido`; si era el único cobro, vuelve a `reservado` (A3).
- [ ] La alerta del pago se reabre.

## Tests esperados
`tests/api/test_cobros.py`: `test_rf070_revertir`, `test_rf070_vuelve_a_vendido`, `test_rf070_unico_cobro_vuelve_a_reservado`, `test_rf070_reabre_alerta`.

## Contexto (leer solo esto)
- [[CU-12 Registrar cobro de un pago]] — A3
- [[EST-Pago]]
- [[EST-Viaje]]

## Archivos probables
- `src/backend/rumbo/negocio/servicios/economia.py`

## Fuera de alcance
- —

## Notas de implementación
