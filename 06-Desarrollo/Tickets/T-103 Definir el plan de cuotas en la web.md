---
id: T-103
titulo: Definir el plan de cuotas en la web
modulo: M6 — Viajes y economía
capa: web
estado: libre
depende_de: [T-102]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-11, RF-059, RF-060, RF-061, RF-064, RF-065, RF-066]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-103 Definir el plan de cuotas en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
En la ficha del viaje se define el plan de cuotas (con la suma controlada en vivo), se rebalancea y se reprograma, anula o divide un pago.

## Criterios de aceptación
- [ ] Editor del plan con seña, cuotas y saldo; la suma tiene que igualar el precio de venta antes de guardar.
- [ ] Acciones por pago: reprogramar, anular y dividir.
- [ ] Aviso de plan desbalanceado tras cambiar el precio (A5).

## Tests esperados
`describe('RF-061 suma del plan')`, `describe('RF-065 reprogramar')`, `describe('RF-066 anular')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 15 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-11 Definir plan de cuotas]]

## Archivos probables
- `src/apps/web/src/features/viajes/plan/`

## Fuera de alcance
- Cobros (ticket propio).

## Notas de implementación
