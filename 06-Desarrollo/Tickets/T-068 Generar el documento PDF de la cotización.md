---
id: T-068
titulo: Generar el documento PDF de la cotización
modulo: M4 — Oportunidades y cotizaciones
capa: backend
estado: tomado
depende_de: [T-066]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-06, RF-021, RNF-16]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 28/10/26 13:29
rama: feature/T-068-generar-el-documento-pdf-de-la-cotizacio
pr:
---
# T-068 Generar el documento PDF de la cotización

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada cotización se descarga como PDF con el formato de la agencia (importes en su moneda, fechas `dd/mm/aa`, vigencia).

## Criterios de aceptación
- [ ] `GET /cotizaciones/{id}/documento` responde `application/pdf` generado con WeasyPrint desde una plantilla HTML versionada.
- [ ] El documento muestra cliente, detalle, importes, moneda y vigencia con el formato local.
- [ ] Una cotización no visible → 404.

## Tests esperados
`tests/api/test_cotizacion_pdf.py`: `test_rf021_documento_pdf` (tipo y bytes `%PDF`), y un test de la plantilla HTML con los datos formateados.

## Contexto (leer solo esto)
- [[CU-06 Emitir cotización]] — paso del documento
- Contrato: `src/packages/shared/openapi.json` (módulo `oportunidades`) y [[Contrato de la API (OpenAPI)]] §Convenciones
- [[Prototipo UI]] — pantallas 13 (PNG en `07-Entregables/Prototipo/img/`)

## Archivos probables
- `src/backend/rumbo/negocio/documentos/cotizacion.py`
- `src/backend/rumbo/negocio/documentos/plantillas/cotizacion.html`

## Fuera de alcance
- Mandar el PDF por mail (fuera de alcance).

## Notas de implementación
- **Del plan:** En Windows WeasyPrint necesita GTK/Pango: si no está, correr estos tests dentro del contenedor de la API y dejarlo documentado.
