---
id: T-094
titulo: Registrar el cobro de un pago del viaje
modulo: M6 — Viajes y economía
capa: backend
estado: libre
depende_de: [T-092, T-087]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-12, RF-038, RF-067, RF-068, RF-069, RF-071, RF-072, RNF-05]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-094 Registrar el cobro de un pago del viaje

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se registra el cobro íntegro de un pago, con su forma de pago y, si corresponde, en otra moneda; el saldo se actualiza, la alerta se resuelve y el viaje avanza a `vendido` o `confirmado`.

## Criterios de aceptación
- [ ] `POST /pagos/{id}/cobrar` exige forma de pago (RF-071) y el importe completo (RF-072); en otra moneda registra el tipo de cambio y la equivalencia (RF-068). Un pago vencido también se cobra (A1).
- [ ] El primer cobro pasa el viaje de `reservado` a `vendido` (A0); si el saldo llega a cero, sigue a `confirmado` en la misma operación (A2).
- [ ] Saldo y porcentaje pagado actualizados (RF-069); todo en una transacción.

## Tests esperados
`tests/api/test_cobros.py`: `test_rf067_cobrar`, `test_rf068_otra_moneda`, `test_rf071_forma_de_pago_obligatoria`, `test_rf072_cobro_integro`, `test_rf038_primer_cobro_pasa_a_vendido`, `test_rf038_saldo_cero_pasa_a_confirmado`, `test_rf069_saldo`.

## Contexto (leer solo esto)
- [[CU-12 Registrar cobro de un pago]]
- [[EST-Pago]]
- [[EST-Viaje]]
- [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]]
- [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] — moneda y tipo de cambio
- Contrato: `src/packages/shared/openapi.json` (módulo `economia`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/economia.py`
- `src/backend/rumbo/presentacion/routers/economia.py`

## Fuera de alcance
- Revertir el cobro (ticket propio).

## Notas de implementación
