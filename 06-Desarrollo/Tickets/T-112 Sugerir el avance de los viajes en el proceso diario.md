---
id: T-112
titulo: Sugerir el avance de los viajes en el proceso diario
modulo: M7 — Proceso diario y CRM proactivo
capa: backend
estado: libre
depende_de: [T-110, T-096]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-08, RF-039]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-112 Sugerir el avance de los viajes en el proceso diario

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada noche, los viajes cuya fecha de salida o de regreso llegó generan una alerta `viaje` que sugiere pasarlos a en curso o finalizado; el cambio lo confirma una persona.

## Criterios de aceptación
- [ ] Alerta de sugerencia para los viajes que salen hoy (a en curso) o volvieron (a finalizado), al vendedor o responsable.
- [ ] No cambia el estado del viaje (A1: confirmación manual).
- [ ] Idempotente: una sola alerta por viaje y sugerencia.

## Tests esperados
`tests/negocio/test_jobs_viajes.py`: `test_rf039_sugiere_en_curso`, `test_rf039_sugiere_finalizado`, `test_no_cambia_estado`, `test_idempotente`.

## Contexto (leer solo esto)
- [[CU-08 Gestionar estado del viaje]] — A1
- [[EST-Viaje]]

## Archivos probables
- `src/backend/rumbo/negocio/servicios/proceso_diario.py`

## Fuera de alcance
- —

## Notas de implementación
