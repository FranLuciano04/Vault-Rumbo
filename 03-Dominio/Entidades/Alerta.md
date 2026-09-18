---
tipo: entidad
estado: borrador
modulo: [alertas]
responsable:
pc: pc1
actualizado: 18/09/26
---
# Alerta

tags:: #tipo/entidad #estado/borrador #pc/pc1

## Responsabilidad
Recordatorio automático para no perder vencimientos ni tareas: pagos, formularios por destino, próximas salidas, insistencia y reseñas post-viaje.

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| tipo | Enum | `pago · formulario · salida · insistencia · reseña · manual · recontacto` — `pago` (vencimiento de cuota/proveedor, [[CU-12 Registrar cobro de un pago]]/[[CU-09 Armar itinerario de hoteles]]), `formulario` (requisito de destino: visa, vacunación, documentación, seguro, voucher… la categoría fina la da [[RequisitoDestino]]`.tipo`, no se duplica acá — [[CU-07 Confirmar reserva]]/[[CU-15 Configurar recordatorios por destino]]), `salida` (aviso de próxima salida del viaje — [[CU-07 Confirmar reserva]]), `insistencia` ([[CU-05 Seguir oportunidad]]), `reseña` ([[CU-08 Gestionar estado del viaje]]), `manual` ([[CU-28 Crear recordatorio manual]]), `recontacto` ([[CU-30 Sugerir recontacto de clientes]]) |
| fecha | Date (dd/mm/aa) | Cuándo dispara |
| estado | Enum | pendiente · vista · resuelta |
| propietario | FK → [[Usuario]] | Quien la recibe/creó; define la agenda personal. Ver [[DEC-0005 Autenticación y modelo de roles]] |

## Relaciones
- *..1 con [[Viaje]] (o [[Oportunidad]] para insistencia, [[Pago]] para vencimientos)
- *..1 con [[Usuario]] (`propietario`) — ver [[DEC-0005 Autenticación y modelo de roles]]
- `manual`: asociación **opcional** a [[Viaje]], [[Cliente]] u [[Oportunidad]], o suelta — ver [[CU-28 Crear recordatorio manual]]

## Reglas / invariantes
- **Visibilidad:** por defecto cada empleado ve **sus** alertas (agenda del día); `admin`/`dueño` ven las de toda la empresa. Ver [[DEC-0005 Autenticación y modelo de roles]].
- **Fase 1 — aviso interno, envío manual:** la alerta se genera **dentro del sistema**; el mensaje al pasajero (WhatsApp) lo envía **una persona** cuando decide. La automatización configurable de WhatsApp queda **fuera de PC1** (ver [[Relevamiento — respuestas de la agencia (17-09)]], bloque 5, y [[Alcance y fuera de alcance]]).
- **`salida`:** se genera automáticamente al confirmarse la reserva ([[CU-07 Confirmar reserva]]), con una anticipación sobre la fecha de salida del [[Viaje]]. ⚠️ **Borrador sin validar:** propongo **7 días** por defecto (configurable a futuro, análogo a `anticipacion_dias` de [[RequisitoDestino]]); falta confirmar el valor con la agencia.

## Aparece en
- [[CU-01 De la consulta a la venta]] (flujos A1/A2/A3) · [[CU-07 Confirmar reserva]] · [[CU-14 Ver y atender alertas del día]] · [[MOD-Alertas]]

## 🔎 Revisión
> [!note] Nahuel (18/09) — **Cerrado el enum `tipo`** (pendiente que venía de la sync 17/09). Encontrada y resuelta una contradicción: la nota anterior (Paloma, 17/09) proponía 6 tipos granulares tomados literal del relevamiento (`documentacion · salida · requisito_destino · formulario_migratorio · seguro · voucher`), pero los CU ya escritos (CU-07, CU-14, CU-15, CU-28) usaban un único tipo genérico `formulario`, con la categoría fina ya cubierta por `RequisitoDestino.tipo`. Se mantiene `formulario` genérico (evita duplicar la categorización y no requiere reescribir esos 4 CU) y se suma `salida` como tipo propio para cubrir "próximas salidas" del relevamiento (bloque 5), que no tenía CU que lo generara. **Pendiente de ratificar en sync:** el valor de anticipación de `salida` (propuesto 7 días, sin validar con la agencia).
