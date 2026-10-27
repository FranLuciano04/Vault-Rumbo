---
id: T-071
titulo: Seguir una oportunidad desde su detalle en la web
modulo: M4 — Oportunidades y cotizaciones
capa: web
estado: tomado
depende_de: [T-070]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-05, RF-014, RF-015, RF-017, RF-019, RF-020]
origen: plan
asignado: palomap2003
tomado_el: 27/10/26 15:18
rama: feature/T-071-seguir-una-oportunidad-desde-su-detalle
pr:
---
# T-071 Seguir una oportunidad desde su detalle en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El detalle de la oportunidad muestra su historia y permite registrar interacciones, agendar insistencias y cambiar su estado (en gestión, perder con motivo, reactivar, ganar).

## Criterios de aceptación
- [ ] Línea de tiempo de interacciones e insistencias.
- [ ] Acciones de estado solo cuando EST-Oportunidad las admite; perder pide el motivo.
- [ ] Los 409 se explican en un aviso.

## Tests esperados
`describe('RF-014 interacciones')`, `describe('RF-017 perder')`, `describe('RF-020 reactivar')` con MSW.

## Contexto (leer solo esto)
- [[CU-05 Seguir oportunidad]]
- [[EST-Oportunidad]]
- [[Prototipo UI]] — sistema de diseño (no hay pantalla propia)

## Archivos probables
- `src/apps/web/src/features/oportunidades/`

## Fuera de alcance
- Cotizaciones (ticket propio).

## Notas de implementación
