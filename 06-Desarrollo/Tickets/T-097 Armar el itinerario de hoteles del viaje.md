---
id: T-097
titulo: Armar el itinerario de hoteles del viaje
modulo: M6 — Viajes y economía
capa: backend
estado: hecho
depende_de: [T-086, T-076, T-012]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-09, RF-043, RF-044, RF-046, RF-106, DEC-0003]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 29/10/26 21:10
rama: feature/T-097-armar-el-itinerario-de-hoteles-del-viaje
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
- Servicio nuevo `negocio/servicios/itinerario.py`; schemas `Tramo`, `TramoCrear` y `TramoEditar` (PATCH parcial). Fechas dentro del viaje con extremos inclusivos; el check-out de un tramo puede ser el check-in del siguiente. `orden` repetido → 422; viaje cancelado → 409 (también en DELETE). Hotel inexistente o `cerrado` → 422 sobre `hotel_id` (convención de FK del cuerpo, como `hoteles._exigir_destino`).
- Alerta `pago` un mes antes de `vencimiento_pago_proveedor` (CU-09 paso 5): se reagenda (fecha y descripción) al editar el vencimiento o al desmarcar el pago, y se resuelve al marcar el pago, quitar el vencimiento o quitar el tramo.
- «Operador, costo» del objetivo no existen en CU-09 ni en DEC-0003 (`viaje_hotel`): manda la DEC; si el negocio los necesita, va como cambio de CU-09 con una DEC.
- Tests corregidos con autorización (`--tocar-tests`): ids guardados antes de `expire_all` en `test_itinerario.py`; las 4 rutas del itinerario a `_IMPLEMENTADAS` en `test_contrato_m6.py`; en el fix, el 404 de hotel fuera del catálogo pasó a 422 y se sumaron tests de la review.
- `shared`: hooks con `TramoCrear`/`TramoEditar`; mocks con 409 solo para viaje cancelado. Tipos regenerados con `npx openapi-typescript` (pnpm fuera del PATH).
- Menores que quedan: los cambios del itinerario no tocan `updated_by` del viaje (auditoría RF-152, decidir con el equipo); se aceptan tramos de 0 noches.
- Modelos: tests sonnet, implementación y fix sonnet, review opus. Sin escalados.
