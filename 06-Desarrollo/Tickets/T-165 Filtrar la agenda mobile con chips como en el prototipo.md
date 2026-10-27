---
id: T-165
titulo: Filtrar la agenda mobile con chips como en el prototipo
modulo: M3 — Alertas
capa: mobile
estado: tomado
depende_de: [T-057]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-14, RF-074, RF-154, RNF-14]
origen: hallazgo T-057
asignado: palomap2003
tomado_el: 26/10/26 21:04
rama: feature/T-165-filtrar-la-agenda-mobile-con-chips-como
pr:
---
# T-165 Filtrar la agenda mobile con chips como en el prototipo

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La agenda mobile tiene, igual que en el prototipo, chips de filtro con contador: «Todas», «Atrasadas», «Hoy» y «Próximas». Así se puede adelantar trabajo desde el teléfono (CU-14 A5). Es un desvío del prototipo que quedó fuera de T-057 y que Francisco pidió completar el 25/10/26.

## Criterios de aceptación
- [ ] Hay chips «Todas», «Atrasadas», «Hoy» y «Próximas», cada uno con el total del servidor.
- [ ] Cada chip filtra la lista. «Próximas» pide `proximas=true` y sigue con la paginación de T-057.
- [ ] Los chips son accesibles: cada uno tiene su rol, indica si está seleccionado y anuncia su nombre con el contador.

## Tests esperados
`describe('RF-154 chips de la agenda mobile')` con el adaptador HTTP falso de `__tests__/agenda.test.tsx`.

## Contexto (leer solo esto)
- [[Prototipo UI]]: pantallas 35 y 55 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-14 Ver y atender alertas del día]]: A5
- `src/apps/mobile/src/features/alertas/AgendaMobile.tsx` (T-057)

## Archivos probables
- `src/apps/mobile/src/features/alertas/`

## Fuera de alcance
- El detalle de la alerta y posponer, que los hace T-058.

## Notas de implementación
