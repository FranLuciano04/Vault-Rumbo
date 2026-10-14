---
id: T-084
titulo: Recomendar hoteles al emitir una cotización
modulo: M5 — Hoteles y reseñas
capa: web
estado: libre
depende_de: [T-072, T-080]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-06, CU-18, RF-106]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-084 Recomendar hoteles al emitir una cotización

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Al armar una cotización se pueden buscar hoteles del catálogo ordenados por valoración y sumarlos a la propuesta.

## Criterios de aceptación
- [ ] Buscador de hoteles dentro del formulario de cotización, filtrado por el destino de la oportunidad.
- [ ] Los hoteles elegidos quedan en el detalle de la cotización.
- [ ] Sin resultados, se muestran las alternativas.

## Tests esperados
`describe('RF-106 recomendación en la cotización')` con MSW.

## Contexto (leer solo esto)
- [[CU-06 Emitir cotización]] — A4
- [[CU-18 Buscar y recomendar hoteles]]

## Archivos probables
- `src/apps/web/src/features/oportunidades/cotizaciones/`

## Fuera de alcance
- —

## Notas de implementación
