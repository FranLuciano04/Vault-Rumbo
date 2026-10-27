---
id: T-060
titulo: Probar de punta a punta la agenda de alertas
modulo: M3 — Alertas
capa: e2e
estado: tomado
depende_de: [T-053, T-054, T-055, T-056, T-025, T-164, T-166]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-14, CU-28]
origen: plan
asignado: palomap2003
tomado_el: 26/10/26 21:35
rama: feature/T-060-probar-de-punta-a-punta-la-agenda-de-ale
pr:
---
# T-060 Probar de punta a punta la agenda de alertas

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La agenda funciona contra el sistema real y la semilla de demo suma recordatorios ficticios.

## Criterios de aceptación
- [ ] Un empleado crea un recordatorio, lo ve en la agenda y lo resuelve; el progreso del día cambia.
- [ ] Posponer mueve la alerta a próximas.
- [ ] La admin ve la agenda de toda la agencia con responsables.

## Tests esperados
`e2e/alertas.spec.ts`: `RF-080 crear recordatorio`, `RF-076 resolver`, `RF-077 posponer`, `RF-078 agenda de la agencia`.

## Contexto (leer solo esto)
- [[CU-14 Ver y atender alertas del día]]
- [[CU-28 Crear recordatorio manual]]

## Archivos probables
- `src/apps/web/e2e/alertas.spec.ts`
- `src/backend/rumbo/datos/semillas/alertas.py`

## Fuera de alcance
- Mobile: prueba manual guiada en la barrera.

## Notas de implementación
