---
id: T-099
titulo: Cancelar un viaje con su reversión
modulo: M6 — Viajes y economía
capa: backend
estado: libre
depende_de: [T-094, T-051]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-27, RF-048, RF-049, RF-050, RF-051, RF-052, RF-053, RF-153]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-099 Cancelar un viaje con su reversión

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se cancela un viaje no finalizado: se anulan sus pagos pendientes, se cierran sus alertas, se registra el efecto sobre la comisión y se informan los cobros ya hechos; la cancelación se puede revertir.

## Criterios de aceptación
- [ ] `POST /viajes/{id}/cancelar` aplica EST-Viaje; un viaje `finalizado` → 409 (A1); uno `en_curso` según A4.
- [ ] Anula los pagos pendientes, cierra las alertas (`cerrada_por_cancelacion`), registra el efecto sobre la comisión (RF-051) e informa los cobros registrados (A2, RF-052).
- [ ] `POST /viajes/{id}/revertir-cancelacion` restaura el estado, los pagos y las alertas cerrados por la cancelación (A3).

## Tests esperados
`tests/api/test_cancelacion.py`: `test_rf048_cancelar`, `test_rf049_finalizado_409`, `test_rf050_anula_pagos_y_cierra_alertas`, `test_rf051_comision`, `test_rf052_informa_cobros`, `test_rf053_revertir`.

## Contexto (leer solo esto)
- [[CU-27 Cancelar viaje]]
- [[EST-Viaje]]
- [[EST-Pago]]
- [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]]
- Contrato: `src/packages/shared/openapi.json` (módulo `viajes`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/viajes.py`
- `src/backend/rumbo/presentacion/routers/viajes.py`

## Fuera de alcance
- Reintegros de dinero (fuera de alcance).

## Notas de implementación
- **De la review de T-051 (25/10/26):** las alertas de los Pagos anulados están ligadas por `pago_id`, no por `viaje_id`.
  - Al cancelar (CU-27, paso 4), llamá a `servicios.alertas.resolver_de_origen(sesion, origen, por_cancelacion=True)` una vez por el Viaje y otra por cada Pago anulado.
  - Al revertir (A3), llamá a `reabrir_de_origen(sesion, origen, solo_por_cancelacion=True)` con los mismos orígenes, así no vuelven las alertas resueltas por otro motivo.
