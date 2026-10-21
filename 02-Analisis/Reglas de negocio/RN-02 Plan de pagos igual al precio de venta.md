---
tipo: regla
estado: formalizado
modulo: [economia]
responsable: Francisco
pc: pc2
actualizado: 21/10/26
fecha_aprobacion: 21/10/26
---
# RN-02 Plan de pagos igual al precio de venta

tags:: #tipo/regla #estado/formalizado #pc/pc2

## Enunciado
La suma de los montos de los [[Pago|Pagos]] no anulados de un [[Viaje]] es siempre igual a su precio de venta, expresada en la moneda de referencia del viaje.

## Cuándo se controla
- Al guardar el plan de cuotas: si la suma no coincide, el sistema rechaza el guardado y muestra la diferencia (RF-061).
- Al anular un pago del plan: el sistema vuelve a exigir la igualdad (RF-066).
- Al cambiar el precio de venta de un viaje que ya tiene plan: el sistema exige rebalancear los pagos pendientes antes de confirmar el cambio (RF-059).
- Al dividir una cuota para registrar un cobro parcial: las dos partes suman lo mismo que la cuota original (RF-072, ver [[RN-03 Pago indivisible]]).

## Excepciones
- Los pagos en estado `anulado` no integran la suma.
- Si el viaje se cancela estando `en curso`, los cobros registrados se mantienen y la suma pasa a reflejar lo efectivamente cobrado (RF-051, ver [[RN-06 Efectos de la cancelación del viaje]]).
- La diferencia que produce el tipo de cambio en un cobro en otra moneda se registra en el monto cobrado. La regla se mide sobre los montos planificados (RF-068, RF-069).

## Aplica en
- Entidades: [[Viaje]] · [[Pago]]
- Casos de uso: [[CU-10 Registrar economía del viaje]] · [[CU-11 Definir plan de cuotas]] · [[CU-12 Registrar cobro de un pago]] · [[CU-01 De la consulta a la venta]]

## Origen
RF-059, RF-061, RF-066 y RF-072 de [[Requisitos funcionales]].

## 🔎 Revisión
> ✅ **Aprobado y formalizado en la sync del 21/10/26.** Redactado el 21/10/26 (Francisco, recomendado C1 del PC1). Consolida en una regla lo que ya fijaban RF-059, RF-061, RF-066 y RF-072, formalizados el 29/09; no agrega comportamiento nuevo.
