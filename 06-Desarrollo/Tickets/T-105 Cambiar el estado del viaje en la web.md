---
id: T-105
titulo: Cambiar el estado del viaje en la web
modulo: M6 — Viajes y economía
capa: web
estado: libre
depende_de: [T-102]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-08, RF-039, RF-042]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-105 Cambiar el estado del viaje en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde la ficha se pasa el viaje a en curso o finalizado, con la confirmación del prototipo, y se corrige un estado cargado por error.

## Criterios de aceptación
- [ ] Acciones disponibles según EST-Viaje.
- [ ] Confirmación del cambio (pantalla 16).
- [ ] Corrección al estado anterior.

## Tests esperados
`describe('RF-039 avanzar estado')`, `describe('RF-042 corregir')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 16 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-08 Gestionar estado del viaje]]
- [[EST-Viaje]]

## Archivos probables
- `src/apps/web/src/features/viajes/`

## Fuera de alcance
- —

## Notas de implementación
