---
id: T-090
titulo: Registrar la economía del viaje con su comisión
modulo: M6 — Viajes y economía
capa: backend
estado: tomado
depende_de: [T-086, T-087, T-030]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-10, RF-054, RF-055, RF-056, RF-057, RF-058, RF-059, RN-01, DEC-0007, DEC-0004]
origen: plan
asignado: palomap2003
tomado_el: 28/10/26 21:35
rama: feature/T-090-registrar-la-economia-del-viaje-con-su-c
pr:
---
# T-090 Registrar la economía del viaje con su comisión

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se registra la economía del viaje: precio de venta, costo, ganancia, margen y la comisión del vendedor precargada según RN-01 (o sobrescrita), con cálculos exactos en `Decimal`.

## Criterios de aceptación
- [ ] `PUT /viajes/{id}/economia` calcula ganancia y margen (RF-055) y precarga la comisión por defecto del vendedor, como importe o porcentaje sobre la ganancia (RN-01); se puede sobrescribir (A1) o no tener vendedor (A2).
- [ ] Ganancia o margen negativos se guardan con una advertencia en la respuesta (A3).
- [ ] Cambiar el precio de venta con un plan ya definido exige rebalancear el plan (A4, RF-059): la respuesta lo indica y el plan queda marcado como desbalanceado.

## Tests esperados
`tests/negocio/test_economia.py`: `test_rf055_ganancia_y_margen`, `test_rn01_comision_porcentaje_sobre_ganancia`, `test_rn01_comision_importe`, `test_rf056_override`, `test_rf057_sin_vendedor`, `test_rf058_negativo_advierte`, `test_rf059_cambio_de_precio_exige_rebalanceo`.

## Contexto (leer solo esto)
- [[CU-10 Registrar economía del viaje]]
- [[RN-01 Comisión automática]]
- [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]]
- [[DEC-0004 Comisión configurable por porcentaje|DEC-0004]]
- Contrato: `src/packages/shared/openapi.json` (módulo `economia`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/economia.py`
- `src/backend/rumbo/negocio/calculos.py`
- `src/backend/rumbo/presentacion/routers/economia.py`

## Fuera de alcance
- Multimoneda de cobros (ticket de cobro).

## Notas de implementación
