---
id: T-093
titulo: Ajustar los pagos de un plan ya definido
modulo: M6 — Viajes y economía
capa: backend
estado: hecho
depende_de: [T-092]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-11, RF-065, RF-066, RF-153]
origen: plan
asignado: palomap2003
tomado_el: 30/10/26 14:48
rama: feature/T-093-ajustar-los-pagos-de-un-plan-ya-definido
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
- **Decisiones del verde:**
  - en un viaje cancelado o finalizado, las tres operaciones dan 409, como el PUT del plan;
  - reprogramar a una fecha pasada deja el pago `vencido`, y el resto de una división con vencimiento pasado nace `vencido`, por el fix;
  - el pago nuevo de una división hereda el tipo, y el original conserva su vencimiento y su alerta;
  - al reprogramar se mueven las alertas pendientes y vistas, sin duplicarse;
  - en dividir se valida primero el estado (409) y después el monto (422).
- **Tests tocados con autorización de Paloma:** en el verde, `test_dividir_cuota` leía el usuario después de `expire_all()` (`MissingGreenlet`); se guarda antes, sin cambiar aserciones. En el fix solo se agregaron 5 tests.
- **Fix:** un vencimiento en el año 1 hacía fallar `sumar_meses` con un 500 en el PUT del plan, en reprogramar y en dividir; ahora da 422 sobre el campo.
- **Menores pendientes:**
  - una alerta `vista` que se mueve de fecha sigue `vista`; es una decisión de producto;
  - la alerta del pago original de una división conserva su descripción, lo cual hoy es correcto porque no lleva el monto;
  - el PUT del plan sigue creando `pendiente` los pagos con vencimiento pasado; para alinearlo con la regla nueva hay que decidirlo con el equipo.
- **Modelos:** tests sonnet, implementación y fix opus, refactor opus (sin cambios), review sonnet (`reviewer-seguridad`).
