---
id: T-124
titulo: Exportar los reportes a Excel o PDF
modulo: M8 — Calendario, dashboard y reportes
capa: backend
estado: hecho
depende_de: [T-123, T-068]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-22, RF-133]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 02/11/26 20:59
rama: feature/T-124-exportar-los-reportes-a-excel-o-pdf
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
- **Formato:**
  - **Excel:** título y período (`dd/mm/aa`) arriba, encabezados con el `titulo` de cada columna y una fila por dato. Importes `Decimal` en `#,##0.00`, enteros numéricos y margen numérico en `0.00`. El mes va en `mm/aa`. Si hay comparación, va un bloque «Período comparado» con sus propios encabezados.
  - **PDF:** lo genera WeasyPrint desde `plantillas/reporte.html`, A4 apaisado. Importes `1.000.000,50`, enteros `1.500`, margen `12,50 %`.
  - **Archivo:** se llama `<id>-AAAAMMDD-AAAAMMDD.<ext>` y viaja con `Content-Disposition: attachment`.
- **Seguridad:** en el Excel, las celdas de texto que empiezan con `=`, `+`, `-`, `@`, tab o CR se fuerzan a texto (`data_type = "s"`) para evitar la inyección de fórmulas. En el HTML del PDF rige el autoescape, y se siguen rechazando los recursos externos.
- **Sin cambio de contrato:** el margen y el mes se reconocen por la clave (`es_porcentaje`, `es_mes` en `servicios/reportes.py`). `TipoColumna` y `openapi.json` siguen iguales.
- **Refactor fuera del ticket:** `fecha`, `importe` y `pdf_desde_html` se movieron a `documentos/formato.py`, y `cotizacion.py` los reutiliza sin cambiar su comportamiento.
- **Dependencia:** se agregó `openpyxl` (3.1.5), con autorización de Nahuel, más el override de mypy por falta de stubs.
- **Tests tocados con autorización:** en `test_contrato_m8.py`, el test de xlsx/pdf ahora espera 200 con el tipo de contenido correcto.
- **PDF en Windows:** WeasyPrint no carga (falta `libgobject`, igual que en T-068), así que los tests que generan el PDF real los valida el CI en Linux. El contenido del PDF se testea sobre `html_reporte`, en `tests/negocio/test_documento_reporte.py`, y esos tests corren en cualquier PC.
- **Review (opus):** la primera ronda encontró 1 bloqueante (inyección de fórmulas), 2 importantes y 2 menores, todos arreglados en `0436de7`. La segunda ronda no encontró nada.
- **Modelos:** tests, implementación, refactor y fix con Sonnet; review con Opus. No hubo escalados.
