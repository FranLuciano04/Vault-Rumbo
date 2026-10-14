---
id: T-124
titulo: Exportar los reportes a Excel o PDF
modulo: M8 — Calendario, dashboard y reportes
capa: backend
estado: libre
depende_de: [T-123, T-068]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-22, RF-133]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-124 Exportar los reportes a Excel o PDF

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada reporte se descarga como Excel (openpyxl) o PDF (WeasyPrint) con el formato local.

## Criterios de aceptación
- [ ] Excel con encabezados, importes numéricos y fechas `dd/mm/aa`.
- [ ] PDF con la misma información.
- [ ] El tipo de contenido y el nombre del archivo son correctos.

## Tests esperados
`tests/api/test_reportes.py`: `test_rf133_excel` (se abre con openpyxl), `test_rf133_pdf`.

## Contexto (leer solo esto)
- [[CU-22 Generar reportes y estadísticas]]
- Contrato: `src/packages/shared/openapi.json` (módulo `dashboard`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/documentos/reportes.py`

## Fuera de alcance
- —

## Notas de implementación
