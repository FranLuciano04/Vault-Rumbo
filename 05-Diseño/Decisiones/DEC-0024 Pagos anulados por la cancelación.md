---
tipo: decision
estado: formalizado
modulo: [M6]
decisores: [Paloma, equipo]
fecha_aprobacion: 30/10/26
supersede:
actualizado: 30/10/26
---
# DEC-0024 Pagos anulados por la cancelación

tags:: #tipo/decision #estado/formalizado #pc/pc2

> ✅ **Decidida por Paloma y aprobada por el equipo el 30/10/26**, al implementar [[T-099 Cancelar un viaje con su reversión|T-099]].

## Contexto
[[CU-27 Cancelar viaje]] paso 4 anula los [[Pago|Pagos]] no cobrados del viaje. En A3, revertir la cancelación los devuelve a `pendiente` o `vencido` según su fecha. Para las [[Alerta|Alertas]], el CU aclara que se reabren **solo las que cerró la cancelación**, y eso se registra con `Alerta.cerrada_por_cancelacion` ([[DEC-0013 Datos que faltaban en el ER|DEC-0013]]). Para los pagos no dice nada.

Un pago puede estar `anulado` desde antes de la cancelación, por ejemplo por un ajuste del plan ([[CU-11 Definir plan de cuotas|CU-11]] A4, [[T-093 Ajustar los pagos de un plan ya definido|T-093]]). Si al revertir se reactivan todos los pagos anulados, vuelven a cobrarse pagos que ya no van y el plan deja de sumar el precio de venta.

Ningún dato existente sirve para distinguir los dos casos:
- `updated_at` no sirve si el viaje se edita mientras está cancelado.
- Las alertas no sirven, porque un pago puede no tenerla.
- `updated_by` no sirve, porque el mismo usuario puede anular un pago y después cancelar el viaje.

## Decisión
Se agrega `Pago.anulado_por_cancelacion` (booleano, por defecto `false`, con el CHECK `NOT anulado_por_cancelacion OR estado = 'anulado'`), en paralelo a `Alerta.cerrada_por_cancelacion`.
- Al **cancelar**, los pagos que se anulan quedan marcados.
- Al **revertir**, se restauran **solo los pagos marcados**, según su fecha, y la marca vuelve a `false`. Los anulados por otro motivo siguen anulados.
- El campo no se expone en el contrato de la API.
- **Concurrencia:** cancelar, revertir, cobrar y ajustar el plan bloquean primero el [[Viaje]] (`SELECT … FOR UPDATE`), así que no se pueden cruzar ni marcar un pago dos veces.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Columna `anulado_por_cancelacion` | Es exacta y simétrica con las alertas, y no cambia el contrato | Requiere una migración | ✅ |
| Revertir todos los anulados | No hay migración | Reactiva pagos anulados por un ajuste del plan, y el plan queda descuadrado | ❌ |
| Inferir el caso por `updated_at` o `updated_by` | No hay migración | Falla con ediciones posteriores o con el mismo usuario | ❌ |

## Consecuencias
- Hay una migración de Alembic nueva. Se actualizan [[Pago]], [[DGM-ER]] y `05-Diseño/Datos/rumbo.sql`.
- [[CU-27 Cancelar viaje]] A3 se lee como «vuelven los pagos que anuló la cancelación».
