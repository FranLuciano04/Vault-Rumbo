---
tipo: regla
estado: borrador
modulo: [viajes, economia, alertas]
responsable: Francisco
pc: pc2
actualizado: 21/10/26
---
# RN-06 Efectos de la cancelación del viaje

tags:: #tipo/regla #estado/borrador #pc/pc2

> Borrador del 21/10/26 (C1). Junta lo que ya fijan RF-050 a RF-053, formalizados el 29/09. Falta la aprobación del equipo.

## Enunciado
Cancelar un [[Viaje]] lo pasa a `cancelado` con motivo y fecha, y tiene efectos fijos sobre sus pagos, sus alertas y la comisión. El viaje nunca se borra ([[RN-04 Baja lógica]]).

## Efectos
- **Pagos:** todos los [[Pago|Pagos]] no cobrados, `pendiente` o `vencido`, pasan a `anulado`. Los cobrados quedan como están (RF-050).
- **Alertas:** se resuelven las [[Alerta|Alertas]] vigentes del viaje (RF-050).
- **Cobros ya registrados:** el sistema informa el importe cobrado y documenta el saldo. No procesa reembolsos ni penalidades (RF-052).
- **Comisión:**
  - Antes de empezar (`reservado`, `vendido` o `confirmado`): queda constancia de que la comisión proyectada **no se realiza** (RF-051).
  - Con el viaje `en curso`: es una interrupción, porque el servicio ya se prestó. La comisión **se mantiene** y la suma de los pagos pasa a reflejar lo cobrado (RF-051).

## Revertir la cancelación
Si fue un error, se puede reactivar el viaje (RF-053):
- vuelve al estado que tenía justo antes de cancelarse;
- sus pagos vuelven a `pendiente` o `vencido`, según la fecha;
- se reabren **solo** las alertas que cerró la cancelación;
- si se había anotado que la comisión no se realizaba, vuelve a quedar proyectada.

## Aplica en
- [[Viaje]] · [[Pago]] · [[Alerta]] · [[Usuario]]
- [[CU-27 Cancelar viaje]]

## Origen
RF-048 a RF-053 de [[Requisitos funcionales]]; flujo en [[DGM-ACT — Cancelar viaje]].
