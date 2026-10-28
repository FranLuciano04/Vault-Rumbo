---
id: T-068
titulo: Generar el documento PDF de la cotización
modulo: M4 — Oportunidades y cotizaciones
capa: backend
estado: hecho
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
- **Implementación:** `html_cotizacion` renderiza la plantilla Jinja2 (autoescape) con importes `1.500.000,50` y fechas `dd/mm/aa`; `pdf_cotizacion` usa WeasyPrint con import diferido (la API arranca sin Pango) y un `url_fetcher` que rechaza todo recurso externo. El servicio `documento_cotizacion` lee con la visibilidad del actor (404 si no es visible), toma el `Cliente` de `oportunidad.cliente` (solo muestra el nombre, que la oportunidad ya expone) y genera el PDF en `asyncio.to_thread`.
- **Dependencias:** `weasyprint>=70` y `jinja2` explícita; override de mypy para `weasyprint`. Dockerfile suma `libharfbuzz-subset0`; el CI instala `libpango-1.0-0 libpangoft2-1.0-0 fonts-dejavu-core` (hallazgo importante de la review).
- **Windows:** WeasyPrint no carga sin GTK/Pango. Los tests de PDF se corrieron en Docker: `docker run python:3.13-slim` con el repo montado, `apt-get install libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0 fonts-dejavu-core`, `uv sync --frozen` con `UV_PROJECT_ENVIRONMENT=/opt/venv` y `TEST_DATABASE_URL` apuntando a `host.docker.internal`. Los 3 tests sin `%PDF` pasan también en Windows.
- **Menores pendientes:** falta un test del escapado de la plantilla; la respuesta no manda `Content-Disposition` con nombre `.pdf` (el contrato no lo pide); la segunda lectura con visibilidad en el servicio es redundante (solo trae el join del cliente).
- **Modelos:** tests sonnet, impl/fix sonnet, review opus; sin escalados. El refactor no cambió nada.
