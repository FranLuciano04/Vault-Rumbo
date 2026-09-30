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

> [!question] Paloma (29/09) — **propuesta de A5, a aceptar por Nahuel** (responsable del CU) #accion/decidir. Surgió al diseñar el prototipo de la agenda: el empleado que termina lo del día puede querer adelantar trabajo. Texto propuesto para *Flujos alternativos*: **A5 — Ver próximas:** el empleado elige ver las [[Alerta|Alertas]] `pendientes` con `fecha` posterior a hoy, para adelantar trabajo. El sistema las lista ordenadas por `fecha`, con el mismo filtro por propietario, y el empleado puede atenderlas como en los pasos 3 a 5. Implica sumar **RF-154** (propuesto en la Revisión de [[Requisitos funcionales]]). El prototipo en Figma ya lo muestra (segmento «Próximas»).
>
> [!question] Paloma (29/09) — **propuesta de indicador de progreso del día, a aceptar por Nahuel** #accion/decidir. El prototipo de la agenda muestra «Llevás X de Y alertas resueltas» con una barra de avance, para que el empleado vea cuánto le falta del día. Para que el CU lo contemple:
> - **Paso 2**, agregar al final: *«Junto con la lista, muestra el progreso del día: cuántas [[Alerta|Alertas]] del propietario se resolvieron hoy sobre el total del día (las resueltas hoy más las vigentes).»*
> - **Postcondiciones**, agregar: *«El progreso del día se actualiza con cada [[Alerta]] resuelta, también cuando se resuelve sola (A2).»* Las pospuestas (A4) salen del total del día; marcar como `vista` no cuenta como avance.
> - **Modelo:** la [[Alerta]] necesita el atributo **`resuelta_en`** (fecha y hora; vacío mientras no está `resuelta`, se limpia si se reabre) para saber cuáles se resolvieron **hoy**. No alcanza con `updated_at`, que cambia por cualquier edición. Impacta en [[Alerta]], [[DGM — Diagrama de clases]] y [[DGM-ER]].
> - Implica sumar **RF-155** (propuesto en la Revisión de [[Requisitos funcionales]]).

> [!note] Nahuel (21/09) — **corregido el paso 2: no existe un estado `vencida`.** La redacción anterior decía "vigentes (`pendiente` y `vencida`)", pero el enum `EstadoAlerta` es `pendiente · vista · resuelta`. Se resolvió que **una [[Alerta]] que pasó su fecha sin atenderse sigue `pendiente`**: el atraso es un criterio de **orden y filtro de la vista**, no un estado. A diferencia de [[Pago]], acá el atraso no tiene consecuencias de negocio (no hay exigibilidad), así que no justifica un estado propio. Detectado al especificar [[EST-Alerta]]. **Borrador a ratificar en la sync.**
> [!question] Nahuel (10/09): ¿"del día" es solo la fecha de hoy o incluye vencidas arrastradas? Asumo que la agenda muestra **vigentes hasta hoy** (pendientes + vencidas). Confirmar el criterio de posponer (A4).
>
> [!note] Francisco (11/09) — revisión de inconsistencias: **definido.** Coherente con [[DEC-0005 Autenticación y modelo de roles]] — la agenda filtra por `propietario` (empleado ve las suyas; `admin`/`dueño`, todas). Sin cambios de fondo. Nahuel: para tu conocimiento.
>
> [!note] Nahuel (18/09) — se cerró el enum `tipo` de [[Alerta]] sumando `salida` (aviso de próxima salida, [[CU-07 Confirmar reserva]]).
