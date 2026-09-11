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
| tipo | Enum | pago · formulario · insistencia · reseña · manual — ver [[CU-28 Crear recordatorio manual]] |
| fecha | Date (dd/mm/aa) | Cuándo dispara |
| estado | Enum | pendiente · vista · resuelta |

## Relaciones
- *..1 con [[Viaje]] (o [[Oportunidad]] para insistencia, [[Pago]] para vencimientos)
- `manual`: asociación **opcional** a [[Viaje]], [[Cliente]] u [[Oportunidad]], o suelta — ver [[CU-28 Crear recordatorio manual]]

## Aparece en
- [[CU-01 De la consulta a la venta]] (flujos A1/A2/A3) · [[MOD-Alertas]]
