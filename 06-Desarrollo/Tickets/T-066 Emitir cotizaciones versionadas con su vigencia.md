---
id: T-066
titulo: Emitir cotizaciones versionadas con su vigencia
modulo: M4 — Oportunidades y cotizaciones
capa: backend
estado: libre
depende_de: [T-064, T-029]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-06, RF-021, RF-022, RF-024]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-066 Emitir cotizaciones versionadas con su vigencia

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde una oportunidad se emite una cotización desde la plantilla, con su vigencia calculada; cada nueva emisión es una versión nueva y la oportunidad pasa a `cotizada`.

## Criterios de aceptación
- [ ] `POST /oportunidades/{id}/cotizaciones` crea la cotización en `borrador` con importes `Decimal` y moneda; la vigencia = fecha + `vigencia_cotizacion_meses` (RF-022).
- [ ] Una nueva versión numera correlativamente y deja las anteriores según EST-Cotización (A1, RF-024).
- [ ] La oportunidad pasa a `cotizada` según EST-Oportunidad; desde un estado que no lo admite → 409.

## Tests esperados
`tests/api/test_cotizaciones.py`: `test_rf021_emitir`, `test_rf022_vigencia_por_parametro`, `test_rf024_nueva_version`, `test_oportunidad_cerrada_409`.

## Contexto (leer solo esto)
- [[CU-06 Emitir cotización]] — flujo principal y A1
- [[EST-Cotización]]
- [[EST-Oportunidad]]
- Contrato: `src/packages/shared/openapi.json` (módulo `oportunidades`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/estados/cotizacion.py`
- `src/backend/rumbo/negocio/servicios/oportunidades.py`

## Fuera de alcance
- El PDF (ticket propio) y el vencimiento automático (M7).

## Notas de implementación
