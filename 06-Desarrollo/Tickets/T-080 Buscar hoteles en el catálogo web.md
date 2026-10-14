---
id: T-080
titulo: Buscar hoteles en el catálogo web
modulo: M5 — Hoteles y reseñas
capa: web
estado: libre
depende_de: [T-075, T-020]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-18, RF-106, RF-107, RF-109, RF-110]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-080 Buscar hoteles en el catálogo web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El catálogo de hoteles permite buscar y filtrar, ordena por valoración y muestra alternativas cuando no hay resultados.

## Criterios de aceptación
- [ ] Grilla con filtros, puntaje y orden.
- [ ] Estado sin resultados con alternativas.
- [ ] El `freelance` solo consulta (sin botón de alta).

## Tests esperados
`describe('RF-106 búsqueda de hoteles')`, `describe('RF-110 sin resultados')` con MSW por rol.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 21, 22, 44 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-18 Buscar y recomendar hoteles]]

## Archivos probables
- `src/apps/web/src/features/hoteles/`

## Fuera de alcance
- Detalle y formularios (tickets propios).

## Notas de implementación
