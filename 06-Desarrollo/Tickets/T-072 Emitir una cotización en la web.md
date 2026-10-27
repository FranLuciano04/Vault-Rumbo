---
id: T-072
titulo: Emitir una cotización en la web
modulo: M4 — Oportunidades y cotizaciones
capa: web
estado: tomado
depende_de: [T-071]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-06, RF-021, RF-022, RF-024]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 27/10/26 18:38
rama: feature/T-072-emitir-una-cotizacion-en-la-web
pr:
---
# T-072 Emitir una cotización en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde la oportunidad se emite una cotización con el formulario del prototipo y se ven sus versiones.

## Criterios de aceptación
- [ ] Formulario con importes y moneda, vigencia calculada visible.
- [ ] Lista de versiones con su estado.
- [ ] Vista del `freelance` (pantalla 41).

## Tests esperados
`describe('RF-021 emitir cotización')`, `describe('RF-024 versiones')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 13, 41 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-06 Emitir cotización]]

## Archivos probables
- `src/apps/web/src/features/oportunidades/cotizaciones/`

## Fuera de alcance
- Recomendación de hoteles (M5).

## Notas de implementación
