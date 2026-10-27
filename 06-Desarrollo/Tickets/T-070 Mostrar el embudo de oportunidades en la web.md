---
id: T-070
titulo: Mostrar el embudo de oportunidades en la web
modulo: M4 — Oportunidades y cotizaciones
capa: web
estado: tomado
depende_de: [T-061, T-020]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-05, RF-016, RF-151]
origen: plan
asignado: palomap2003
tomado_el: 27/10/26 14:09
rama: feature/T-070-mostrar-el-embudo-de-oportunidades-en-la
pr:
---
# T-070 Mostrar el embudo de oportunidades en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El embudo muestra las oportunidades por estado, con filtros por responsable y «lo mío»; el `freelance` ve solo lo suyo.

## Criterios de aceptación
- [ ] Columnas por estado con tarjetas y totales.
- [ ] Filtros y acceso a la oportunidad.
- [ ] Vista del `freelance` (pantalla 34).

## Tests esperados
`describe('RF-016 embudo')` con MSW por rol.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 12, 34 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-05 Seguir oportunidad]]

## Archivos probables
- `src/apps/web/src/features/oportunidades/`

## Fuera de alcance
- Mover tarjetas arrastrando: los cambios de estado van por acciones explícitas.

## Notas de implementación
