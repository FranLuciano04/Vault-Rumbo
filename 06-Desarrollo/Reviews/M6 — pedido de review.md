---
tipo: referencia
estado: formalizado
responsable: equipo
modulo: M6
actualizado: 30/10/26
---
# M6 — pedido de review

tags:: #tipo/referencia #estado/formalizado #pc/pc2

> Pedido de review del módulo **M6 — Viajes y economía** para Codex, según [[Review de módulo — rol de Codex]] y [[DEC-0014 Flujo de implementación con agentes|DEC-0014]]. Los hallazgos van en `06-Desarrollo/Reviews/M6 — review Codex.md`. El tag de cierre es `mod-6`.

## Alcance
M6 arma el `Viaje` y su economía, desde la reserva hasta la cancelación.

**Backend:**
- Confirmar la reserva desde una `Oportunidad` con su `Cotización` aceptada. Crea el `Viaje`, sus alertas por requisito del destino y la alerta de salida, y deja la oportunidad «Ganada».
- La máquina de estados del viaje: `reservado → vendido → confirmado → en_curso → finalizado`, más `cancelado` con su reversión.
- La máquina de estados del `Pago`.
- La economía del viaje: costo, operador, vendedor, ganancia, margen y comisión (RN-01, [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]]).
- El plan de pagos: seña, cuotas y saldo. Debe sumar el precio de venta (RN-02) y se puede reprogramar, dividir, anular y rebalancear.
- El cobro de un pago y su reversión.
- El itinerario de hoteles con el pago al proveedor de cada tramo ([[DEC-0003 Relación Viaje–Hotel y Reseña|DEC-0003]], [[DEC-0013 Datos que faltaban en el ER|DEC-0013]]).
- La cancelación con cobros y su reversión ([[DEC-0025 Pagos anulados por la cancelación|DEC-0025]]).
- El listado de viajes con su situación económica.

**Contrato y web:** todo lo anterior tiene contrato en `@rumbo/shared` y pantallas web: listado, ficha, economía, plan de pagos, cobro, estado, itinerario y cancelación. Además, el diálogo «Confirmar reserva» en la oportunidad.

**Pruebas e2e:** dos specs, el circuito completo de CU-01 y las excepciones del viaje, más una semilla de viajes de demo.

Revisá **solo los diffs de los merges de abajo** (`git diff <merge>^1 <merge>`). `main` ya tiene código posterior encima, así que si un archivo cambió después, el código vigente puede no ser el del merge. Si algo de M6 ya se corrigió más adelante, no lo reportes. Los hallazgos de M1 a M5 se arreglan aparte (`fix/M1-…` a `fix/M5-…`): no entran en esta review.

## Tickets y merges

| Ticket | Capa | Riesgo | Trazabilidad | Merge |
|---|---|---|---|---|
| [[T-086 Publicar el contrato de viajes y economía]] | contrato | normal | CU-07 a CU-12, CU-27, DEC-0007, DEC-0013 | `0fd328c` Merge pull request #87 from FranLuciano04/feature/T-086-publicar-el-contrato-de-viajes-y-economi |
| [[T-087 Implementar la máquina de estados del viaje]] | backend | ⚠️ alto | CU-08, CU-12, CU-27, RF-038, RF-040, RF-042 | `366cf25` Merge pull request #134 from FranLuciano04/feature/T-087-implementar-la-maquina-de-estados-del-vi |
| [[T-088 Implementar los estados del pago]] | backend | ⚠️ alto | CU-11, CU-12, RF-066, RF-067, RF-070 | `681e88a` Merge pull request #139 from FranLuciano04/feature/T-088-implementar-los-estados-del-pago |
| [[T-089 Confirmar la reserva creando el viaje]] | backend | ⚠️ alto | CU-07, RF-032 a RF-036, RNF-05 | `6fbff92` Merge pull request #156 from FranLuciano04/feature/T-089-confirmar-la-reserva-creando-el-viaje |
| [[T-090 Registrar la economía del viaje con su comisión]] | backend | ⚠️ alto | CU-10, RF-054 a RF-059, RN-01, DEC-0007, DEC-0004 | `effb881` Merge pull request #138 from FranLuciano04/feature/T-090-registrar-la-economia-del-viaje-con-su-c |
| [[T-091 Listar los viajes con su situación económica]] | backend | normal | CU-08, RF-037, RF-151 | `11963ed` Merge pull request #152 from FranLuciano04/feature/T-091-listar-los-viajes-con-su-situacion-econo |
| [[T-092 Definir el plan de pagos del viaje]] | backend | ⚠️ alto | CU-11, RF-059 a RF-064 | `f2aa9ac` Merge pull request #145 from FranLuciano04/feature/T-092-definir-el-plan-de-pagos-del-viaje |
| [[T-093 Ajustar los pagos de un plan ya definido]] | backend | ⚠️ alto | CU-11, RF-065, RF-066, RF-153 | `1ba4613` Merge pull request #159 from FranLuciano04/feature/T-093-ajustar-los-pagos-de-un-plan-ya-definido |
| [[T-094 Registrar el cobro de un pago del viaje]] | backend | ⚠️ alto | CU-12, RF-038, RF-067 a RF-069, RF-071, RF-072, RNF-05 | `9622928` Merge pull request #147 from FranLuciano04/feature/T-094-registrar-el-cobro-de-un-pago-del-viaje |
| [[T-095 Revertir un cobro registrado por error]] | backend | ⚠️ alto | CU-12, RF-070 | `fbdea7b` Merge pull request #155 from FranLuciano04/feature/T-095-revertir-un-cobro-registrado-por-error |
| [[T-096 Avanzar el estado del viaje a en curso o finalizado]] | backend | ⚠️ alto | CU-08, RF-039 a RF-042 | `0d666c0` Merge pull request #149 from FranLuciano04/feature/T-096-avanzar-el-estado-del-viaje-a-en-curso-o |
| [[T-097 Armar el itinerario de hoteles del viaje]] | backend | normal | CU-09, RF-043, RF-044, RF-046, RF-106, DEC-0003 | `2e888f7` Merge pull request #148 from FranLuciano04/feature/T-097-armar-el-itinerario-de-hoteles-del-viaje |
| [[T-098 Registrar el pago al proveedor de cada tramo]] | backend | ⚠️ alto | CU-09, RF-045, RF-047, DEC-0013 | `4f0b9b4` Merge pull request #160 from FranLuciano04/feature/T-098-registrar-el-pago-al-proveedor-de-cada-t |
| [[T-099 Cancelar un viaje con su reversión]] | backend | ⚠️ alto | CU-27, RF-048 a RF-053, RF-153 | `5007aed` Merge pull request #163 from FranLuciano04/feature/T-099-cancelar-un-viaje-con-su-reversion (y `3eee0a5`, merge de `main` en la rama) |
| [[T-100 Listar los viajes en la web]] | web | normal | CU-08, RF-037 | `afaec9d` Merge pull request #144 from FranLuciano04/feature/T-100-listar-los-viajes-en-la-web |
| [[T-101 Confirmar la reserva desde la oportunidad en la web]] | web | normal | CU-07, RF-032, RF-033, RF-036 | `0314aeb` Merge pull request #164 from FranLuciano04/feature/T-101-confirmar-la-reserva-desde-la-oportunida |
| [[T-102 Registrar la economía desde la ficha del viaje en la web]] | web | normal | CU-10, CU-08, RF-037, RF-054 a RF-056, RF-058 | `150b1ce` Merge pull request #146 from FranLuciano04/feature/T-102-registrar-la-economia-desde-la-ficha-del |
| [[T-103 Definir el plan de cuotas en la web]] | web | normal | CU-11, RF-059 a RF-061, RF-064 a RF-066 | `b686c6f` Merge pull request #151 from FranLuciano04/feature/T-103-definir-el-plan-de-cuotas-en-la-web |
| [[T-104 Registrar el cobro de un pago en la web]] | web | normal | CU-12, RF-067, RF-068, RF-070, RF-071 | `949cb3b` Merge pull request #153 from FranLuciano04/feature/T-104-registrar-el-cobro-de-un-pago-en-la-web |
| [[T-105 Cambiar el estado del viaje en la web]] | web | normal | CU-08, RF-039, RF-042 | `2a9126f` Merge pull request #154 from FranLuciano04/feature/T-105-cambiar-el-estado-del-viaje-en-la-web |
| [[T-106 Armar el itinerario de hoteles en la web]] | web | normal | CU-09, RF-043, RF-044, RF-046, RF-047 | `740a2ee` Merge pull request #150 from FranLuciano04/feature/T-106-armar-el-itinerario-de-hoteles-en-la-web |
| [[T-107 Cancelar un viaje desde la web]] | web | normal | CU-27, RF-048, RF-052, RF-053 | `f10a7be` Merge pull request #157 from FranLuciano04/feature/T-107-cancelar-un-viaje-desde-la-web |
| [[T-108 Probar de punta a punta el circuito de CU-01]] | e2e | normal | CU-01, RF-001, RF-010, RF-021, RF-032, RF-034, RF-035, RF-054, RF-060, RF-067, RF-151 | `f252acd` Merge pull request #166 from FranLuciano04/feature/T-108-probar-de-punta-a-punta-el-circuito-de-c |
| [[T-109 Probar de punta a punta las excepciones del viaje]] | e2e | normal | CU-09, CU-11, CU-12, CU-27 | `f31aea6` Merge pull request #169 from FranLuciano04/feature/T-109-probar-de-punta-a-punta-las-excepciones |

**Tamaño:** los 24 merges de PR suman 115 archivos distintos (+24.684 / −1.125 líneas, con las notas de tickets incluidas).

**T-099:** alcanza con el diff del merge del PR. El merge de `main` en la rama solo trae código de otros tickets.

**Migraciones:** M6 agrega dos.
- `0008_viaje_margen_mas_ancho` (T-090).
- `0009_pago_anulado_por_cancelacion` (T-099).

Las tablas `viaje`, `pago` y `viaje_hotel` vienen del esquema inicial (`0001`).

**Riesgo:** 12 de los 24 tickets son de riesgo alto (dinero y estados).

## Archivos tocados por el módulo
Unión de `git diff --name-only <merge>^1 <merge>` de los 24 merges, sin las notas de tickets ni de bitácoras.

**Backend (`src/backend/`)**
- Núcleo: `rumbo/main.py`, `rumbo/negocio/calculos.py`.
- Datos:
  - `rumbo/datos/modelos/comercial.py`;
  - `rumbo/datos/repositorios/{viajes,requisitos}.py`;
  - `rumbo/datos/semillas/{__init__,viajes}.py`;
  - `alembic/versions/{0008_viaje_margen_mas_ancho,0009_pago_anulado_por_cancelacion}.py`.
- Estados: `rumbo/negocio/estados/{viaje,pago,alerta,oportunidad}.py`.
- Servicios: `rumbo/negocio/servicios/{viajes,economia,itinerario,alertas}.py`.
- Presentación:
  - `rumbo/presentacion/contrato.py`;
  - `rumbo/presentacion/esquemas/{viajes,economia,comunes}.py`;
  - `rumbo/presentacion/routers/{viajes,economia}.py`.
- Tests:
  - `tests/api/test_{contrato_m6,viajes,viajes_estado,confirmar_reserva,economia,plan_pagos,cobros,itinerario,cancelacion}.py`;
  - `tests/negocio/test_{economia,estados_pago,estados_viaje,semilla_viajes}.py`;
  - `tests/test_modelos.py`.

**Contrato compartido (`src/packages/shared/`)**
- `openapi.json`, `src/tipos.gen.ts`, `src/modelos.ts`, `src/formato.ts` (con su test `formato.test.ts`).
- Hooks: `src/hooks/{index,viajes,economia,useUsuarios}.ts`.
- Mocks: `src/mocks/{index,viajes,economia}.ts`.

**Web (`src/apps/web/`)**
- Rutas: `src/app/{App,SeccionViajes,SeccionFichaViaje}.tsx`.
- `src/features/viajes/`:
  - `PaginaViajes.tsx`, `TablaViajes.tsx`, `FichaViaje.tsx`, `SeccionEconomia.tsx`, `AccionesDelViaje.tsx`, `CancelarViaje.tsx`, `calculos.ts`, `esquemas.ts`;
  - `plan/{PlanDePagos,EditorDelPlan,PanelDePago,CobroDePago,etiquetas}.ts(x)`;
  - `itinerario/{ItinerarioViaje,FormularioTramo,BuscadorHoteles,esquemas}.ts(x)`;
  - sus tests.
- Oportunidades (T-101): `src/features/oportunidades/{ConfirmarReserva,DialogoReserva,DetalleOportunidad,esquemas}.ts(x)` (con su test `ConfirmarReserva.test.tsx`).
- e2e: `e2e/{cu01,viajes-excepciones}.spec.ts`.

**Mobile:** M6 no toca mobile.

**Notas de diseño que cambiaron en el módulo:**
- T-090: [[RN-01 Comisión automática]].
- T-099: [[CU-27 Cancelar viaje]], [[Pago]], `05-Diseño/Datos/rumbo.sql`, los diagramas ER y de clases, y la nueva [[DEC-0025 Pagos anulados por la cancelación|DEC-0025]].

## Puntos que conviene mirar entre tickets
1. **Máquinas de estados del viaje y del pago (T-087, T-088, T-094 a T-096, T-099).**
   - Que `negocio/estados/{viaje,pago}.py` sean la única puerta de las transiciones. Que cobro, reversión, avance y cancelación no escriban el estado por fuera.
   - Que cada transición inválida dé 409 y no deje datos a medias.
   - Las derivaciones automáticas: `reservado → vendido` con el primer cobro, `→ confirmado` con saldo 0 y el retroceso al revertir un cobro (RF-070).
   - El chequeo `viaje_estado_previo_ck` y que `estado_previo` se limpie al revertir la cancelación.
   - `negocio/estados/{alerta,oportunidad}.py` cambiaron en este módulo: que no alteren lo que M3 y M4 ya cumplían.
2. **Dinero (T-090, T-092 a T-095, T-098).**
   - `Decimal` de punta a punta, sin `float`, también en `calculos.py` del backend y en `features/viajes/calculos.ts` y `formato.ts` del front.
   - El redondeo de margen y comisión y la migración `0008`, que amplía el margen.
   - Que `saldo_pendiente` y `pagado` se calculen igual en el listado (T-091), en la ficha y después de cada cobro, reversión o anulación.
   - RN-02: la suma de los pagos no anulados es igual al precio de venta al definir y al rebalancear, y qué pasa si cambia el precio de venta con cobros hechos.
   - Comisión con monto fijo o porcentaje (DEC-0007) y su efecto al cancelar (RF-051).
3. **Cancelación y su reversión (T-099, T-107, DEC-0025).**
   - Que solo se anulen los pagos pendientes, marcados como anulados por la cancelación (migración `0009`), y que al revertir se reactiven solo esos, nunca uno anulado a mano antes.
   - Que las alertas que cierra la cancelación sean las únicas que se reabren.
   - Que un viaje `finalizado` o `en_curso` no se cancele.
   - Que el diálogo de la web informe lo cobrado con el mismo cálculo que el backend.
4. **Atomicidad (T-089, T-094, RNF-05).**
   - Confirmar la reserva crea el viaje, la economía inicial, el plan, las alertas por requisito y la de salida, y marca la oportunidad «Ganada». Que sea una sola transacción, sin viaje a medias si algo falla.
   - Lo mismo con el cobro, que actualiza el pago, el estado del viaje y las alertas.
   - Las carreras: dos cobros simultáneos del mismo pago, o una doble confirmación de la misma oportunidad (¿un solo viaje por oportunidad?).
5. **Permisos y visibilidad (T-091, T-093, T-099, RF-151, RF-153, DEC-0005).**
   - Que un `freelance` no vea, liste ni modifique viajes, pagos ni tramos de otro vendedor, y que el 404 no filtre su existencia.
   - Quién puede anular pagos, cancelar y revertir (RF-153).
   - Que `AccionesDelViaje`, `CancelarViaje` y `PlanDePagos` oculten lo mismo que prohíbe el backend.
   - `useUsuarios.ts`, usado para elegir el vendedor, no debería exponer de más a un `freelance`.
6. **Alertas generadas por el viaje (T-089, T-092, T-094, T-096, T-099).**
   - Las alertas por requisito (A3), la de salida (RF-035), las de vencimiento de cada pago y la de reseña al finalizar (RF-041).
   - Sus fechas, su responsable, que se cierren o reabran con su pago o viaje, y que reprogramar un pago mueva su alerta.
   - Las alertas de pago llegan con `viaje_id = null` y `GET /alertas` no filtra por viaje: decir si es un hueco del contrato o está bien así.
7. **Itinerario y pago al proveedor (T-097, T-098, T-106, DEC-0003, DEC-0013).**
   - Tramos con hotel del catálogo (de baja incluido) y fechas dentro del viaje.
   - El pago al proveedor por tramo, separado de los pagos del cliente: que no entre en `saldo_pendiente` ni en RN-02.
8. **Contrato backend ↔ shared ↔ web (T-086 y los tickets de front).**
   - Que `openapi.json` y `tipos.gen.ts` coincidan con `esquemas/{viajes,economia}.py` después de T-087 a T-099.
   - Que `mocks/{viajes,economia}.ts` respondan los mismos códigos y cuerpos que el backend real (404, 409 por transición, 422 por campo o por RN-02), porque la web se desarrolló contra los mocks.
   - Que `hooks/{viajes,economia}.ts` invaliden listado, ficha, plan y alertas después de cada mutación.
   - T-101 pide la economía en el diálogo de reserva porque `ConfirmarReserva` la exige. Queda abierto exponer `viaje_id` en `Oportunidad`: no es hallazgo.
9. **Cambios fuera del módulo.**
   - T-089 tocó `servicios/alertas.py`, `repositorios/requisitos.py` y `esquemas/comunes.py`.
   - T-101 tocó `DetalleOportunidad.tsx` de M4.
   - `formato.ts` de shared lo usan otros módulos.
10. **Ya conocido, no hace falta reportarlo:** el aviso «El precio de venta cambió y los pagos ya no lo suman» (`PlanDePagos.tsx`, `SeccionEconomia.tsx`) aparece también al anular un pago aunque el precio no cambie. Salió en la review de T-109 y se arregla en el triage.
