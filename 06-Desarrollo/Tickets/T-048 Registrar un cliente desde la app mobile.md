---
id: T-048
titulo: Registrar un cliente desde la app mobile
modulo: M2 — Clientes
capa: mobile
estado: libre
depende_de: [T-047]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-02, RF-001, RF-002, RF-003]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-048 Registrar un cliente desde la app mobile

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se registra un cliente desde el teléfono, con el mismo aviso de posible duplicado que en la web.

## Criterios de aceptación
- [ ] Formulario con validación de datos mínimos.
- [ ] Aviso de posible duplicado con confirmación.
- [ ] Tras el alta se abre la ficha.

## Tests esperados
`describe('RF-002 datos mínimos mobile')`, `describe('RF-003 duplicado mobile')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 58 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-02 Registrar cliente]]

## Archivos probables
- `src/apps/mobile/src/features/clientes/`

## Fuera de alcance
- —

## Notas de implementación
