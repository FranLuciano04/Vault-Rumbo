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

## Enunciado
El sistema genera [[Alerta|Alertas]] sin intervención de una persona ante determinados hechos, con una anticipación fija o configurable. Las alertas de tipo `insistencia` y `manual` no se incluyen, porque las crea una persona (RF-015, RF-080).

## Alertas automáticas
| Tipo | Hecho que la genera | Momento del aviso | Requisito |
|---|---|---|---|
| `formulario` | Se crea o confirma un [[Viaje]] a un [[Destino]] con [[RequisitoDestino\|requisitos]] activos | Con la anticipación configurada en cada requisito; una alerta por requisito | RF-034 |
| `salida` | Se confirma la reserva | Antes de la salida, según un parámetro global de 7 días por defecto | RF-035 |
| `pago` (cliente) | Se define el plan de cuotas | Un mes antes del vencimiento de cada [[Pago]] | RF-063 |
| `pago` (proveedor) | Un tramo del itinerario tiene fecha de vencimiento de pago al proveedor | Un mes antes de esa fecha | RF-045 |
| `viaje` | Llega el día de salida o el de regreso | Ese mismo día, para sugerir el cambio de estado ([[RN-05 Ciclo de vida del viaje]]) | RF-039 |
| `reseña` | El viaje pasa a `finalizado` | Al finalizar, para la post-venta | RF-041 |
| `recontacto` | El proceso diario detecta un cliente sin compras ni viajes durante unos seis meses (umbral configurable) y sin exclusión del recontacto | Al detectarlo; nunca dos alertas sin resolver para el mismo cliente | RF-027, RF-028 |

## Cierre automático
- Al atenderse el origen, la alerta se resuelve: el cobro resuelve la alerta de `pago` (RF-067), el registro del pago al proveedor resuelve la suya (RF-047) y el cierre de la [[Oportunidad]] resuelve sus insistencias (RF-018).
- La cancelación del viaje resuelve sus alertas vigentes ([[RN-06 Efectos de la cancelación del viaje]]).

## Aplica en
- Entidades: [[Alerta]] · [[Viaje]] · [[Pago]] · [[RequisitoDestino]] · [[Cliente]]
- Casos de uso: [[CU-07 Confirmar reserva]] · [[CU-08 Gestionar estado del viaje]] · [[CU-09 Armar itinerario de hoteles]] · [[CU-11 Definir plan de cuotas]] · [[CU-15 Configurar recordatorios por destino]] · [[CU-30 Sugerir recontacto de clientes]] · [[CU-14 Ver y atender alertas del día]]

## Origen
RF-027, RF-028, RF-034, RF-035, RF-039, RF-041, RF-045 y RF-063 de [[Requisitos funcionales]]. El proceso diario está en [[DGM-ACT — Proceso automático diario]].

## 🔎 Revisión
> Borrador del 21/10/26 (Francisco, recomendado C1 del PC1). Reúne en una tabla las alertas automáticas que ya fijaban esos RF, formalizados el 29/09. Falta la aprobación del equipo.
