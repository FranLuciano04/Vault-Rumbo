---
tipo: caso-uso
estado: formalizado
modulo: [alertas]
responsable: Nahuel
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# CU-14 Ver y atender alertas del día

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

## Descripción
Consultar la agenda de [[Alerta|Alertas]] vigentes (pagos, formularios por destino, próximas salidas, insistencia y reseñas), atenderlas y marcarlas como resueltas.

## Actor principal
[[Actores|empleado]]

## Actores secundarios
- [[Actores|admin]] · [[Actores|dueño]] (ven las [[Alerta|Alertas]] de toda la empresa).

## Precondiciones
- El [[Usuario]] inició sesión ([[CU-24 Iniciar sesión]]).

## Flujo principal
1. El empleado abre la agenda de [[Alerta|Alertas]] del día.
2. El sistema lista las [[Alerta|Alertas]] vigentes (estado `pendiente`, **incluidas las que ya pasaron su `fecha`**), ordenadas por `fecha`, filtradas por propietario ([[DEC-0005 Autenticación y modelo de roles]]).
3. El empleado abre una [[Alerta]] y ve su contexto ([[Viaje]], [[Pago]] u [[Oportunidad]] asociada).
4. Realiza la acción correspondiente según el `tipo` (pago · formulario · salida · insistencia · reseña · manual · recontacto · viaje).
5. Marca la [[Alerta]] como `vista` o `resuelta`.

## Flujos alternativos
- **A1 — Rol admin/dueño:** el sistema muestra las [[Alerta|Alertas]] de toda la empresa, no solo la cartera propia.
- **A2 — Alerta de pago:** deriva a [[CU-12 Registrar cobro de un pago]]; al cobrar, la [[Alerta]] se resuelve sola.
- **A3 — Agenda vacía:** no hay [[Alerta|Alertas]] vigentes → el sistema muestra el día sin pendientes.
- **A4 — Posponer:** el empleado reprograma la `fecha` de la [[Alerta]] a un día posterior.

## Postcondiciones
- Las [[Alerta|Alertas]] atendidas quedan `vistas`/`resueltas`; las pospuestas, reagendadas.

## Reglas de negocio aplicadas
- Visibilidad por propietario ([[DEC-0005 Autenticación y modelo de roles]]).

## Entidades del dominio involucradas
- [[Alerta]] · [[Viaje]] · [[Pago]] · [[Oportunidad]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión

> [!note] Nahuel (21/09) — **corregido el paso 2: no existe un estado `vencida`.** La redacción anterior decía "vigentes (`pendiente` y `vencida`)", pero el enum `EstadoAlerta` es `pendiente · vista · resuelta`. Se resolvió que **una [[Alerta]] que pasó su fecha sin atenderse sigue `pendiente`**: el atraso es un criterio de **orden y filtro de la vista**, no un estado. A diferencia de [[Pago]], acá el atraso no tiene consecuencias de negocio (no hay exigibilidad), así que no justifica un estado propio. Detectado al especificar [[EST-Alerta]]. **Borrador a ratificar en la sync.**
> [!question] Nahuel (10/09): ¿"del día" es solo la fecha de hoy o incluye vencidas arrastradas? Asumo que la agenda muestra **vigentes hasta hoy** (pendientes + vencidas). Confirmar el criterio de posponer (A4).
>
> [!note] Francisco (11/09) — revisión de inconsistencias: **definido.** Coherente con [[DEC-0005 Autenticación y modelo de roles]] — la agenda filtra por `propietario` (empleado ve las suyas; `admin`/`dueño`, todas). Sin cambios de fondo. Nahuel: para tu conocimiento.
>
> [!note] Nahuel (18/09) — se cerró el enum `tipo` de [[Alerta]] sumando `salida` (aviso de próxima salida, [[CU-07 Confirmar reserva]]).
