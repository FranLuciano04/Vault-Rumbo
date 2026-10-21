---
tipo: regla
estado: formalizado
modulo: [viajes, economia]
responsable: Francisco
pc: pc2
actualizado: 21/10/26
fecha_aprobacion: 21/10/26
---
# RN-05 Ciclo de vida del viaje

tags:: #tipo/regla #estado/formalizado #pc/pc2

## Enunciado
El [[Viaje]] recorre una secuencia estricta de estados: `reservado → vendido → confirmado → en curso → finalizado`, además de `cancelado`. Ningún estado de la secuencia se omite.

## Disparador de cada transición
| Transición | Disparador | Tipo |
|---|---|---|
| `reservado → vendido` | El primer cobro registrado, sea la seña, una cuota o el pago único | automática (RF-038) |
| `vendido → confirmado` | El cobro que deja el saldo en cero | automática (RF-038) |
| `confirmado → en curso` | La confirmación del empleado; el día de salida, una [[Alerta]] de tipo `viaje` la sugiere | manual (RF-039) |
| `en curso → finalizado` | La confirmación del empleado; el día de regreso, una [[Alerta]] de tipo `viaje` la sugiere | manual (RF-039) |

- Si un mismo cobro salda el total, se aplican las dos transiciones automáticas en orden (RF-038).
- Las transiciones manuales nunca se fuerzan: si el regreso se demora, el viaje permanece `en curso` aunque la fecha haya pasado (RF-039).

## Correcciones
- **Reversión de un cobro:** si el viaje había pasado a `confirmado` por saldo cero, vuelve a `vendido`; si era el único cobro, vuelve a `reservado` (RF-070).
- **Estado registrado por error:** el viaje puede volver al estado inmediato anterior, salvo desde `finalizado` o `cancelado` (RF-042).
- **Cancelación:** un viaje `finalizado` no puede cancelarse (RF-049). Los efectos de la cancelación se describen en [[RN-06 Efectos de la cancelación del viaje]].

## Aplica en
- Entidades: [[Viaje]] · [[Pago]] · [[Alerta]]
- Casos de uso: [[CU-08 Gestionar estado del viaje]] · [[CU-12 Registrar cobro de un pago]] · [[CU-27 Cancelar viaje]] · [[CU-01 De la consulta a la venta]]

## Origen
RF-038, RF-039, RF-042, RF-049 y RF-070 de [[Requisitos funcionales]]. El diagrama de estados está en [[EST-Viaje]].

## 🔎 Revisión
> ✅ **Aprobado y formalizado en la sync del 21/10/26.** Redactado el 21/10/26 (Francisco, recomendado C1 del PC1). Reúne en una regla las transiciones que ya fijaban esos RF, formalizados el 29/09.
