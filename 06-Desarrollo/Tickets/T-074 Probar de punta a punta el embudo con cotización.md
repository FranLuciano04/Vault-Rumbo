---
id: T-074
titulo: Probar de punta a punta el embudo con cotización
modulo: M4 — Oportunidades y cotizaciones
capa: e2e
estado: libre
depende_de: [T-062, T-065, T-067, T-068, T-069, T-073, T-049]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-04, CU-05, CU-06]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-074 Probar de punta a punta el embudo con cotización

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El camino comercial funciona contra el sistema real y la semilla de demo suma oportunidades y cotizaciones ficticias.

## Criterios de aceptación
- [ ] Consulta con cliente nuevo → en gestión → cotización → enviada → aceptada, con PDF descargable.
- [ ] Perder con motivo y reactivar.
- [ ] El `freelance` solo ve sus oportunidades.

## Tests esperados
`e2e/oportunidades.spec.ts`: `RF-010 consulta`, `RF-021 cotización`, `RF-025 aceptación`, `RF-017 perder`, `RF-020 reactivar`.

## Contexto (leer solo esto)
- [[CU-04 Registrar consulta]]
- [[CU-05 Seguir oportunidad]]
- [[CU-06 Emitir cotización]]

## Archivos probables
- `src/apps/web/e2e/oportunidades.spec.ts`
- `src/backend/rumbo/datos/semillas/oportunidades.py`

## Fuera de alcance
- Confirmar la reserva (M6).

## Notas de implementación
