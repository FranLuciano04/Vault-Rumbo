---
tipo: regla
estado: borrador
modulo: [viajes, economia]
responsable: Francisco
pc: pc2
actualizado: 21/10/26
---
# RN-05 Ciclo de vida del viaje

tags:: #tipo/regla #estado/borrador #pc/pc2

> Borrador del 21/10/26 (C1). Junta en una regla las transiciones del [[Viaje]] que ya fijan RF-038, RF-039, RF-042, RF-049 y RF-070, formalizados el 29/09. El diagrama sigue siendo [[EST-Viaje]]. Falta la aprobación del equipo.

## Enunciado
El [[Viaje]] recorre una secuencia **estricta**: `reservado → vendido → confirmado → en curso → finalizado`, más `cancelado`. No se saltean estados.

## Qué dispara cada paso
| Paso | Disparador | Tipo |
|---|---|---|
| `reservado → vendido` | El **primer cobro**, sea la seña, una cuota o el pago único | automático (RF-038) |
| `vendido → confirmado` | El cobro que deja el **saldo en cero** | automático (RF-038) |
| `confirmado → en curso` | El empleado lo confirma; el día de salida, una [[Alerta]] `viaje` lo sugiere | manual (RF-039) |
| `en curso → finalizado` | El empleado lo confirma; el día de regreso, una [[Alerta]] `viaje` lo sugiere | manual (RF-039) |

- Si un mismo cobro salda el total, se aplican las dos transiciones automáticas en orden (RF-038).
- Los pasos manuales nunca se fuerzan: si el regreso se demora, el viaje sigue `en curso` aunque la fecha haya pasado (RF-039).

## Correcciones
- **Revertir un cobro:** si el viaje había pasado a `confirmado` por saldo cero, vuelve a `vendido`; si era el único cobro, vuelve a `reservado` (RF-070).
- **Estado cargado por error:** se puede volver al estado inmediato anterior, salvo desde `finalizado` o `cancelado` (RF-042).
- **Cancelación:** no se puede cancelar un viaje `finalizado` (RF-049). Los efectos de cancelar están en [[RN-06 Efectos de la cancelación del viaje]].

## Aplica en
- [[Viaje]] · [[Pago]] · [[Alerta]]
- [[CU-08 Gestionar estado del viaje]] · [[CU-12 Registrar cobro de un pago]] · [[CU-27 Cancelar viaje]] · [[CU-01 De la consulta a la venta]]

## Origen
RF-038, RF-039, RF-042, RF-049 y RF-070 de [[Requisitos funcionales]]; diagrama en [[EST-Viaje]].
