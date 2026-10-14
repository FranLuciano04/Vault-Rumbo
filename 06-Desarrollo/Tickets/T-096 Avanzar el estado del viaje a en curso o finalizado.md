---
id: T-096
titulo: Avanzar el estado del viaje a en curso o finalizado
modulo: M6 — Viajes y economía
capa: backend
estado: libre
depende_de: [T-086, T-087, T-051]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-08, RF-039, RF-040, RF-041, RF-042]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-096 Avanzar el estado del viaje a en curso o finalizado

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Una persona confirma que el viaje empezó o terminó, o corrige un estado cargado por error; al finalizar se agenda la reseña post-viaje.

## Criterios de aceptación
- [ ] `POST /viajes/{id}/iniciar|finalizar` aplican EST-Viaje (409 si no corresponde) y propagan el cambio según RF-040.
- [ ] Finalizar agenda la alerta `resena` post-viaje (RF-041).
- [ ] `POST /viajes/{id}/corregir-estado` vuelve al estado anterior (A2, RF-042).

## Tests esperados
`tests/api/test_viajes_estado.py`: `test_rf039_iniciar`, `test_rf039_finalizar`, `test_rf041_agenda_resena`, `test_rf042_corregir`, `test_transicion_invalida_409`.

## Contexto (leer solo esto)
- [[CU-08 Gestionar estado del viaje]]
- [[EST-Viaje]]
- Contrato: `src/packages/shared/openapi.json` (módulo `viajes`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/viajes.py`
- `src/backend/rumbo/presentacion/routers/viajes.py`

## Fuera de alcance
- La sugerencia automática por fecha (proceso diario, M7).

## Notas de implementación
