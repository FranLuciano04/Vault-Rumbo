---
id: T-055
titulo: Atender la agenda del día en la web
modulo: M3 — Alertas
capa: web
estado: libre
depende_de: [T-050, T-020]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-14, RF-074, RF-076, RF-077, RF-078, RF-154, RF-155]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-055 Atender la agenda del día en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La agenda del día es la pantalla de inicio: muestra las alertas con su tipo y contexto, el progreso del día, y permite resolver (con «Deshacer»), posponer y ver las próximas. Admin y dueña ven la de toda la agencia.

## Criterios de aceptación
- [ ] Lista por tipo con contexto y progreso del día; estado vacío (A3).
- [ ] Resolver con aviso de «Deshacer» (el envío se demora unos segundos) y posponer con fecha.
- [ ] Vista de toda la agencia con responsable para `admin`/`dueno`; pestaña de próximas.

## Tests esperados
`describe('RF-074 agenda')`, `describe('RF-076 resolver con deshacer')`, `describe('RF-077 posponer')`, `describe('RF-078 agenda de la agencia')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 3, 4, 5, 37, 49, 50 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-14 Ver y atender alertas del día]]

## Archivos probables
- `src/apps/web/src/features/alertas/`

## Fuera de alcance
- Sugerencia de recontacto (M7).

## Notas de implementación
