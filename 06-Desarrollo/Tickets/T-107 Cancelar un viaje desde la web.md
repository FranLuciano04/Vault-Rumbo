---
id: T-107
titulo: Cancelar un viaje desde la web
modulo: M6 — Viajes y economía
capa: web
estado: tomado
depende_de: [T-102]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-27, RF-048, RF-052, RF-053]
origen: plan
asignado: FranLucianoo
tomado_el: 30/10/26 13:53
rama: feature/T-107-cancelar-un-viaje-desde-la-web
pr:
---
# T-107 Cancelar un viaje desde la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se cancela un viaje con el diálogo del prototipo, que informa los cobros ya registrados, y se revierte una cancelación.

## Criterios de aceptación
- [ ] Diálogo de cancelación con los cobros registrados (A2).
- [ ] Viaje finalizado sin la acción (A1).
- [ ] Revertir cancelación.

## Tests esperados
`describe('RF-048 cancelar')`, `describe('RF-053 revertir')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 19 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-27 Cancelar viaje]]

## Archivos probables
- `src/apps/web/src/features/viajes/`

## Fuera de alcance
- —

## Notas de implementación
