---
id: T-123
titulo: Generar los reportes del período
modulo: M8 — Calendario, dashboard y reportes
capa: backend
estado: libre
depende_de: [T-119, T-121]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-22, RF-131, RF-132, RF-134, RF-135]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-123 Generar los reportes del período

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña generan los reportes del catálogo para un período, los comparan con otro período y reciben un resultado claro cuando no hay datos.

## Criterios de aceptación
- [ ] `GET /reportes` (catálogo) y `GET /reportes/{id}` en JSON, solo `admin`/`dueno`.
- [ ] Comparación entre dos períodos (A2, RF-134).
- [ ] Período sin datos (A3, RF-135); reporte mensual recurrente según A1.

## Tests esperados
`tests/api/test_reportes.py`: `test_rf131_generar`, `test_rf134_comparar`, `test_rf135_sin_datos`, roles.

## Contexto (leer solo esto)
- [[CU-22 Generar reportes y estadísticas]]
- Contrato: `src/packages/shared/openapi.json` (módulo `dashboard`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/reportes.py`
- `src/backend/rumbo/presentacion/routers/dashboard.py`

## Fuera de alcance
- Exportar (ticket siguiente).

## Notas de implementación
