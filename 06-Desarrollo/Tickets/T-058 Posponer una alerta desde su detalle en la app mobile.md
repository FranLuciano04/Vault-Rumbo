---
id: T-058
titulo: Posponer una alerta desde su detalle en la app mobile
modulo: M3 — Alertas
capa: mobile
estado: tomado
depende_de: [T-057]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-14, RF-075, RF-077]
origen: plan
asignado: palomap2003
tomado_el: 25/10/26 22:51
rama: feature/T-058-posponer-una-alerta-desde-su-detalle-en
pr:
---
# T-058 Posponer una alerta desde su detalle en la app mobile

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Al tocar una alerta se ve su detalle con el contexto del origen y se la puede posponer eligiendo una fecha.

## Criterios de aceptación
- [ ] Detalle con el contexto y acceso a la ficha del cliente si corresponde.
- [ ] Posponer con selector de fecha (solo futuras).
- [ ] Volver a la agenda actualizada.

## Tests esperados
`describe('RF-075 detalle')`, `describe('RF-077 posponer mobile')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 53, 54 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-14 Ver y atender alertas del día]] — A4

## Archivos probables
- `src/apps/mobile/src/features/alertas/`

## Fuera de alcance
- —

## Notas de implementación
