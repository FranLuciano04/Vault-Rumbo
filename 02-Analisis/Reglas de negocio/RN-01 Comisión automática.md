---
tipo: regla
estado: formalizado
modulo: [economia]
responsable: Paloma
pc: pc1
actualizado: 17/09/26
---
# RN-01 Comisión automática

tags:: #tipo/regla #estado/formalizado #pc/pc1

> ✅ **Ratificada en la sync 17/09.** Reescrita según [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] (supersede a [[DEC-0004 Comisión configurable por porcentaje]]).

## Enunciado
Al registrar la economía de un [[Viaje]], el agente **carga precio de venta, costo, moneda y comisión del vendedor**; el sistema **calcula automáticamente la ganancia y el margen**.

## Fórmula
- `ganancia = precioVenta − costo` (importe, por operación; **no** es un % fijo).
- `margen%` = la ganancia en porcentaje **sobre el precio de venta**: `ganancia / precioVenta` ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]).
- `comision_vendedor` = concepto **separado**, por vendedor/freelancer: **importe o %** (el % sobre la ganancia), con **default por vendedor + override** por viaje.

> Modelo anterior (superseded): `comisión = precioVenta × %comisión` con `%` default de empresa — ver [[DEC-0004 Comisión configurable por porcentaje]].

## Restricciones
- **Moneda por operación (ARS / USD)** — multimoneda, ya no solo ARS. Fechas `dd/mm/aa`.
- No procesa pagos online: registra montos, cuotas y vencimientos ([[Pago]]), no cobra. Ver [[Alcance y fuera de alcance]].
- **Quién sobrescribe la comisión** *(propuesta 29/10, Paloma, en T-090; #accion/decidir: ratificar en la próxima sync)*: admin, dueño y empleado pueden sobrescribirla por viaje. Si quien registra la economía es un **freelance**, se ignora la comisión que envíe y se aplica siempre el default del vendedor, para que no pueda fijarse su propia comisión.

## Aplica en
- [[Viaje]] · [[Pago]] · [[CU-10 Registrar economía del viaje]] · [[CU-01 De la consulta a la venta]] (paso 4)

## Decisión asociada
- [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] (`formalizado`, sellada en la sync 17/09) — supersede a [[DEC-0004 Comisión configurable por porcentaje]].
