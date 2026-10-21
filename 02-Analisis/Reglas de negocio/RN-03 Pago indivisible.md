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

## Enunciado
Cada [[Pago]] se cobra completo: no existen los cobros parciales. Un pago pasa de `pendiente` o `vencido` a `pagado` en un único cobro.

## Cobro parcial
Si el cliente abona solo una parte, antes de registrar el cobro se divide la cuota en dos dentro del plan. Las dos partes suman lo mismo que la cuota original, de modo que se mantiene [[RN-02 Plan de pagos igual al precio de venta]]. Luego se cobra la parte abonada.

## Moneda del cobro
El cobro puede realizarse en una moneda distinta de la del viaje (ARS o USD), con el tipo de cambio del día. El pago se considera íntegro igualmente, y la diferencia de cambio queda registrada en el monto cobrado (RF-068).

## Aplica en
- Entidades: [[Pago]]
- Casos de uso: [[CU-12 Registrar cobro de un pago]] · [[CU-11 Definir plan de cuotas]]

## Origen
RF-072 y RF-068 de [[Requisitos funcionales]].

## 🔎 Revisión
> Borrador del 21/10/26 (Francisco, recomendado C1 del PC1). Sube a regla el RF-072, que surgió de una nota de revisión de CU-12 y se ratificó el 29/09; la revisión de [[Requisitos funcionales]] sugería llevarlo a las reglas. Falta la aprobación del equipo.
