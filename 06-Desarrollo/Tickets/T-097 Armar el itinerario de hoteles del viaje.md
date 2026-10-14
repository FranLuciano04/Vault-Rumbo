---
id: T-097
titulo: Armar el itinerario de hoteles del viaje
modulo: M6 — Viajes y economía
capa: backend
estado: libre
depende_de: [T-086, T-076, T-012]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-09, RF-043, RF-044, RF-046, RF-106, DEC-0003]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-097 Armar el itinerario de hoteles del viaje

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se arma el itinerario del viaje agregando hoteles del catálogo por tramo (fechas, operador, costo), se editan o quitan tramos, y un hotel puede repetirse en tramos no consecutivos.

## Criterios de aceptación
- [ ] `GET/POST /viajes/{id}/itinerario` y `PATCH/DELETE /tramos/{id}` validan fechas dentro del viaje y sin solaparse (422).
- [ ] Un hotel se repite en tramos no consecutivos (A5); un hotel fuera del catálogo se maneja según CU-09 A2.
- [ ] Un viaje sin hoteles es válido (A1).

## Tests esperados
`tests/api/test_itinerario.py`: `test_rf043_agregar_tramo`, `test_rf044_repetir_hotel`, `test_rf046_editar_y_quitar`, `test_fechas_fuera_del_viaje_422`.

## Contexto (leer solo esto)
- [[CU-09 Armar itinerario de hoteles]]
- [[DEC-0003 Relación Viaje–Hotel y Reseña|DEC-0003]]
- Contrato: `src/packages/shared/openapi.json` (módulo `viajes`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/viajes.py`
- `src/backend/rumbo/presentacion/routers/viajes.py`

## Fuera de alcance
- Pago al proveedor (ticket propio).

## Notas de implementación
