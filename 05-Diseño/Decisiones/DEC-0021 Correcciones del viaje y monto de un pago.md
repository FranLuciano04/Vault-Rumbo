---
tipo: decision
estado: formalizado
modulo: [M6]
decisores: [Paloma]
fecha_aprobacion: 25/10/26
supersede:
actualizado: 25/10/26
---
# DEC-0021 Correcciones del viaje y monto de un pago

tags:: #tipo/decision #estado/formalizado #pc/pc2

> ✅ **Decidida por Paloma el 25/10/26**, al cerrar [[T-086 Publicar el contrato de viajes y economía|T-086]]. La review del contrato de M6 encontró dos textos del PC1 que no coincidían. Se resuelven ahora para no dejar pendientes para la sync.

## Contexto
1. **Corregir el estado de un viaje.** [[CU-08 Gestionar estado del viaje]] A2 y RF-042 decían que el empleado retrocede al estado anterior «mientras el viaje no esté `finalizado`/`cancelado`». En cambio, [[EST-Viaje]] T7 (resuelto por Nahuel el 21/09) permite la corrección **solo** desde `en curso` y `finalizado`. Su ejemplo es justamente marcar `finalizado` por error el viaje equivocado. En el orden de autoridad el CU está por encima del diagrama, así que hacía falta una decisión.
2. **Cambiar el monto de un pago.** [[CU-11 Definir plan de cuotas]] A3, RF-065 y [[EST-Pago]] permiten editar el «monto o vencimiento» de un [[Pago]] no cobrado. Pero si se cambia el monto de un solo pago, siempre se rompe `Σ montos = precioVenta`, salvo que se compense con otro pago. El contrato publicado en T-086 (`PATCH /pagos/{id}`, `PagoReprogramar`) solo recibe el `vencimiento`.

## Decisión
1. **Se sigue a EST-Viaje T7.** La corrección deshace solo las transiciones **manuales**: `en curso → confirmado` (deshace T4) y `finalizado → en curso` (deshace T5).
   - Las transiciones que produjo un cobro (`vendido`, `confirmado`) se deshacen revirtiendo el cobro ([[CU-12 Registrar cobro de un pago]] A3).
   - `cancelado` se corrige con la reversión de la cancelación ([[CU-27 Cancelar viaje]] A3).
   - **Al deshacer un `finalizado`**, se cierra la [[Alerta]] de `reseña` que agendó T5, si sigue sin atender. Las [[Reseña|Reseñas]] ya cargadas se conservan. Si el viaje vuelve a finalizarse, T5 agenda una alerta nueva.
   - El destino se deduce de la transición. `estado_previo` sigue siendo solo de la cancelación ([[DEC-0013 Datos que faltaban en el ER|DEC-0013]]).
2. **El monto se cambia rebalanceando el plan, no pago por pago.**
   - Reprogramar un pago (`PATCH /pagos/{id}`) cambia **solo su vencimiento**.
   - Para cambiar montos hay dos caminos, y en los dos se valida `Σ montos = precioVenta`:
     - **Rebalancear los pagos no cobrados** con `PUT /viajes/{id}/pagos` (el mismo camino que [[CU-11 Definir plan de cuotas|CU-11]] A5).
     - **Dividir un pago** en dos (A6).

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| 1a. Corregir desde `en curso` y `finalizado` (EST-Viaje) | Resuelve el error real de marcar finalizado el viaje equivocado sin cancelarlo. Ya estaba razonado el 21/09 y el contrato y los mocks ya funcionan así | Hay que cerrar la alerta de reseña al deshacer | ✅ |
| 1b. `finalizado` es definitivo (CU-08 A2) | Más simple | Un error de carga obliga a cancelar y rehacer el viaje, y se pierde el historial | ❌ |
| 2a. El monto se cambia rebalanceando el plan o dividiendo | El plan siempre cuadra. No cambia el contrato | Cambiar un solo monto exige reenviar los pagos no cobrados | ✅ |
| 2b. Monto opcional en `PATCH /pagos/{id}` | Coincide con el texto del PC1 | Casi siempre se rechazaría, porque un monto solo descuadra el plan. Cambia el contrato | ❌ |

## Justificación
En los dos casos se elige la opción que mantiene las invariantes del dominio: un viaje no queda en un estado incoherente con sus cobros, y el plan siempre suma el precio de venta. Tampoco hace falta cambiar código: el contrato y los mocks de T-086 ya funcionan así.

## Impacto
- CU: [[CU-08 Gestionar estado del viaje]] (A2) y [[CU-11 Definir plan de cuotas]] (A3).
- Requisitos: RF-042 y RF-065 en [[Requisitos funcionales]].
- Diagramas: [[EST-Viaje]] (T7 cierra la alerta de reseña) y [[EST-Pago]] (reprogramar cambia solo el vencimiento).
- Tickets: [[T-087 Implementar la máquina de estados del viaje|T-087]] (corrección y alerta de reseña) y [[T-093 Ajustar los pagos de un plan ya definido|T-093]] (ya pedía solo el vencimiento).

## Decisores y fecha
- Decisores: Paloma.
- Aprobada: 25/10/26.

## Vínculo con el código (a partir de PC2)
- Sin cambios de código: el contrato y los mocks de T-086 (PR #87) ya cumplen esta decisión. La lógica la implementan T-087 y T-093.

## Estado / supersesión
Vigente. No reemplaza a ninguna decisión: alinea el texto de CU-08 A2, CU-11 A3, RF-042 y RF-065.
