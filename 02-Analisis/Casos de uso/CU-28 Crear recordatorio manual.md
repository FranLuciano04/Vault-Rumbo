---
tipo: caso-uso
estado: formalizado
modulo: [alertas]
responsable: Nahuel
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# CU-28 Crear recordatorio manual

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

## Descripción
Crear una [[Alerta]] **manual**: un recordatorio propio del empleado no derivado de un evento automático (como un vencimiento de pago, un formulario del destino o la reseña post-viaje), opcionalmente asociado a un [[Viaje]], [[Cliente]] u [[Oportunidad]].

## Actor principal
[[Actores|empleado]]

## Actores secundarios
-

## Precondiciones
- El empleado está autenticado ([[CU-24 Iniciar sesión]]).

## Flujo principal
1. El empleado abre la agenda de [[Alerta|Alertas]] y elige **nuevo recordatorio**.
2. Carga la `fecha` (`dd/mm/aa`) y una descripción de la tarea.
3. Opcionalmente asocia el recordatorio a un [[Viaje]], [[Cliente]] u [[Oportunidad]].
4. El sistema crea la [[Alerta]] de `tipo = manual` en estado `pendiente`.
5. El recordatorio aparece en la agenda del día ([[CU-14 Ver y atender alertas del día]]).

## Flujos alternativos
- **A1 — Recordatorio personal:** sin asociación a ninguna entidad → queda como tarea suelta del empleado.
- **A2 — Reprogramar/editar:** mientras esté `pendiente`, el empleado cambia la fecha o la descripción.

## Postcondiciones
- Queda agendada una [[Alerta]] `manual`, visible y gestionable desde [[CU-14 Ver y atender alertas del día]].

## Reglas de negocio aplicadas
- Visibilidad por propietario: el recordatorio pertenece al empleado que lo creó ([[DEC-0005 Autenticación y modelo de roles]]).

## Entidades del dominio involucradas
- [[Alerta]] · [[Usuario]] · [[Viaje]] · [[Cliente]] · [[Oportunidad]] (asociación opcional)

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión
> [!question] Nahuel (10/09): cubre el gap de **alta manual** de [[Alerta]] (hoy todas son automáticas). Agrega `manual` al enum `tipo` de [[Alerta]]. **A validar en la sync:** el relevamiento original modela las alertas como automáticas; confirmar que el recordatorio manual entra en alcance PC1.
