---
id: T-102
titulo: Registrar la economía desde la ficha del viaje en la web
modulo: M6 — Viajes y economía
capa: web
estado: tomado
depende_de: [T-100]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-10, CU-08, RF-037, RF-054, RF-055, RF-056, RF-058]
origen: plan
asignado: palomap2003
tomado_el: 29/10/26 19:37
rama: feature/T-102-registrar-la-economia-desde-la-ficha-del
pr:
---
# T-102 Registrar la economía desde la ficha del viaje en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La ficha del viaje muestra su situación (estado, saldo, alertas) y la economía editable, con ganancia, margen y comisión calculadas; el `freelance` ve su comisión.

## Criterios de aceptación
- [ ] Encabezado con estado, fechas, cliente y saldo; secciones para economía, plan, itinerario y acciones.
- [ ] Formulario de economía con comisión precargada y override; advertencia de valores negativos.
- [ ] Vista del `freelance` (pantalla 43).

## Tests esperados
`describe('RF-054 economía')`, `describe('RF-058 advertencia')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 15, 43 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-10 Registrar economía del viaje]]
- [[RN-01 Comisión automática]]

## Archivos probables
- `src/apps/web/src/features/viajes/`

## Fuera de alcance
- Plan, cobros, itinerario y estados (tickets propios).

## Notas de implementación
