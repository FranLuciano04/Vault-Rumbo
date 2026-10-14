---
id: T-056
titulo: Crear un recordatorio manual en la web
modulo: M3 — Alertas
capa: web
estado: libre
depende_de: [T-055]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-28, RF-080, RF-081, RF-082]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-056 Crear un recordatorio manual en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde la agenda (o desde un cliente, oportunidad o viaje) se crea un recordatorio y se edita mientras está pendiente.

## Criterios de aceptación
- [ ] Formulario con descripción, fecha y asociación opcional.
- [ ] Edición de un recordatorio pendiente.
- [ ] Errores del servidor en sus campos.

## Tests esperados
`describe('RF-080 recordatorio')`, `describe('RF-082 edición')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 6 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-28 Crear recordatorio manual]]

## Archivos probables
- `src/apps/web/src/features/alertas/`

## Fuera de alcance
- —

## Notas de implementación
