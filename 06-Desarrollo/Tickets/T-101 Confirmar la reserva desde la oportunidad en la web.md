---
id: T-101
titulo: Confirmar la reserva desde la oportunidad en la web
modulo: M6 — Viajes y economía
capa: web
estado: tomado
depende_de: [T-086, T-071]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-07, RF-032, RF-033, RF-036]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 30/10/26 13:30
rama: feature/T-101-confirmar-la-reserva-desde-la-oportunida
pr:
---
# T-101 Confirmar la reserva desde la oportunidad en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde una oportunidad aceptada (o ganada sin cotización) se confirma la reserva y la persona sigue directo a la ficha del viaje para cargar la economía y el plan.

## Criterios de aceptación
- [ ] Diálogo de confirmación que exige destino y fechas (A3).
- [ ] Venta directa desde una oportunidad ganada sin cotización (A1).
- [ ] Tras confirmar, navega a la ficha del viaje (RF-036).

## Tests esperados
`describe('RF-032 confirmar reserva')`, `describe('RF-033 datos faltantes')` con MSW.

## Contexto (leer solo esto)
- [[CU-07 Confirmar reserva]]
- [[Prototipo UI]] — pantallas 15 (PNG en `07-Entregables/Prototipo/img/`)

## Archivos probables
- `src/apps/web/src/features/viajes/`
- `src/apps/web/src/features/oportunidades/`

## Fuera de alcance
- —

## Notas de implementación
