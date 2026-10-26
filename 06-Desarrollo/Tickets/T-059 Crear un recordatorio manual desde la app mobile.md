---
id: T-059
titulo: Crear un recordatorio manual desde la app mobile
modulo: M3 — Alertas
capa: mobile
estado: tomado
depende_de: [T-057]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-28, RF-080]
origen: plan
asignado: palomap2003
tomado_el: 26/10/26 20:20
rama: feature/T-059-crear-un-recordatorio-manual-desde-la-ap
pr:
---
# T-059 Crear un recordatorio manual desde la app mobile

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde la agenda del teléfono se crea un recordatorio con descripción y fecha.

## Criterios de aceptación
- [ ] Formulario con validación.
- [ ] Asociación opcional a un cliente.
- [ ] El recordatorio aparece en la agenda.

## Tests esperados
`describe('RF-080 recordatorio mobile')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 56 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-28 Crear recordatorio manual]]

## Archivos probables
- `src/apps/mobile/src/features/alertas/`

## Fuera de alcance
- —

## Notas de implementación
