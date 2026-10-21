---
tipo: regla
estado: borrador
modulo: [cotizaciones]
responsable: Francisco
pc: pc2
actualizado: 21/10/26
---
# RN-07 Vigencia de la cotización

tags:: #tipo/regla #estado/borrador #pc/pc2

> Borrador del 21/10/26 (C1). Junta RF-022 y RF-026, formalizados el 29/09; la agencia validó la vigencia de un mes ese mismo día. Falta la aprobación del equipo.

## Enunciado
Cada [[Cotización]] tiene una fecha de vigencia (`validez_hasta`) que se calcula al emitirla: la fecha de emisión más un parámetro configurable por el administrador, que por defecto es **un mes** (RF-022).

## Vencimiento
- El proceso automático diario pasa a `vencida` toda cotización `enviada` cuya vigencia expiró sin respuesta del cliente (RF-026).
- Una cotización vencida ya no sostiene los precios: para retomar hay que emitir una nueva.
- Las cotizaciones en `borrador` no vencen.
- El vencimiento no cambia el estado de la [[Oportunidad]].

## Aplica en
- [[Cotización]] · [[Oportunidad]]
- [[CU-06 Emitir cotización]]

## Origen
RF-022 y RF-026 de [[Requisitos funcionales]]; parámetro en la tabla `configuracion` ([[DEC-0013 Datos que faltaban en el ER|DEC-0013]]).
