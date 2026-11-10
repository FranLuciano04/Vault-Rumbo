---
id: T-175
titulo: Ganar la oportunidad con la cotización que eligió el cliente
modulo: M11 — Ajustes de la revisión del equipo
capa: backend
estado: libre
depende_de: [T-174]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-05, CU-06, CU-07, RF-016, RF-025]
origen: revisión del equipo (10/11/26)
asignado:
tomado_el:
rama:
pr:
---
# T-175 Ganar la oportunidad con la cotización que eligió el cliente

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Una oportunidad puede tener varias cotizaciones. Al ganarla, el usuario indica cuál eligió el cliente: esa queda `aceptada`, la oportunidad queda `ganada` y la reserva se confirma desde ella. Sin cotización, ganar sigue siendo la venta directa. Aplica la `DEC-` que destraba T-174.

## Criterios de aceptación
- [ ] `POST /oportunidades/{id}/ganar` con `cotizacion_id` cumple dos cosas. Si la cotización es de la oportunidad, y está enviada y vigente (o lo que defina la `DEC-`), la marca `aceptada`, deja la oportunidad `ganada` y resuelve sus alertas (RN-08), todo en una transacción. Si es de otra oportunidad o no admite la aceptación, responde 409 o 422 y no cambia nada.
- [ ] Ya no hace falta que la aceptada sea la última versión. Sigue valiendo que haya una sola aceptada por oportunidad. Las demás cotizaciones quedan como diga la `DEC-`.
- [ ] Sin `cotizacion_id`, `ganar` funciona como hoy (venta directa, CU-05 A4). `confirmar_reserva` toma la moneda de la cotización aceptada también cuando la oportunidad ya estaba `ganada`.

## Tests esperados
`test_rf016_ganar_con_la_cotizacion_elegida`, `test_rf016_ganar_con_cotizacion_de_otra_oportunidad_es_error`, `test_rf016_ganar_con_cotizacion_vencida_es_409`, `test_rf025_aceptar_una_version_que_no_es_la_ultima`, `test_rf025_una_sola_aceptada_por_oportunidad`, `test_rf016_ganar_sin_cotizacion_es_venta_directa` y `test_cu07_reserva_de_ganada_con_aceptada_usa_su_moneda`.

## Contexto (leer solo esto)
- La `DEC-` aprobada (ver T-174, «Decisión pendiente», punto 1)
- `src/backend/rumbo/negocio/estados/oportunidad.py` (`ganar`, `confirmar_reserva`) y `estados/cotizacion.py` (`aceptar`, `exigir_vigente_sin_aceptada`)
- `src/backend/rumbo/negocio/servicios/oportunidades.py` (`ganar_oportunidad`, `_transicionar_cotizacion`) y `servicios/viajes.py` (`confirmar_reserva`)

## Archivos probables
- `src/backend/rumbo/negocio/estados/` y `servicios/oportunidades.py`
- `src/backend/rumbo/presentacion/routers/oportunidades.py`

## Fuera de alcance
- La pantalla, que va en T-178.

## Notas de implementación
- **Riesgo alto:** cambia estados de la oportunidad y de la cotización. Para mergear, hace falta la aprobación de otro integrante.
- Bloquear la oportunidad antes de leer las versiones, como hace `_transicionar_cotizacion`. Así dos aceptaciones al mismo tiempo no dejan dos aceptadas.
