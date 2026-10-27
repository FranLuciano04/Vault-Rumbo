---
id: T-066
titulo: Emitir cotizaciones versionadas con su vigencia
modulo: M4 — Oportunidades y cotizaciones
capa: backend
estado: tomado
depende_de: [T-064, T-029]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-06, RF-021, RF-022, RF-024]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 27/10/26 15:24
rama: feature/T-066-emitir-cotizaciones-versionadas-con-su-v
pr:
---
# T-066 Emitir cotizaciones versionadas con su vigencia

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde una oportunidad se emite una cotización desde la plantilla, con su vigencia calculada; cada nueva emisión es una versión nueva.

## Criterios de aceptación
- [ ] `POST /oportunidades/{id}/cotizaciones` crea la cotización en `borrador` con importes `Decimal` y moneda; la vigencia = fecha + `vigencia_cotizacion_meses` (RF-022).
- [ ] Una nueva versión es una `Cotización` nueva y deja las anteriores intactas según EST-Cotización (A1, RF-024). No hay campo de número de versión: la vigente es la de `fecha` más reciente (EST-Cotización, hueco 1; decidido por Nahuel el 27/10/26).
- [ ] Emitir **no** cambia el estado de la oportunidad: pasa a `cotizada` recién al marcar la cotización `enviada` (RF-023, EST-Cotización T2, EST-Oportunidad T3; eso es T-067). Desde una oportunidad cerrada (`ganada`, `perdida`) → 409.

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
