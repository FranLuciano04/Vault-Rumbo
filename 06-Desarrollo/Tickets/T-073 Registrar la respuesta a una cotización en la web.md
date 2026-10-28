---
id: T-073
titulo: Registrar la respuesta a una cotización en la web
modulo: M4 — Oportunidades y cotizaciones
capa: web
estado: tomado
depende_de: [T-072]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-06, RF-023, RF-025]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 27/10/26 22:54
rama: feature/T-073-registrar-la-respuesta-a-una-cotizacion
pr:
---
# T-073 Registrar la respuesta a una cotización en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se marca una cotización como enviada, se registra la aceptación o el rechazo y se descarga su PDF.

## Criterios de aceptación
- [ ] Botones según el estado de la cotización.
- [ ] Rechazo con motivo.
- [ ] Descarga del PDF.

## Tests esperados
`describe('RF-023 enviar')`, `describe('RF-025 aceptar o rechazar')` con MSW.

## Contexto (leer solo esto)
- [[CU-06 Emitir cotización]] — A2 y A3
- [[EST-Cotización]]

## Archivos probables
- `src/apps/web/src/features/oportunidades/cotizaciones/`

## Fuera de alcance
- —

## Notas de implementación
