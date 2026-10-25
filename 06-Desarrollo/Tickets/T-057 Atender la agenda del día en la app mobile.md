---
id: T-057
titulo: Atender la agenda del día en la app mobile
modulo: M3 — Alertas
capa: mobile
estado: tomado
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
- [ ] Lista por tipo con contexto y progreso del día; estado vacío.
- [ ] Resolver con «Deshacer».
- [ ] Pull-to-refresh y estados de carga y error.

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
