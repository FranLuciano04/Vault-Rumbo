---
id: T-117
titulo: Atender una sugerencia de recontacto en la app mobile
modulo: M7 — Proceso diario y CRM proactivo
capa: mobile
estado: libre
depende_de: [T-058]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-30, RF-029, RF-030]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-117 Atender una sugerencia de recontacto en la app mobile

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
En el teléfono, la sugerencia de recontacto muestra el cliente y permite llamarlo o escribirle, marcarlo para no recontactar o posponer.

## Criterios de aceptación
- [ ] Detalle de la sugerencia con acceso a la ficha y al contacto.
- [ ] No recontactar y posponer.
- [ ] Crear la consulta queda para la web (aviso).

## Tests esperados
`describe('RF-030 opt-out mobile')` con MSW.

## Contexto (leer solo esto)
- [[CU-30 Sugerir recontacto de clientes]]
- [[Prototipo UI]] — pantallas 53 (PNG en `07-Entregables/Prototipo/img/`)

## Archivos probables
- `src/apps/mobile/src/features/alertas/`

## Fuera de alcance
- Registrar consultas en mobile (fuera del alcance mobile).

## Notas de implementación
