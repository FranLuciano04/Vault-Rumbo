---
tipo: regla
estado: borrador
modulo: [alertas, viajes, economia, cotizaciones]
responsable: Francisco
pc: pc2
actualizado: 21/10/26
---
# RN-08 Alertas automáticas y su anticipación

tags:: #tipo/regla #estado/borrador #pc/pc2

> Borrador del 21/10/26 (C1). Reúne en una tabla cuándo genera el sistema cada [[Alerta]] automática, según los RF formalizados el 29/09. Falta la aprobación del equipo.

## Enunciado
El sistema genera [[Alerta|Alertas]] sin intervención de una persona ante ciertos hechos, con una anticipación fija o configurable. Las alertas `insistencia` y `manual` no entran acá, porque las crea una persona (RF-015, RF-080).

## Tabla de alertas automáticas
| Tipo | Hecho que la genera | Cuándo avisa | Requisito |
|---|---|---|---|
| `formulario` | Se crea o confirma un [[Viaje]] a un [[Destino]] con [[RequisitoDestino|requisitos]] activos | Con la anticipación configurada en cada requisito; una alerta por requisito | RF-034 |
| `salida` | Se confirma la reserva | Antes de la salida; parámetro global, **7 días** por defecto | RF-035 |
| `pago` (cliente) | Se define el plan de cuotas | **Un mes** antes del vencimiento de cada [[Pago]] | RF-063 |
| `pago` (proveedor) | Un tramo del itinerario tiene vencimiento de pago al proveedor | **Un mes** antes de esa fecha | RF-045 |
| `viaje` | Llega el día de salida o el de regreso | Ese mismo día, para sugerir el cambio de estado ([[RN-05 Ciclo de vida del viaje]]) | RF-039 |
| `reseña` | El viaje pasa a `finalizado` | Al finalizar, para la post-venta | RF-041 |
| `recontacto` | El proceso diario de las 00:00 detecta un cliente sin compras ni viajes en unos **seis meses** (umbral configurable) y sin opt-out | Al detectarlo; nunca dos sin resolver para el mismo cliente | RF-027, RF-028 |

## Cierre automático
- Al atenderse el origen se resuelve la alerta: el cobro resuelve la de `pago` (RF-067), el pago al proveedor resuelve la suya (RF-047) y cerrar la [[Oportunidad]] resuelve sus insistencias (RF-018).
- Cancelar el viaje resuelve sus alertas vigentes ([[RN-06 Efectos de la cancelación del viaje]]).

## Aplica en
- [[Alerta]] · [[Viaje]] · [[Pago]] · [[RequisitoDestino]] · [[Cliente]]
- [[CU-07 Confirmar reserva]] · [[CU-08 Gestionar estado del viaje]] · [[CU-09 Armar itinerario de hoteles]] · [[CU-11 Definir plan de cuotas]] · [[CU-15 Configurar recordatorios por destino]] · [[CU-30 Sugerir recontacto de clientes]] · [[CU-14 Ver y atender alertas del día]]

## Origen
RF-027, RF-028, RF-034, RF-035, RF-039, RF-041, RF-045 y RF-063 de [[Requisitos funcionales]]; flujo diario en [[DGM-ACT — Proceso automático diario]].
