---
id: T-132
titulo: Planificar contenido en el tablero web
modulo: M9 — Redes e IA
capa: web
estado: libre
depende_de: [T-129, T-020]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-19, RF-113, RF-114, RF-115, RF-116, RF-117]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-132 Planificar contenido en el tablero web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El módulo Redes muestra el tablero kanban y el calendario de publicaciones; se crean, editan, mueven, reprograman y descartan piezas.

## Criterios de aceptación
- [ ] Kanban por estado con acciones para avanzar o retroceder.
- [ ] Calendario de publicaciones.
- [ ] Solo visible con acceso a redes.

## Tests esperados
`describe('RF-114 kanban')`, `describe('RF-116 calendario')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 26 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-19 Planificar contenido en redes]]

## Archivos probables
- `src/apps/web/src/features/redes/`

## Fuera de alcance
- —

## Notas de implementación
