---
id: T-100
titulo: Listar los viajes en la web
modulo: M6 — Viajes y economía
capa: web
estado: libre
depende_de: [T-086, T-020]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-08, RF-037]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-100 Listar los viajes en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El listado de viajes muestra estado, fechas, cliente y saldo, con filtros y la vista propia del `freelance`.

## Criterios de aceptación
- [ ] Tabla con filtros por estado, fechas y «lo mío».
- [ ] Saldo y porcentaje pagado visibles.
- [ ] Vista del `freelance` (pantalla 42).

## Tests esperados
`describe('RF-037 listado de viajes')` con MSW por rol.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 14, 42 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-08 Gestionar estado del viaje]]

## Archivos probables
- `src/apps/web/src/features/viajes/`

## Fuera de alcance
- La ficha (ticket propio).

## Notas de implementación
