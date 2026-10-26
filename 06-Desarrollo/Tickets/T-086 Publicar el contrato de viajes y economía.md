---
id: T-086
titulo: Publicar el contrato de viajes y economía
modulo: M6 — Viajes y economía
capa: contrato
estado: hecho
depende_de: [T-015]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-07, CU-08, CU-09, CU-10, CU-11, CU-12, CU-27, DEC-0007, DEC-0013]
origen: plan
asignado: palomap2003
tomado_el: 25/10/26 21:20
rama: feature/T-086-publicar-el-contrato-de-viajes-y-economi
pr:
---
# T-086 Publicar el contrato de viajes y economía

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existen los esquemas y routers stub (`501`) de viajes (reserva, ficha, estados, cancelación, itinerario) y economía (economía, plan de pagos, ajustes y cobros), con tipos, hooks y mocks.

## Criterios de aceptación
- [ ] Las 20 rutas de los módulos `viajes` y `economia` con esquemas, roles y errores (409 por estado).
- [ ] Importes como texto decimal, moneda y tipo de cambio según DEC-0007/DEC-0013; ficha con ganancia, margen, comisión y saldo.
- [ ] Tipos, hooks y mocks MSW con un viaje ficticio en cada estado.

## Tests esperados
`tests/api/test_contrato_m6.py`: rutas, token y 501.

## Contexto (leer solo esto)
- [[Contrato de la API (OpenAPI)]] — módulos `viajes` y `economia`
- `05-Diseño/API/openapi.json` (PC1)
- [[Viaje]]
- [[Pago]]
- [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]]
- [[DEC-0013 Datos que faltaban en el ER|DEC-0013]]

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/{viajes,economia}.py`
- `src/backend/rumbo/presentacion/routers/{viajes,economia}.py`
- `src/packages/shared/src/{hooks,esquemas,mocks}/{viajes,economia}.ts`

## Fuera de alcance
- La lógica.

## Notas de implementación
- **Modelos:** tests, verde, refactor y fix con sonnet; review con opus. No hubo escalados. El refactor no cambió nada.
- **Importes:** viajan como texto decimal con tres tipos en `esquemas/comunes.py`: `Importe` (2 decimales, ≥ 0), `TipoCambio` (4 decimales, > 0) y `DecimalConSigno` (`ganancia` y `margen`). Además, `Fraccion` (0 a 1, 4 decimales) para `porcentaje_pagado`, por un hallazgo de la review.
- **`contrato.py`:** se suman `respuesta_pagina`, `operacion_de_viaje`, `ESCRITURA_DEL_REGISTRO` y el parámetro `visibilidad` de `operacion()`. No cambia lo que ya publicaban M1 a M3.
- **Desvíos del contrato del PC1, que la review aprobó:**
  1. `GET /viajes/{id}/itinerario` devuelve `Tramo[]`, porque un itinerario es una lista que puede estar vacía (CU-09 A1 y A5).
  2. `Tramo` es un modelo con `extra="allow"` y todavía no fija los campos de `viaje_hotel`.
  3. Los campos nulables de `Viaje` y `Pago` salen requeridos y nulables, igual que en `Alerta`.
  4. `ganancia` y `margen` aceptan valores negativos (CU-10 A3). El patrón del PC1 no permitía una pérdida.
  5. La comisión en porcentaje se limita a 0–100 (CU-13).
- **Mocks:** hay un viaje en cada uno de los 6 estados. `corregir-estado` solo acepta `en_curso` → `confirmado` y `finalizado` → `en_curso` (EST-Viaje T7). `estado_previo` se usa solo en la cancelación (DEC-0013). Revertir un cobro o reprogramar un pago lo deja `vencido` si la fecha ya pasó, y el plan de pagos conserva los cobros.
- **Hallazgos de la review:** 0 bloqueantes, 2 importantes y 5 menores, todos arreglados. Se autorizó tocar el test para fijar los 4 decimales de `porcentaje_pagado`, para que los cuerpos de tramo tengan forma de hotel (DEC-0003) y para partir una docstring larga (E501).
- **✅ Resuelto en [[DEC-0021 Correcciones del viaje y monto de un pago|DEC-0021]] (25/10/26, Paloma):**
  - CU-08 A2 permite corregir el estado «mientras el viaje no esté `finalizado`/`cancelado`», y EST-Viaje T7 permite corregirlo desde `finalizado`. Hay que resolverlo con una `DEC-` antes del backend de CU-08. El mock sigue a EST-Viaje.
  - CU-11 A3 permite editar el monto de un pago, pero `PagoReprogramar` solo trae `vencimiento`, igual que en el PC1. Queda para el backend de CU-11.
