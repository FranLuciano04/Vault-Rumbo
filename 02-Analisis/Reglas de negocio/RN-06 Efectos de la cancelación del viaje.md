---
tipo: regla
estado: formalizado
modulo: [viajes, economia, alertas]
responsable: Francisco
pc: pc2
actualizado: 21/10/26
fecha_aprobacion: 21/10/26
---
# RN-06 Efectos de la cancelación del viaje

tags:: #tipo/regla #estado/formalizado #pc/pc2

## Enunciado
Cancelar un [[Viaje]] lo pasa al estado `cancelado`, con motivo y fecha, y produce efectos fijos sobre sus pagos, sus alertas y la comisión del vendedor. El viaje nunca se elimina ([[RN-04 Baja lógica]]).

## Efectos
- **Pagos:** todos los [[Pago|Pagos]] no cobrados, en estado `pendiente` o `vencido`, pasan a `anulado`. Los pagos cobrados no se modifican (RF-050).
- **Alertas:** se resuelven las [[Alerta|Alertas]] vigentes del viaje (RF-050).
- **Cobros registrados:** el sistema informa el importe cobrado y documenta el saldo. No procesa reembolsos ni penalidades (RF-052).
- **Comisión del vendedor:**
  - Si el viaje no había comenzado (`reservado`, `vendido` o `confirmado`), queda constancia de que la comisión proyectada no se realiza (RF-051).
  - Si el viaje estaba `en curso`, la cancelación es una interrupción de un servicio ya prestado: la comisión se mantiene y la suma de los pagos pasa a reflejar lo cobrado (RF-051).

## Reversión de la cancelación
Si la cancelación fue un error, el viaje puede reactivarse (RF-053):
- vuelve al estado que tenía inmediatamente antes de la cancelación;
- sus pagos vuelven a `pendiente` o `vencido`, según su fecha;
- se reabren únicamente las alertas que había cerrado la cancelación;
- si se había registrado que la comisión no se realizaba, la comisión vuelve a quedar proyectada.

## Aplica en
- Entidades: [[Viaje]] · [[Pago]] · [[Alerta]] · [[Usuario]]
- Casos de uso: [[CU-27 Cancelar viaje]]

## Origen
RF-048 a RF-053 de [[Requisitos funcionales]]. El flujo está en [[DGM-ACT — Cancelar viaje]].

## 🔎 Revisión
> ✅ **Aprobado y formalizado en la sync del 21/10/26.** Redactado el 21/10/26 (Francisco, recomendado C1 del PC1). Reúne lo que ya fijaban RF-048 a RF-053, formalizados el 29/09.
