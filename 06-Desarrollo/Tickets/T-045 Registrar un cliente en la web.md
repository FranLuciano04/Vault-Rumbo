---
id: T-045
titulo: Registrar un cliente en la web
modulo: M2 — Clientes
capa: web
estado: libre
depende_de: [T-044]
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
# T-045 Registrar un cliente en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se registra un cliente desde la web; si el servidor avisa un posible duplicado, la persona ve los candidatos y decide.

## Criterios de aceptación
- [ ] Formulario con validación zod de los datos mínimos (A3).
- [ ] Aviso de posible duplicado con los candidatos y la opción de confirmar o ir al existente (A1).
- [ ] Tras el alta se abre la ficha.

## Tests esperados
`describe('RF-002 datos mínimos')`, `describe('RF-003 posible duplicado')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 9 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-02 Registrar cliente]]

## Archivos probables
- `src/apps/web/src/features/clientes/`

## Fuera de alcance
- Alta rápida desde una consulta (M4).

## Notas de implementación
