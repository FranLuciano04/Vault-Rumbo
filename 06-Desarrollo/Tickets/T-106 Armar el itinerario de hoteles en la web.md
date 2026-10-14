---
id: T-106
titulo: Armar el itinerario de hoteles en la web
modulo: M6 — Viajes y economía
capa: web
estado: libre
depende_de: [T-102, T-075]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-09, RF-043, RF-044, RF-046, RF-047]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-106 Armar el itinerario de hoteles en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
En la ficha del viaje se arma el itinerario eligiendo hoteles del catálogo por tramo, se editan o quitan tramos y se marca el pago al proveedor.

## Criterios de aceptación
- [ ] Lista de tramos con buscador de hoteles del catálogo.
- [ ] Edición y baja de tramos; validación de fechas.
- [ ] Marca de pagado al proveedor.

## Tests esperados
`describe('RF-043 itinerario')`, `describe('RF-047 pago a proveedor')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 17 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-09 Armar itinerario de hoteles]]

## Archivos probables
- `src/apps/web/src/features/viajes/itinerario/`

## Fuera de alcance
- —

## Notas de implementación
