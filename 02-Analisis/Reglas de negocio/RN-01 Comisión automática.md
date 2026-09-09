---
tipo: regla
estado: en-revision
modulo: [economia]
responsable: Paloma
pc: pc1
actualizado: 09/09/26
---
# RN-01 Comisión automática

tags:: #tipo/regla #estado/en-revision #pc/pc1 #accion/decidir

## Enunciado
Al registrar la economía de un [[Viaje]], la **comisión se calcula automáticamente** a partir del precio de venta y el costo neto; el agente no la carga a mano.

## Fórmula (a confirmar en sync)
`comisión = precioVenta − costoNeto`
o, si se configura por porcentaje: `comisión = precioVenta × %comisión` (el % lo configura el rol admin).

## Restricciones
- Moneda **ARS**. Fechas `dd/mm/aa`.
- No procesa pagos online: registra montos, cuotas y vencimientos ([[Pago]]), no cobra. Ver [[Alcance y fuera de alcance]].

## Aplica en
- [[Viaje]] · [[Pago]] · [[CU-01 De la consulta a la venta]] (paso 4)

## Decisión asociada
- Pendiente `DEC-` sobre si la comisión es diferencia fija o porcentaje configurable. `#accion/decidir`
