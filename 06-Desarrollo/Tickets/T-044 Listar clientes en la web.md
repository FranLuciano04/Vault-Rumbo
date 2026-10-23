---
id: T-044
titulo: Listar clientes en la web
modulo: M2 — Clientes
capa: web
estado: tomado
depende_de: [T-039, T-020]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-03, RF-005, RF-009, RF-031]
origen: plan
asignado: FranLucianoo
tomado_el: 23/10/26 10:46
rama: feature/T-044-listar-clientes-en-la-web
pr:
---
# T-044 Listar clientes en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada rol busca y lista clientes en la web, con filtro de texto, etiquetas y «lo mío», y entra a la ficha.

## Criterios de aceptación
- [ ] Tabla paginada con búsqueda y filtros del prototipo.
- [ ] El `freelance` ve su vista (pantalla 39) sin el filtro «lo mío».
- [ ] Estado vacío y de carga.

## Tests esperados
`describe('RF-005 búsqueda de clientes')`, `describe('RF-009 vista personal')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 8, 39 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-03 Gestionar ficha del cliente]] — paso 1

## Archivos probables
- `src/apps/web/src/features/clientes/`

## Fuera de alcance
- Alta y ficha (tickets propios).

## Notas de implementación
