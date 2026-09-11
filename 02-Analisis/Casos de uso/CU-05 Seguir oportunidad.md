---
tipo: caso-uso
estado: en-revision
modulo: [clientes]
responsable: Francisco
pc: pc1
actualizado: 11/09/26
---
# CU-05 Seguir oportunidad

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
El empleado da seguimiento a una [[Oportunidad]] a lo largo del embudo: registra interacciones, agenda insistencias para no perder el lead y la cierra como **ganada** (deriva en reserva) o **perdida** (con motivo). Es el corazón del embudo de ventas del negocio ([[CU-01 De la consulta a la venta]]).

## Actor principal
[[Actores|empleado]] (el `responsable` de la [[Oportunidad]])

## Actores secundarios
- [[Actores|Pasajero / Cliente]] (externo: responde o no a la insistencia; no opera el sistema).

## Precondiciones
- El empleado está autenticado ([[CU-24 Iniciar sesión]]).
- Existe una [[Oportunidad]] en estado `nueva` o `cotizada` ([[CU-04 Registrar consulta]]).

## Flujo principal
1. El empleado abre la [[Oportunidad]] y revisa su contexto ([[Cliente]], destino, fechas, [[Cotización|Cotizaciones]] emitidas).
2. Registra una **interacción/nota** de seguimiento (qué se habló, próximos pasos).
3. Agenda una **insistencia**: el sistema crea una [[Alerta]] de tipo `insistencia` para volver a contactar en X días ([[CU-01 De la consulta a la venta]] A1).
4. Según avance, actualiza el estado: pasa a `cotizada` al emitir la [[Cotización]] ([[CU-06 Emitir cotización]]).
5. **Cierre:** marca la [[Oportunidad]] como `ganada` (continúa en [[CU-07 Confirmar reserva]]) o `perdida` (registra el **motivo**, de una lista fija: *precio · fechas/disponibilidad · desistió · compró en otra agencia · sin respuesta · otro* [texto libre]).
6. El sistema resuelve las [[Alerta|Alertas]] de insistencia pendientes al cerrarse la [[Oportunidad]].

## Flujos alternativos
- **A1 — El cliente no responde:** vence la insistencia sin respuesta → el sistema reagenda o el empleado reprograma un nuevo contacto.
- **A2 — Oportunidad perdida:** el cliente desiste o no hay acuerdo → estado `perdida` con motivo; queda en el historial para el embudo y reportes.
- **A3 — Reactivar:** un cliente que había desistido retoma → se reabre la `Oportunidad` (vuelve a `nueva`/`cotizada`) o se registra una nueva ([[CU-04 Registrar consulta]]).
- **A4 — Ganada sin cotización formal:** el cliente confirma sin cotización escrita → se cierra `ganada` y se continúa en [[CU-07 Confirmar reserva]].

## Postcondiciones
- La [[Oportunidad]] queda con su seguimiento registrado y en un estado de cierre (`ganada` / `perdida`) o en seguimiento activo con su insistencia agendada.
- Si se ganó, queda lista para confirmar la reserva ([[CU-07 Confirmar reserva]]).

## Reglas de negocio aplicadas
- (Ninguna regla económica en este CU; la comisión aplica recién al confirmar el [[Viaje]].)
- Los estados de la [[Oportunidad]] son `nueva · cotizada · ganada · perdida`; el seguimiento/insistencia se maneja con [[Alerta|Alertas]], sin un estado "en seguimiento" adicional (resuelve la duda de [[CU-04 Registrar consulta]]).
- Visibilidad: gestiona el `responsable`; legible por toda la agencia ([[DEC-0005 Autenticación y modelo de roles]]).

## Entidades del dominio involucradas
- [[Oportunidad]] · [[Cliente]] · [[Cotización]] · [[Alerta]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · (pendiente) diagrama de actividad del embudo.

## Decisiones asociadas
- [[DEC-0002 Modelar la consulta como Oportunidad]] · [[DEC-0005 Autenticación y modelo de roles]]

## 🔎 Revisión
> [!note] Francisco (11/09) — **definido:** (1) se mantienen los **4 estados** de [[Oportunidad]] sin "en_seguimiento" (la insistencia va por [[Alerta]]); (2) el **motivo de pérdida** es de **lista fija** (precio · fechas/disponibilidad · desistió · compró en otra agencia · sin respuesta · otro), para poder analizarlo en reportes ([[CU-22 Generar reportes y estadísticas]]).
