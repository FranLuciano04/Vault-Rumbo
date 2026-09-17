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

> ⚠️ **En revisión (17/09).** El relevamiento de la agencia cambió el modelo (ganancia, no comisión = % de venta). Esta regla se reescribe según [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] (`en-revision`, a ratificar en la sync).

## Enunciado
Al registrar la economía de un [[Viaje]], el agente **carga precio de venta, costo, moneda y comisión del vendedor**; el sistema **calcula automáticamente la ganancia y el margen**.

## Fórmula
- `ganancia = precioVenta − costo` (importe, por operación; **no** es un % fijo).
- `margen%` = la ganancia en porcentaje (base a confirmar: sobre venta o sobre costo — [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]).
- `comision_vendedor` = concepto **separado**, por vendedor/freelancer, para liquidar cuánto pagarle.

> Modelo anterior (superseded): `comisión = precioVenta × %comisión` con `%` default de empresa — ver [[DEC-0004 Comisión configurable por porcentaje]].

## Restricciones
- **Moneda por operación (ARS / USD)** — multimoneda, ya no solo ARS. Fechas `dd/mm/aa`.
- No procesa pagos online: registra montos, cuotas y vencimientos ([[Pago]]), no cobra. Ver [[Alcance y fuera de alcance]].

## Aplica en
- [[Viaje]] · [[Pago]] · [[CU-10 Registrar economía del viaje]] · [[CU-01 De la consulta a la venta]] (paso 4)

## Decisión asociada
- [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] (`en-revision`, ratificar en sync) — supersede a [[DEC-0004 Comisión configurable por porcentaje]].
