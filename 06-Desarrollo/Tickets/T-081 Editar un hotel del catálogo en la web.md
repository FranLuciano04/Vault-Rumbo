---
id: T-081
titulo: Editar un hotel del catálogo en la web
modulo: M5 — Hoteles y reseñas
capa: web
estado: libre
depende_de: [T-080]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-16, RF-097, RF-098, RF-099, RF-100]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-081 Editar un hotel del catálogo en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se da de alta un hotel, se lo edita o se lo da de baja desde la web, con el aviso de posible duplicado.

## Criterios de aceptación
- [ ] Formulario con validación de datos mínimos.
- [ ] Aviso de posible duplicado con confirmación.
- [ ] Baja con confirmación.

## Tests esperados
`describe('RF-097 alta de hotel')`, `describe('RF-099 duplicado')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 23 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-16 Gestionar hotel en catálogo]]

## Archivos probables
- `src/apps/web/src/features/hoteles/`

## Fuera de alcance
- —

## Notas de implementación
