---
tipo: caso-uso
estado: formalizado
modulo: [dashboard]
responsable: Francisco
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# CU-21 Ver dashboard y embudo

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

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
2. El sistema muestra el **embudo de ventas**: [[Oportunidad|Oportunidades]] por estado (`nueva · en_gestión · cotizada · ganada · perdida`) y la **tasa de conversión**.
3. Muestra los **indicadores del período** (KPIs definidos por la agencia, ver [[Relevamiento — respuestas de la agencia (17-09)]], bloque 2):
   - **Ventas del mes** y comparación con meses anteriores.
   - **Ganancia estimada** del mes ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]).
   - **Cobrado** vs. **pendiente de cobrar** a pasajeros, y **pendiente de pagar** a operadores ([[Pago]]).
   - **Próximos vencimientos** de pagos y **pasajeros/viajes próximos a salir**.
   - **Consultas/presupuestos pendientes** de seguimiento, **reservas confirmadas** y **presupuestos abiertos** ([[Oportunidad]]).
   - **Alertas** de pasajeros próximos a viajar (documentación, pagos, requisitos — [[Alerta]]).
   - **Analítica:** destinos más vendidos, pasajeros por destino, **ticket promedio** y **ventas por vendedor/freelancer**.
4. El dueño **filtra** por período y, opcionalmente, por empleado (`responsable`).
5. Desde un indicador, navega al detalle correspondiente ([[CU-05 Seguir oportunidad]], [[CU-08 Gestionar estado del viaje]], [[CU-14 Ver y atender alertas del día]]).

## Flujos alternativos
- **A1 — Vista acotada por propiedad:** un `empleado` puede ver su propio embudo/indicadores; un **`freelance`** ve **solo lo suyo** por diseño (visibilidad restringida, [[DEC-0008 Autenticación propia y rol de vendedor freelance]]). El tablero de empresa completo es de `admin`/`dueño` ([[DEC-0005 Autenticación y modelo de roles]]).
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
- [[DEC-0005 Autenticación y modelo de roles]] · [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] · [[DEC-0008 Autenticación propia y rol de vendedor freelance]]

## 🔎 Revisión
> [!question] Francisco (11/09): especificado con un set estándar de indicadores. **A validar con la agencia** el **conjunto exacto de KPIs** que quieren ver (¿ranking de destinos?, ¿clientes top?, ¿ticket promedio?) y si el `empleado` tiene un dashboard propio (A1) o el tablero es solo para `admin`/`dueño` en PC1.
> [!success] Paloma (17/09): **KPIs resueltos por la agencia** e incorporados al flujo principal (incluye ranking de destinos, pasajeros por destino, ticket promedio, ventas por vendedor y **pendiente a operadores**). La ganancia del dashboard sale del nuevo modelo económico ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]) y la vista del `freelance` de [[DEC-0008 Autenticación propia y rol de vendedor freelance]]. **Ratificado en la sync 17/09** junto con esas DEC.
