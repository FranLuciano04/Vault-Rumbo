---
tipo: regla
estado: borrador
modulo: [economia]
responsable: Francisco
pc: pc2
actualizado: 21/10/26
---
# RN-03 Pago indivisible

tags:: #tipo/regla #estado/borrador #pc/pc2

> Borrador del 21/10/26 (C1). Sube a regla el RF-072, que nació en una nota de revisión de CU-12 y se ratificó el 29/09 (la sección de revisión de [[Requisitos funcionales]] sugería hacerlo). Falta la aprobación del equipo.

## Enunciado
Cada [[Pago]] se cobra **completo**: no existen los cobros parciales. Un pago pasa de `pendiente` o `vencido` a `pagado` en un solo cobro.

## Cobro parcial
Si el cliente paga solo una parte, **antes de cobrar** se divide la cuota en dos dentro del plan. Las dos partes suman lo mismo que la original, así se mantiene [[RN-02 Plan de pagos igual al precio de venta]]. Después se cobra la parte pagada.

## Moneda del cobro
El cobro puede hacerse en una moneda distinta de la del viaje (ARS o USD) con el tipo de cambio del día. El pago se considera íntegro igual, y la diferencia de cambio queda registrada en el monto cobrado (RF-068).

## Aplica en
- [[Pago]]
- [[CU-12 Registrar cobro de un pago]] · [[CU-11 Definir plan de cuotas]]

## Origen
RF-072 y RF-068 de [[Requisitos funcionales]].
