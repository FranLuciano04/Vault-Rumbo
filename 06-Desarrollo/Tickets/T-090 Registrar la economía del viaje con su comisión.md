---
id: T-090
titulo: Registrar la economía del viaje con su comisión
modulo: M6 — Viajes y economía
capa: backend
estado: hecho
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
- **Contrato ampliado (decisión de Paloma):** la respuesta 200 de `PUT /viajes/{id}/economia` es `EconomiaRegistrada`, que agrega a `Viaje` el campo `advertencias` con los códigos `ganancia_negativa`, `margen_negativo` y `plan_desbalanceado`. Se regeneraron `openapi.json` y `tipos.gen.ts`, y el mock devuelve `advertencias: []`. En el verde se corrigió con `--tocar-tests` una línea del test de contrato viejo (`"Viaje"` → `"EconomiaRegistrada"`).
- **Plan desbalanceado:** es un dato derivado, sin columna: la suma de los pagos no anulados es distinta del precio de venta. El precio nuevo se guarda igual y el rebalanceo es un paso aparte. `negocio/calculos.py` calcula el descalce, el saldo pendiente y el porcentaje pagado.
- **Comisión:**
  - Sin vendedor, queda en 0.
  - Si no viene una comisión, se aplica el default del vendedor (RN-01).
  - El vendedor tiene que estar activo y ser visible para quien guarda.
  - **Freelance (decisión de Paloma):** se ignora la comisión que envía y se aplica su default. Quedó como propuesta `#accion/decidir` en RN-01.
- **Es un PUT de reemplazo completo:** si se omite el operador o el vendedor, queda vacío.
- **Review (`reviewer-seguridad`, sonnet, dos rondas):** la primera encontró 1 bloqueante, 3 importantes y 3 menores. Se arreglaron:
  - El viaje cancelado o finalizado da 409.
  - La migración `0008` ensancha `margen` a `Numeric(20,4)`.
  - El freelance no sobrescribe la comisión.
  - El operador dado de baja da 422.
  - El tipo de comisión sin valor da 422.

  La segunda ronda confirmó todo cerrado.
- **Menores que quedan:**
  - Si el freelance vuelve a guardar la economía, pisa con su default el override que había fijado el admin. Se decide en la sync.
  - El descarte de la comisión del freelance, y la de un viaje sin vendedor, no se avisa en la respuesta.
  - Si viene el valor de la comisión sin el tipo, se usa el tipo del default del vendedor.
  - Los pagos se leen sin bloquear la fila, así que con dos pedidos a la vez la advertencia de descalce puede quedar vieja. Solo afecta a la advertencia.
- **Fuera del ticket:** `obtener_viaje` y los demás endpoints de viaje van a necesitar el saldo y el porcentaje pagado de `negocio/calculos.py`.
- **Modelos:** tests sonnet, implementación y refactor opus, review sonnet. Sin escalados.
