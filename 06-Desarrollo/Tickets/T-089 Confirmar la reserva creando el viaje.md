---
id: T-089
titulo: Confirmar la reserva creando el viaje
modulo: M6 — Viajes y economía
capa: backend
estado: tomado
depende_de: [T-086, T-087, T-064, T-032, T-051, T-029]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-07, RF-032, RF-033, RF-034, RF-035, RF-036, RNF-05]
origen: plan
asignado: palomap2003
tomado_el: 30/10/26 09:35
rama: feature/T-089-confirmar-la-reserva-creando-el-viaje
pr:
---
# T-089 Confirmar la reserva creando el viaje

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Al confirmar la reserva de una oportunidad aceptada (o de una venta directa) se crea el viaje `reservado` con sus alertas de requisitos del destino y de próxima salida, en una sola transacción.

## Criterios de aceptación
- [ ] `POST /oportunidades/{id}/confirmar-reserva` exige destino y fechas (422, A3) y una oportunidad en un estado que lo admite (409); crea el viaje y gana la oportunidad (A1 venta directa).
- [ ] Genera una alerta por cada requisito activo del destino con su anticipación (RF-034; sin requisitos, ninguna, A2) y la alerta de salida según `anticipacion_salida_dias` (RF-035).
- [ ] Todo en una transacción: si algo falla, no queda viaje ni alertas (RNF-05).

## Tests esperados
`tests/api/test_confirmar_reserva.py`: `test_rf032_crea_viaje_reservado`, `test_rf033_sin_destino_422`, `test_rf034_alertas_de_requisitos`, `test_rf035_alerta_de_salida`, `test_venta_directa`, `test_transaccion_atomica`.

## Contexto (leer solo esto)
- [[CU-07 Confirmar reserva]]
- [[EST-Viaje]]
- [[EST-Oportunidad]]
- Contrato: `src/packages/shared/openapi.json` (módulo `viajes`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/viajes.py`
- `src/backend/rumbo/presentacion/routers/viajes.py`

## Fuera de alcance
- La economía y el plan (tickets propios; la UI los encadena, RF-036).

## Notas de implementación
