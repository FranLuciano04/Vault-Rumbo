---
id: T-116
titulo: Atender una sugerencia de recontacto en la web
modulo: M7 — Proceso diario y CRM proactivo
capa: web
estado: libre
depende_de: [T-055, T-069]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-30, RF-028, RF-029, RF-030]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-116 Atender una sugerencia de recontacto en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La sugerencia de recontacto aparece en la agenda con el contexto del cliente y las tres decisiones: crear una consulta, no recontactar o posponer.

## Criterios de aceptación
- [ ] Tarjeta del prototipo con el historial resumido del cliente.
- [ ] Crear consulta abre el formulario precargado.
- [ ] No recontactar y posponer con confirmación.

## Tests esperados
`describe('RF-029 decisión de recontacto')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 7 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-30 Sugerir recontacto de clientes]]

## Archivos probables
- `src/apps/web/src/features/alertas/`

## Fuera de alcance
- —

## Notas de implementación
