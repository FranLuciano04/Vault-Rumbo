---
tipo: decision
estado: formalizado
modulo: [M11]
decisores: [Francisco, Nahuel, Paloma]
fecha_aprobacion: 11/11/26
supersede:
actualizado: 11/11/26
---
# DEC-0028 Cotizaciones alternativas y reserva con el primer pago

tags:: #tipo/decision #estado/formalizado #pc/pc2

> ✅ **Aprobada por el equipo (Francisco, Nahuel y Paloma) el 11/11/26**, en la llamada de revisión. Se aprobaron las cinco propuestas sin cambios: en el punto 1 se puede elegir un `borrador` (1.4) y las demás `enviada` pasan a `rechazada` (1.5); en el punto 4 el tramo que no entra no se crea y se avisa; en el punto 5 la comisión sigue sobre la ganancia. Borrador original del 10/11/26 (Nahuel con Claude), salido de la revisión del producto del 10/11/26. Con la aprobación, [[T-174 Ajustar el contrato de cotizaciones y reserva|T-174]] pasa a `libre`.

## Contexto
En la revisión del 10/11/26 el equipo pidió cuatro cambios en el circuito que va de la oportunidad al viaje. Contradicen reglas que hoy están escritas en los CU y en el código:

| Pedido de la revisión | Regla de hoy | Dónde |
|---|---|---|
| Una oportunidad tiene varias cotizaciones y, al ganarla, se elige la que aceptó el cliente | Las cotizaciones son **versiones**: solo se acepta la última, y «Ganar» es la venta directa, sin cotización | [[CU-06 Emitir cotización]] A1 y A2, [[CU-05 Seguir oportunidad]] A4, `exigir_vigente_sin_aceptada` |
| Al confirmar la reserva, el diálogo se completa con los datos de la cotización elegida y todo se puede editar | Solo se precarga el precio de venta | [[CU-07 Confirmar reserva]], `DialogoReserva.tsx` |
| Para confirmar la reserva se cargan precio de venta, costo y el **primer pago**; el resto del plan se completa desde el viaje | El plan de la reserva tiene que **sumar el precio de venta** | [[CU-11 Definir plan de cuotas]] A1, `exigir_plan_valido` |
| El itinerario de hoteles se arma solo a partir de la cotización | La cotización **no guarda hoteles**: sus ítems solo tienen concepto y precio | [[CU-09 Armar itinerario de hoteles]], [[Cotización]] |

Se verificó que los cuatro cambios se pueden hacer sin migraciones. Los ítems de la cotización se guardan como JSONB. La máquina de estados del viaje ya tolera un plan que no suma el precio: no pasa a `confirmado` ni a `en_curso` hasta que se complete ([[DEC-0026 Tipo de cambio y deuda nueva en un viaje confirmado|DEC-0026]]).

## Decisión

### 1. Las cotizaciones son alternativas
1. Una [[Oportunidad]] puede tener varias [[Cotización|Cotizaciones]] abiertas al mismo tiempo, y emitir una nueva no deja sin efecto a las anteriores. «Nueva versión» (CU-06 A1) pasa a ser un caso más: otra alternativa.
2. Se puede aceptar **cualquier** cotización `enviada` cuya `validez_hasta` no haya pasado, no solo la última. Sigue habiendo **una sola aceptada** por oportunidad, y su `moneda` es la del [[Viaje]] ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]]).
3. **«Ganar» pide elegir la cotización** que aceptó el cliente, o «Sin cotización (venta directa)», que es CU-05 A4 como hoy. Con una cotización elegida, en una sola operación: la cotización pasa a `aceptada` y la oportunidad a `ganada`. «Aceptar» desde la sección de cotizaciones (CU-06 A2) sigue existiendo y deja la oportunidad `cotizada`, como hoy.
4. **También se puede elegir una cotización en `borrador`**: el sistema la registra como enviada y aceptada (EST-Cotización T2 y T3 seguidas). Pasa seguido que el envío se hace por WhatsApp y nadie lo marca en el sistema.
5. Al ganar con una cotización, **las demás `enviada` pasan a `rechazada`**, porque el cliente eligió otra. Los `borrador` quedan como están. Así el historial queda claro y el proceso diario no las vence después. Hoy ningún indicador ni reporte cuenta las rechazadas.

### 2. La reserva se precarga con la cotización elegida
1. De la cotización aceptada salen la **moneda** y el **precio de venta** (su total). De la oportunidad salen las **fechas de salida y regreso** (las tentativas) y el **destino**: se preelige si hay un solo destino del catálogo cuyo nombre coincide con `destino_consultado`, que es texto libre ([[DEC-0006 Destino como entidad de catálogo|DEC-0006]]). Si no, queda para elegir.
2. Todo se puede editar **menos la moneda**, que la fija la cotización aceptada (DEC-0007). Si la moneda cambió, se emite y se acepta otra cotización.
3. El **costo** se carga a mano, porque la cotización no lo tiene. El equipo propuso calcular el precio de venta al cotizar: eso ya es el total de la cotización.

### 3. La reserva pide solo el primer pago
1. Para confirmar la reserva se cargan el **precio de venta**, el **costo** y el **primer pago**: monto, tipo (seña, cuota, pago único o saldo) y vencimiento. El tipo es del pago, no del precio ni del costo.
2. En la reserva, el plan tiene **al menos un pago**, cada uno mayor que cero, y la suma **no supera** el precio de venta. Puede sumar menos. Esto es una excepción a CU-11 A1 solo para la reserva.
3. **El primer pago no tiene que estar cobrado** para confirmar la reserva. El viaje nace `reservado` y pasa a `vendido` con el primer cobro, como dice CU-07. «Confirmar la reserva» es el acto de crear el viaje, no su estado `confirmado`.
4. El resto del plan se completa **desde el viaje**, con el editor de hoy, y ahí el plan completo sigue sumando el precio de venta (CU-11 A1 no cambia). Mientras no lo sume, la ficha muestra el aviso `plan_desbalanceado` y el viaje no pasa a `confirmado` ni a `en_curso` (DEC-0026).

### 4. El itinerario sale de la cotización
1. Un ítem de la cotización puede tener `hotel_id`, `check_in` y `check_out`. Si tiene hotel, las dos fechas son **obligatorias**: la web las completa al principio con las fechas tentativas de la oportunidad. El hotel tiene que estar en el catálogo y abierto.
2. Al confirmar la reserva, se crea un tramo del itinerario por cada hotel de la cotización aceptada, en el orden de los ítems, con las validaciones de [[CU-09 Armar itinerario de hoteles|CU-09]].
3. Si un tramo **no entra** en las fechas del viaje, se superpone con otro o el hotel ya está **cerrado**, ese tramo **no se crea** y la respuesta de la reserva lo avisa. La reserva no se rechaza: no se frena una venta por un detalle del itinerario, que después se arregla desde el viaje.
4. La venta directa y la cotización sin hoteles crean el viaje sin itinerario, como hoy.

### 5. La comisión en porcentaje sigue sobre la ganancia
En la revisión se pidió mostrar el importe de la comisión «correspondiente al costo». Se propone **no cambiar** [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]] punto 3, ratificada con la agencia el 17/09/26: el porcentaje se calcula sobre la **ganancia**. [[T-173 Mostrar la comisión en porcentaje con su importe|T-173]] solo cambia cómo se muestra el campo. ✅ **Confirmado por el equipo el 11/11/26**: la base es la ganancia, DEC-0007 no cambia y no hace falta un ticket de backend.

## Alternativas consideradas
- **Mantener las versiones y aceptar solo la última:** no cambia nada, pero no responde a lo que pidió el equipo. El cliente suele elegir entre opciones y no siempre se queda con la última. Se descarta.
- **Dejar como están las cotizaciones no elegidas al ganar:** es más simple, pero quedan `enviada` en una oportunidad cerrada, el proceso diario las vence días después y el historial confunde. Se descarta.
- **Elegir solo cotizaciones `enviada`:** respeta EST-Cotización al pie de la letra, pero obliga a marcar el envío antes de ganar, y es un paso que en la práctica se olvida. Queda como alternativa si el equipo prefiere no encadenar T2 y T3.
- **Plan de pagos vacío en la reserva**, como dice uno de los puntos de la revisión: rompe [[DEC-0026 Tipo de cambio y deuda nueva en un viaje confirmado|DEC-0026]] (el plan inicial pide al menos un pago) y deja el viaje sin ninguna alerta de cobro. Otro punto de la revisión pide el primer pago. Se descarta.
- **Exigir que el primer pago esté cobrado para confirmar la reserva:** mezcla la reserva con el cobro (CU-12) y cambia el estado con que nace el viaje. Se descarta.
- **Rechazar la reserva si un tramo no entra:** es más estricto, pero frena la venta por el itinerario. Se descarta.
- **Copiar los hoteles como texto, sin `hotel_id`:** no permite crear tramos ni reseñas por hotel (RF-106, [[DEC-0003 Relación Viaje–Hotel y Reseña|DEC-0003]]). Se descarta.

## Consecuencias
- **CU actualizados el 11/11/26:**
  - [[CU-05 Seguir oportunidad]]: «Ganar» con cotización elegida.
  - [[CU-06 Emitir cotización]]: alternativas en lugar de versiones, la aceptación de cualquiera vigente, el borrador elegido y las demás rechazadas.
  - [[CU-07 Confirmar reserva]]: la precarga, el primer pago y el itinerario.
  - [[CU-09 Armar itinerario de hoteles]]: los tramos que nacen de la reserva.
  - [[CU-11 Definir plan de cuotas]]: la excepción de la reserva.
  - Las entidades [[Cotización]] (hotel y fechas en el ítem) y [[Oportunidad]].
- **Tickets:** T-174 (contrato; suma las advertencias del itinerario a la respuesta de la reserva), T-175 (puntos 1.2 a 1.5), T-176 (punto 3), T-177 (punto 4), T-178 (punto 1 en la web), T-179 (puntos 2 y 3 en la web), T-180 (punto 4.1 en la web) y T-181 (e2e). T-173 depende del punto 5.
- **Riesgo:** T-175 y T-176 son de riesgo alto (estados y dinero) y necesitan la aprobación de otro integrante. La entrega es el 13/11/26: si no llegamos con todo, se puede priorizar el punto 3, que es el cambio más chico, y dejar el 4 para después.
- **Sin migraciones:** los ítems de la cotización son JSONB y `ViajeHotel` ya existe.
