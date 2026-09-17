---
tipo: entidad
estado: borrador
modulo: [alertas]
responsable:
pc: pc1
actualizado: 09/09/26
---
# Alerta

tags:: #tipo/entidad #estado/borrador #pc/pc1

## Responsabilidad
Recordatorio automático para no perder vencimientos ni tareas: pagos, formularios por destino, insistencia y reseñas post-viaje.

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| tipo | Enum | pago · documentacion · salida · requisito_destino · formulario_migratorio · seguro · voucher · insistencia · reseña · manual · recontacto — `manual` ([[CU-28 Crear recordatorio manual]]), `recontacto` ([[CU-30 Sugerir recontacto de clientes]]). ⚠️ Tipos de aviso al pasajero ampliados según la agencia (17/09, ver [[Relevamiento — respuestas de la agencia (17-09)]], bloque 5); ratificar el enum con Nahuel |
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

## Aparece en
- [[CU-01 De la consulta a la venta]] (flujos A1/A2/A3) · [[MOD-Alertas]]
