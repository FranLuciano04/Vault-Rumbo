---
tipo: entidad
estado: formalizado
modulo: [alertas]
responsable:
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# Alerta

tags:: #tipo/entidad #estado/formalizado #pc/pc1

## Responsabilidad
Recordatorio automático para no perder vencimientos ni tareas: pagos, formularios por destino, próximas salidas, avance del viaje, insistencia, recontacto y reseñas post-viaje.

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| tipo | Enum | `pago · formulario · salida · insistencia · reseña · manual · recontacto · viaje` — `pago` (vencimiento de cuota/proveedor, [[CU-12 Registrar cobro de un pago]]/[[CU-09 Armar itinerario de hoteles]]), `formulario` (requisito de destino: visa, vacunación, documentación, seguro, voucher… la categoría fina la da [[RequisitoDestino]]`.tipo`, no se duplica acá — [[CU-07 Confirmar reserva]]/[[CU-15 Configurar recordatorios por destino]]), `salida` (aviso de próxima salida del viaje — [[CU-07 Confirmar reserva]]), `insistencia` ([[CU-05 Seguir oportunidad]]), `reseña` ([[CU-08 Gestionar estado del viaje]]), `manual` ([[CU-28 Crear recordatorio manual]]), `recontacto` ([[CU-30 Sugerir recontacto de clientes]]), `viaje` (sugerencia de pasar el [[Viaje]] a `en curso` o `finalizado`, generada por el proceso automático diario el día de salida y el de regreso — [[CU-08 Gestionar estado del viaje]]) |
| descripcion | Texto | Qué hay que hacer: la escribe el empleado en un recordatorio manual ([[CU-28 Crear recordatorio manual|CU-28]]) y la arma el sistema en las automáticas — [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] |
| fecha | Date (dd/mm/aa) | Cuándo dispara |
| estado | Enum | pendiente · vista · resuelta |
| resuelta_en | DateTime (opcional) | Cuándo se resolvió; vacío mientras no está `resuelta` y se limpia si se reabre. Sirve para el **progreso del día** de [[CU-14 Ver y atender alertas del día|CU-14]] (no alcanza con `updated_at`, que cambia con cualquier edición) — [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] |
| propietario | FK → [[Usuario]] | Quien la recibe/creó; define la agenda personal. Ver [[DEC-0005 Autenticación y modelo de roles]] |
| cerrada_por_cancelacion | Boolean | `true` si la resolvió la cancelación del [[Viaje]] ([[CU-27 Cancelar viaje]] paso 4). Al revertir la cancelación (A3) se reabren **solo** las alertas con esta marca, y la marca se limpia. Default `false` |
| origen | FK opcional, a lo sumo una | [[Viaje]], [[Pago]], [[Oportunidad]], [[Cliente]] o **tramo del itinerario** (`viaje_hotel`, para la alerta de pago al proveedor de [[CU-09 Armar itinerario de hoteles|CU-09]]); ninguna en una `manual` suelta — [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] |

## Relaciones
- *..1 con [[Viaje]] (o [[Oportunidad]] para insistencia, [[Pago]] para vencimientos)
- *..1 con [[Usuario]] (`propietario`) — ver [[DEC-0005 Autenticación y modelo de roles]]
- `manual`: asociación **opcional** a [[Viaje]], [[Cliente]] u [[Oportunidad]], o suelta — ver [[CU-28 Crear recordatorio manual]]

## Reglas / invariantes
- **Visibilidad:** por defecto cada empleado ve **sus** alertas (agenda del día); `admin`/`dueño` ven las de toda la empresa. Ver [[DEC-0005 Autenticación y modelo de roles]].
- **Fase 1 — aviso interno, envío manual:** la alerta se genera **dentro del sistema**; el mensaje al pasajero (WhatsApp) lo envía **una persona** cuando decide. La automatización configurable de WhatsApp queda **fuera de PC1** (ver [[Relevamiento — respuestas de la agencia (17-09)]], bloque 5, y [[Alcance y fuera de alcance]]).
- **`viaje`:** la genera el proceso automático diario (00:00) para el **responsable del [[Viaje]]**: el día de salida de un viaje `confirmado` y el de regreso de uno `en curso`. Solo sugiere; el cambio lo confirma el empleado ([[CU-08 Gestionar estado del viaje]]).
- **`recontacto`:** se asigna al **responsable del [[Cliente]]** (o a un `admin` si no tiene uno activo) y **no se duplica** mientras el cliente tenga otra sin resolver ([[CU-30 Sugerir recontacto de clientes]]).
- **El atraso no es un estado:** al vencer un [[Pago]], su alerta sigue `pendiente`; [[CU-14 Ver y atender alertas del día]] la muestra como atrasada porque su fecha ya pasó.
- **`salida`:** se genera automáticamente al confirmarse la reserva ([[CU-07 Confirmar reserva]]), con una anticipación sobre la fecha de salida del [[Viaje]]. La anticipación es un **parámetro de configuración global** (lo ajusta `admin`), con **default 7 días** (análogo a `anticipacion_dias` de [[RequisitoDestino]], pero uno por viaje en vez de por requisito). El valor de 7 días **quedó verificado con la agencia** (sync 29/09).

## Aparece en
- [[CU-01 De la consulta a la venta]] (flujos A1/A2/A3) · [[CU-07 Confirmar reserva]] · [[CU-14 Ver y atender alertas del día]] · [[MOD-Alertas]]

## 🔎 Revisión
> [!note] Nahuel (18/09) — **Cerrado el enum `tipo`** (pendiente que venía de la sync 17/09). Encontrada y resuelta una contradicción: la nota anterior (Paloma, 17/09) proponía 6 tipos granulares tomados literal del relevamiento (`documentacion · salida · requisito_destino · formulario_migratorio · seguro · voucher`), pero los CU ya escritos (CU-07, CU-14, CU-15, CU-28) usaban un único tipo genérico `formulario`, con la categoría fina ya cubierta por `RequisitoDestino.tipo`. Se mantiene `formulario` genérico (evita duplicar la categorización y no requiere reescribir esos 4 CU) y se suma `salida` como tipo propio para cubrir "próximas salidas" del relevamiento (bloque 5), que no tenía CU que lo generara. **Pendiente de ratificar en sync:** el valor de anticipación de `salida` (default **7 días configurable**, sin validar con la agencia — Q8 de la entrevista grill del 18/09).
