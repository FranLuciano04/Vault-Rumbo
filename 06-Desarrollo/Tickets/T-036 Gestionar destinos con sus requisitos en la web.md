---
id: T-036
titulo: Gestionar destinos con sus requisitos en la web
modulo: M1 — Usuarios y configuración
capa: web
estado: libre
depende_de: [T-034]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-26, CU-15, RF-086, RF-089, RF-090, RF-091, RF-092]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-036 Gestionar destinos con sus requisitos en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña gestionan el catálogo de destinos y, dentro de cada uno, sus requisitos, desde la pestaña Destinos. Es el primer ABM web: fija el patrón de tabla, formulario y baja.

## Criterios de aceptación
- [ ] Listado con filtro de inactivos, alta y edición, baja y reactivación.
- [ ] Requisitos del destino: agregar, editar y quitar.
- [ ] Duplicados (409) y validaciones (422) mostrados en el formulario.

## Tests esperados
`describe('RF-089 destinos')`, `describe('RF-090 duplicado')`, `describe('RF-086 requisitos')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 32 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-26 Gestionar destinos]]
- [[CU-15 Configurar recordatorios por destino]]

## Archivos probables
- `src/apps/web/src/features/configuracion/destinos/`

## Fuera de alcance
- Operadores (ticket propio).

## Notas de implementación
