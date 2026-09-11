---
tipo: caso-uso
estado: en-revision
modulo: [calendario]
responsable: Paloma
pc: pc1
actualizado: 10/09/26
---
# CU-23 Ver calendario de viajes y vencimientos

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
El empleado consulta en un **calendario** una vista consolidada de los [[Viaje|Viajes]] y de los vencimientos de [[Pago|Pagos]] y [[Alerta|Alertas]], para anticiparse a las fechas clave. Es una consulta de **solo lectura** con navegación a la gestión de cada ítem.

## Actor principal
[[Actores|empleado]]

## Actores secundarios
-

## Precondiciones
- El empleado está autenticado ([[CU-24 Iniciar sesión]]).

## Flujo principal
1. El empleado abre el **calendario**.
2. El sistema muestra, ubicados por fecha: los [[Viaje|Viajes]] (por su rango salida/regreso), los **vencimientos de [[Pago|Pagos]]** y las [[Alerta|Alertas]] programadas.
3. El empleado navega por **mes / semana / día**.
4. El empleado abre un evento para ver su detalle y, si corresponde, salta a su gestión: [[CU-08 Gestionar estado del viaje|Viaje]], [[CU-12 Registrar cobro de un pago|Pago]] o [[CU-14 Ver y atender alertas del día|Alerta]].

## Flujos alternativos
- **A1 — Filtrar:** el empleado filtra por **tipo** (viajes / pagos / alertas) o por **estado** (p. ej. solo pagos *pendientes* o *vencidos*, o viajes *en curso*).
- **A2 — Período sin eventos:** no hay ítems en el rango elegido → el calendario se muestra vacío para ese período.
- **A3 — Ir al detalle:** desde un evento, el empleado navega a la gestión correspondiente (viaje, pago o alerta).

## Postcondiciones
- El empleado obtiene la vista consolidada de fechas de **toda la agencia**; **no se modifican datos desde el calendario** (solo lectura y navegación a la gestión de cada ítem).

## Reglas de negocio aplicadas
- (Ninguna regla económica en este CU.)
- Vista de **solo lectura**: los cambios se hacen en el CU de gestión de cada entidad.

## Entidades del dominio involucradas
- [[Viaje]] · [[Pago]] · [[Alerta]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · (pendiente) diagrama de actividad de la consulta.

## 🔎 Revisión
> [!note] Paloma (10/09): (1) **Confirmado:** el calendario muestra los viajes/vencimientos de **toda la agencia** (coherente con la visibilidad de clientes y hoteles) → ratificar la visibilidad global en [[DEC-0005 Autenticación y modelo de roles]]. (2) **Confirmado:** para PC1, **solo lectura + navegación** (sin acciones rápidas desde el calendario).
