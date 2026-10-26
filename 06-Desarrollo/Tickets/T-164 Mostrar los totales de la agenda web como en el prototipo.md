---
id: T-164
titulo: Mostrar los totales de la agenda web como en el prototipo
modulo: M3 — Alertas
capa: web
estado: hecho
depende_de: [T-055]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-14, RF-074, RF-154]
origen: hallazgo T-055
asignado: FranLucianoo
tomado_el: 25/10/26 21:03
rama: feature/T-164-mostrar-los-totales-de-la-agenda-web-com
pr:
---
# T-164 Mostrar los totales de la agenda web como en el prototipo

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La agenda web muestra, igual que en el prototipo, las tarjetas «Atrasadas N» y «Para hoy N» junto al progreso, y cuatro pestañas con su contador: «Todas», «Atrasadas», «Hoy» y «Próximas». Los totales son los reales del servidor, no los de la página cargada. Es un desvío del prototipo que aceptó la review de T-055 y que Francisco pidió completar el 25/10/26.

## Criterios de aceptación
- [x] Las tarjetas «Atrasadas» y «Para hoy» muestran los totales del servidor (con `hasta` y `proximas`; `por_pagina: 1` alcanza para leer `total`).
- [x] Hay cuatro pestañas con su contador: «Todas» (atrasadas y de hoy), «Atrasadas», «Hoy» y «Próximas». Cada una filtra la lista.
- [x] Para admin y dueña, los totales son los de la agencia, o los del responsable si se lo filtró.

## Tests esperados
`describe('RF-074 totales de la agenda')` y `describe('RF-154 pestañas con contador')` con MSW, con el reloj fijo como en `PaginaAgenda.test.tsx`.

## Contexto (leer solo esto)
- [[Prototipo UI]]: pantallas 3 y 49 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-14 Ver y atender alertas del día]]
- `src/apps/web/src/features/alertas/PaginaAgenda.tsx` (T-055)

## Archivos probables
- `src/apps/web/src/features/alertas/`

## Fuera de alcance
- El panel de detalle lateral, que lo hace T-166.

## Notas de implementación
- **Implementación (25/10/26):** la agenda web suma las tarjetas «Atrasadas» y «Para hoy» (`<dl>` dentro de un `role="group"`) y cuatro pestañas con contador: «Todas», «Atrasadas», «Hoy» y «Próximas». Cada pestaña pide su propia lista y tiene su estado vacío. Los totales salen de `useTotalesAgenda`, que hace pedidos con `por_pagina: 1`.
- **Decisión del orquestador:** cada contador cuenta lo mismo que mostraría la lista de esa pestaña con los filtros activos.
  - Respeta el responsable y el tipo.
  - Suma las alertas vistas solo si «Mostrar vistas» está activo.
  - Mientras corre el «Deshacer», descuenta las resueltas que están esperando.
- **Falla arreglada en la misma rama (DEC-0019):** con más de 100 atrasadas, la pestaña «Hoy» quedaba vacía, porque la API no tenía un límite inferior de fecha. Se agregó el filtro `desde` a `GET /api/alertas` en backend, contrato, shared y mock. Ahora «Hoy» pide `desde=hoy&hasta=hoy`.
- `useAlertas` acepta `{ enabled }`, que es retrocompatible.
- **Review (opus):** 0 bloqueantes, 2 importantes y 5 menores.
  - Importantes: el estado vacío era incorrecto en «Atrasadas» y en «Hoy», y los contadores no respetaban el filtro de tipo ni las vistas.
  - Menores: un pedido redundante, el desfase durante el «Deshacer», la accesibilidad de «cargando» y faltaba el test de `hasta < desde`.
  - **Se mantiene a propósito:** el «· N» de los encabezados en «Todas», porque lo fijan los tests de T-055.
- **Modelos:** sonnet para tests e implementación (sin refactor aparte); opus para la review.
