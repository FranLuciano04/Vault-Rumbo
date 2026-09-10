---
tipo: regla
estado: en-revision
modulo: [economia]
responsable: Paloma
pc: pc1
actualizado: 09/09/26
---
# RN-01 Comisión automática

tags:: #tipo/regla #estado/en-revision #pc/pc1

## Enunciado
Al registrar la economía de un [[Viaje]], la **comisión se calcula automáticamente** a partir del precio de venta y el costo neto; el agente no la carga a mano.

## Fórmula
`comisión = precioVenta × %comisión`, con `%comisión` **configurable por el rol admin**. Ver [[DEC-0004 Comisión configurable por porcentaje]].
Se permite ajuste manual por viaje (override). La diferencia `precioVenta − costoNeto` queda como dato de **margen**, no como comisión.

## Restricciones
- Moneda **ARS**. Fechas `dd/mm/aa`.
- No procesa pagos online: registra montos, cuotas y vencimientos ([[Pago]]), no cobra. Ver [[Alcance y fuera de alcance]].

## Aplica en
- [[Viaje]] · [[Pago]] · [[CU-01 De la consulta a la venta]] (paso 4)

## Decisión asociada
- [[DEC-0004 Comisión configurable por porcentaje]] (`en-revision`, ratificar en sync).
