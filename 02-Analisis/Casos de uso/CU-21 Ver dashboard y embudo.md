---
tipo: caso-uso
estado: en-revision
modulo: [dashboard]
responsable: Francisco
pc: pc1
actualizado: 11/09/26
---
# CU-21 Ver dashboard y embudo

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
El dueño (o admin) visualiza en un **tablero en vivo** el embudo de ventas y los indicadores del negocio (ventas, comisiones, viajes por estado, cobranzas), para tener la foto del momento y decidir. Es una vista de **solo lectura**.

## Actor principal
[[Actores|dueño]] (también `admin`)

## Actores secundarios
-

## Precondiciones
- El [[Usuario]] inició sesión con rol `admin` o `dueño` ([[CU-24 Iniciar sesión]], [[DEC-0005 Autenticación y modelo de roles]]).

## Flujo principal
1. El dueño abre el **dashboard**.
2. El sistema muestra el **embudo de ventas**: [[Oportunidad|Oportunidades]] por estado (`nueva · cotizada · ganada · perdida`) y la **tasa de conversión**.
3. Muestra los **indicadores del período**: ventas confirmadas y **comisiones** ([[RN-01 Comisión automática]]), [[Viaje|Viajes]] por estado, **pagos por cobrar / vencidos** ([[Pago]]) y alertas del día.
4. El dueño **filtra** por período y, opcionalmente, por empleado (`responsable`).
5. Desde un indicador, navega al detalle correspondiente ([[CU-05 Seguir oportunidad]], [[CU-08 Gestionar estado del viaje]], [[CU-14 Ver y atender alertas del día]]).

## Flujos alternativos
- **A1 — Vista del empleado:** un `empleado` ve el dashboard acotado a **lo suyo** (su embudo y sus indicadores), no al de toda la empresa ([[DEC-0005 Autenticación y modelo de roles]]). _(A validar si el empleado tiene dashboard propio en PC1.)_
- **A2 — Sin datos en el período:** el rango elegido no tiene actividad → el tablero se muestra vacío para ese período.

## Postcondiciones
- El [[Usuario]] obtiene la foto en vivo del negocio; **no se modifican datos** desde el dashboard (solo lectura y navegación).

## Reglas de negocio aplicadas
- Indicadores derivados de [[Oportunidad]], [[Viaje]], [[Pago]] y [[Cliente]]; no se almacenan, se calculan.
- Visibilidad: `admin`/`dueño` ven toda la empresa; el `empleado`, lo suyo ([[DEC-0005 Autenticación y modelo de roles]]).

## Entidades del dominio involucradas
- [[Oportunidad]] · [[Viaje]] · [[Pago]] · [[Cliente]] · [[Alerta]]

## Diagramas
- [[DGM — Casos de uso]] · (pendiente) diagrama de actividad / wireframe del dashboard.

## Decisiones asociadas
- [[DEC-0005 Autenticación y modelo de roles]] · [[DEC-0004 Comisión configurable por porcentaje]]

## 🔎 Revisión
> [!question] Francisco (11/09): especificado con un set estándar de indicadores. **A validar con la agencia** el **conjunto exacto de KPIs** que quieren ver (¿ranking de destinos?, ¿clientes top?, ¿ticket promedio?) y si el `empleado` tiene un dashboard propio (A1) o el tablero es solo para `admin`/`dueño` en PC1.
