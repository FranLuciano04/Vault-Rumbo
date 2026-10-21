---
tipo: regla
estado: borrador
modulo: [economia]
responsable: Francisco
pc: pc2
actualizado: 21/10/26
---
# RN-02 Plan de pagos igual al precio de venta

tags:: #tipo/regla #estado/borrador #pc/pc2

> Borrador del 21/10/26 (C1). Consolida en una regla lo que ya fijan RF-059, RF-061, RF-066 y RF-072, formalizados el 29/09. No agrega comportamiento nuevo. Falta la aprobación del equipo.

## Enunciado
La suma de los montos de los [[Pago|Pagos]] **no anulados** de un [[Viaje]] es siempre igual a su **precio de venta**, expresada en la moneda de referencia del viaje.

## Cuándo se controla
- Al guardar el plan de cuotas: si no coincide, se rechaza el guardado y se muestra la diferencia (RF-061).
- Al anular un pago del plan: se vuelve a exigir la igualdad (RF-066).
- Al cambiar el precio de venta de un viaje que ya tiene plan: se exige rebalancear los pagos pendientes antes de confirmar el cambio (RF-059).
- Al dividir una cuota para un cobro parcial: las dos partes suman lo mismo que la original (RF-072, ver [[RN-03 Pago indivisible]]).

## Excepciones
- Los pagos `anulado` no cuentan en la suma.
- Si el viaje se cancela estando `en curso`, los cobros quedan como están y la suma pasa a reflejar lo cobrado (RF-051, ver [[RN-06 Efectos de la cancelación del viaje]]).
- La diferencia que produce el tipo de cambio de un cobro en otra moneda queda en el monto cobrado y no rompe la regla, que se mide sobre los montos planificados (RF-068, RF-069).

## Aplica en
- [[Viaje]] · [[Pago]]
- [[CU-10 Registrar economía del viaje]] · [[CU-11 Definir plan de cuotas]] · [[CU-12 Registrar cobro de un pago]] · [[CU-01 De la consulta a la venta]]

## Origen
RF-059, RF-061, RF-066 y RF-072 de [[Requisitos funcionales]].
