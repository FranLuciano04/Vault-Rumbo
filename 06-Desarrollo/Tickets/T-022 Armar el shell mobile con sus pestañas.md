---
id: T-022
titulo: Armar el shell mobile con sus pestañas
modulo: M0 — Fundaciones
capa: mobile
estado: tomado
depende_de: [T-015, T-003]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [RNF-14, CU-24]
origen: plan
asignado: FranLucianoo
tomado_el: 21/10/26 17:28
rama: feature/T-022-armar-el-shell-mobile-con-sus-pestanas
pr:
---
# T-022 Armar el shell mobile con sus pestañas

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La app mobile tiene la navegación del prototipo con las pestañas Agenda, Clientes y Más, el tema con los tokens del Figma y la guarda de sesión que manda al login.

## Criterios de aceptación
- [ ] Expo Router con los grupos `(auth)` y `(pestanas)` y pantallas placeholder para agenda, clientes y más.
- [ ] El tema de NativeWind reproduce los tokens del sistema de diseño.
- [ ] Sin sesión, la app abre el login; con sesión, la agenda.

## Tests esperados
`describe('navegación mobile')`: con y sin sesión (mock de `/auth/yo`), las pestañas visibles.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 35, 57, 59 (PNG en `07-Entregables/Prototipo/img/`)
- [[Prototipo UI]] — «Sistema de diseño» y «Mobile completo»

## Archivos probables
- `src/apps/mobile/app/`
- `src/apps/mobile/tailwind.config.js`

## Fuera de alcance
- El login y el contenido de cada pestaña.

## Notas de implementación
