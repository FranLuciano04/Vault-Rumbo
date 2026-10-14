---
id: T-110
titulo: Armar el proceso diario idempotente
modulo: M7 — Proceso diario y CRM proactivo
capa: backend
estado: libre
depende_de: [T-006, T-011, T-051]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [RNF-05, RNF-13]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-110 Armar el proceso diario idempotente

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
`presentacion/jobs/diario.py` corre los pasos registrados del proceso automático; cada paso es idempotente, usa la fecha de hoy en `America/Argentina/Buenos_Aires` y deja la auditoría sin autor.

## Criterios de aceptación
- [ ] `uv run python -m rumbo.presentacion.jobs.diario [--fecha dd/mm/aa]` corre todos los pasos con la fecha indicada (para tests y demos) o la de hoy.
- [ ] Correrlo dos veces el mismo día no duplica efectos; un paso que falla no frena a los demás y el proceso termina con código de error.
- [ ] Cada paso corre en su propia transacción y registra en el log qué hizo.

## Tests esperados
`tests/negocio/test_jobs.py`: con un paso de prueba, `test_idempotente`, `test_fecha_en_zona_argentina`, `test_paso_que_falla_no_frena_los_demas`.

## Contexto (leer solo esto)
- [[ARQ — Vista general]] — `jobs.diario`
- [[Spec de implementación]] §8 (M7)

## Archivos probables
- `src/backend/rumbo/presentacion/jobs/diario.py`
- `src/backend/rumbo/negocio/servicios/proceso_diario.py`

## Fuera de alcance
- Los pasos concretos (tickets siguientes) y el cron (ticket de infra).

## Notas de implementación
