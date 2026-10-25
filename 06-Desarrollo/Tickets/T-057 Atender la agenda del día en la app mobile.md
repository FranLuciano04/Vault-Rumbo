---
id: T-057
titulo: Atender la agenda del día en la app mobile
modulo: M3 — Alertas
capa: mobile
estado: hecho
depende_de: [T-050, T-022]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-14, RF-074, RF-076, RF-155, RNF-14]
origen: plan
asignado: FranLucianoo
tomado_el: 25/10/26 20:01
rama: feature/T-057-atender-la-agenda-del-dia-en-la-app-mobi
pr:
---
# T-057 Atender la agenda del día en la app mobile

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La pestaña Agenda muestra las alertas del día con el progreso, y permite resolverlas con «Deshacer», como en el prototipo mobile.

## Criterios de aceptación
- [x] Lista por tipo con contexto y progreso del día; estado vacío.
- [x] Resolver con «Deshacer».
- [x] Pull-to-refresh y estados de carga y error.

## Tests esperados
`describe('RF-074 agenda mobile')`, `describe('RF-076 resolver con deshacer')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 35, 55 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-14 Ver y atender alertas del día]]

## Archivos probables
- `src/apps/mobile/app/(pestanas)/agenda/`
- `src/apps/mobile/src/features/alertas/`

## Fuera de alcance
- Detalle y posponer (ticket siguiente).

## Notas de implementación
- **Implementación (25/10/26):** la pestaña Agenda de mobile ahora muestra `AgendaMobile`, en `src/features/alertas/`, en lugar del placeholder.
  - **Lista:** las alertas van en dos secciones, Atrasadas y Hoy, con su tipo, el contexto (incluido el pago con su moneda) y la antigüedad («Hace N días»). Se cargan con `useAlertasPorPaginas`, un nuevo `useInfiniteQuery` en shared, de a 100. Para traer más hay «Ver más» y también `onEndReached`; mientras falten páginas, los contadores muestran «N+».
  - **Progreso y estados:** muestra el progreso del día. Hay pull-to-refresh y estados de carga, error con «Reintentar» y vacío. Si no quedan pendientes pero sí alertas vistas, lo avisa.
  - **Resolver con «Deshacer»:** el envío espera 5 s. Si la app pasa a segundo plano o queda inactiva, se envía en el momento (`enviarPendientes`).
  - **Admin y dueña:** ven el responsable de cada alerta y los textos de la agencia.
  - **Accesibilidad:** «Deshacer: …», regiones vivas, `progressbar` y anuncios en iOS.
- **Movido a `@rumbo/shared` para compartir con la web:** `hoyEnBuenosAires`, `diasDeAtraso`, `lineaDeContexto`, `mensajeDeError` y `useResolverConDeshacer`, que ahora tiene `enviarPendientes`. La web los reexporta y no cambia su comportamiento.
- **Tests vecinos:** `navegacion.test.tsx` simula `AgendaMobile`. Se ajustó en un commit `test(T-057)`.
- **Review (opus), dos rondas:**
  - **Primera ronda:** 1 bloqueante (la paginación ignoraba `total`, el mismo caso de T-055) y 3 importantes (el envío al pasar a segundo plano, la vista de agencia y la accesibilidad). Todos se arreglaron.
  - **Segunda ronda:** 1 importante («Ver más» cancelaba la recarga después de resolver) y 4 menores. Todos se arreglaron.
- **Fuera de alcance:** posponer, marcar como vista, filtros y «Nuevo recordatorio» quedan para T-058 y T-059.
- **Modelos:** sonnet para tests, implementación y refactor (este último sin cambios); opus para la review. No hubo escalados.
