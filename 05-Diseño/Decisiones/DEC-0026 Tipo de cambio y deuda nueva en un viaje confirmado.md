---
tipo: decision
estado: en-revision
modulo: [M6]
decisores: [Nahuel]
fecha_aprobacion:
supersede:
actualizado: 01/11/26
---
# DEC-0026 Tipo de cambio y deuda nueva en un viaje confirmado

tags:: #tipo/decision #estado/en-revision #pc/pc2 #accion/decidir

> 🟡 **Propuesta por Nahuel el 01/11/26** al hacer el triage de la review de Codex de M6 ([[M6 — review Codex]], H-01, H-02 y H-04). Falta la ratificación del equipo; los arreglos se implementan con esta propuesta y su PR necesita la aprobación de otro integrante.

## Contexto
**Tipo de cambio.** [[CU-12 Registrar cobro de un pago]] paso 2 pide el `tipo_cambio` del día cuando la moneda del cobro no es la del [[Viaje]], pero no dice en qué sentido se cotiza. La web lo toma como pesos por dólar y divide al cobrar en USD un viaje en ARS; la API siempre multiplica. Un cobro de ARS 100000 en USD a 1000 queda guardado como USD 100000000.

**Deuda nueva en un viaje `confirmado`.** [[CU-10 Registrar economía del viaje]] A4 y [[CU-11 Definir plan de cuotas]] A5 permiten cambiar el precio y rebalancear el plan de un viaje ya pagado. [[EST-Viaje]] no tiene una transición para un `confirmado` que vuelve a deber: el cobro de la diferencia da 409 (T2 y T3 salen de `reservado` y `vendido`) y el viaje se puede iniciar (T4) sin el total pagado. Además, un rebalanceo que solo conserva lo cobrado (`{"pagos": []}`) no se puede expresar.

## Decisión
1. **`tipo_cambio` son siempre pesos por dólar** (ARS por USD). Viaje en ARS cobrado en USD: `monto_cobrado = monto / tipo_cambio`. Viaje en USD cobrado en ARS: `monto_cobrado = monto × tipo_cambio`. En los dos casos, con `Decimal` y redondeo al centavo `ROUND_HALF_UP`. El contrato lo dice en la descripción del campo.
2. **Nueva T11 `confirmado → vendido` (automática, sistema):** si al editar la economía o rebalancear el plan de un `confirmado` queda saldo pendiente, el viaje vuelve a `vendido` en la misma transacción. Cobrar esa deuda lo lleva de nuevo a `confirmado` por T3.
3. **T3 también la dispara el rebalanceo:** un viaje `vendido` cuyo plan queda balanceado con saldo cero pasa a `confirmado`, igual que si lo hubiera saldado un cobro.
4. **T4 exige el total pagado:** iniciar un viaje requiere saldo cero y plan balanceado; si no, 409. Desde `en curso` no se retrocede: lo que cambie ahí queda como advertencia.
5. **Rebalanceo sin pagos nuevos:** `PUT /viajes/{id}/pagos` admite `{"pagos": []}` cuando lo cobrado ya suma el precio de venta. La definición inicial del plan sigue pidiendo al menos un pago.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Pesos por dólar | Es la cotización que usa la agencia y lo que ya hace la web | La API tiene que mirar la dirección de la conversión | ✅ |
| Multiplicador directo (moneda del cobro por moneda del viaje) | La API no cambia | Para ARS → USD hay que cargar 0,001; es fácil equivocarse | ❌ |
| Deuda nueva: el viaje vuelve a `vendido` (T11) | El estado refleja la deuda y la secuencia de EST-Viaje se mantiene | Agrega una transición | ✅ |
| Deuda nueva: se cobra con el viaje `confirmado` | No agrega transición | `confirmado` deja de significar «pagado» | ❌ |
| No se edita el precio de un `confirmado` | Simple | Contradice CU-10 A4 | ❌ |

## Consecuencias
- [[EST-Viaje]] suma T11 y amplía T3 y T4; el diagrama se redibuja al ratificar.
- [[CU-12 Registrar cobro de un pago]] paso 2 aclara el sentido del tipo de cambio.
- Arreglos en `fix/M6-tipo-de-cambio` (punto 1) y `fix/M6-estado-con-deuda-nueva` (puntos 2 a 5).
