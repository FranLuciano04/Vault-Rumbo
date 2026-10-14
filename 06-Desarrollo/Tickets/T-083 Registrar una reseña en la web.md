---
id: T-083
titulo: Registrar una reseña en la web
modulo: M5 — Hoteles y reseñas
capa: web
estado: libre
depende_de: [T-082]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-17, RF-101, RF-102, RF-103, RF-105]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-083 Registrar una reseña en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde el detalle del hotel (o desde un viaje) se registra la reseña de un cliente y se la edita.

## Criterios de aceptación
- [ ] Formulario con cliente, viaje opcional, puntaje y comentario.
- [ ] Validación y errores del servidor.
- [ ] Edición de una reseña existente.

## Tests esperados
`describe('RF-101 reseña')`, `describe('RF-105 edición')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 25 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-17 Registrar reseña de hotel]]

## Archivos probables
- `src/apps/web/src/features/hoteles/`

## Fuera de alcance
- —

## Notas de implementación
