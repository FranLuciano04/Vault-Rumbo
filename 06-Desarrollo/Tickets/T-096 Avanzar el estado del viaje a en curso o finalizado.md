---
id: T-096
titulo: Avanzar el estado del viaje a en curso o finalizado
modulo: M6 — Viajes y economía
capa: backend
estado: hecho
depende_de: [T-086, T-087, T-051]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-08, RF-039, RF-040, RF-041, RF-042]
origen: plan
asignado: palomap2003
tomado_el: 29/10/26 22:52
rama: feature/T-096-avanzar-el-estado-del-viaje-a-en-curso-o
pr:
---
# T-096 Avanzar el estado del viaje a en curso o finalizado

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Una persona confirma que el viaje empezó o terminó, o corrige un estado cargado por error; al finalizar se agenda la reseña post-viaje.

## Criterios de aceptación
- [ ] `POST /viajes/{id}/iniciar|finalizar` aplican EST-Viaje (409 si no corresponde) y propagan el cambio según RF-040.
- [ ] Finalizar agenda la alerta `resena` post-viaje (RF-041).
- [ ] `POST /viajes/{id}/corregir-estado` vuelve al estado anterior (A2, RF-042).

## Tests esperados
`tests/api/test_viajes_estado.py`: `test_rf039_iniciar`, `test_rf039_finalizar`, `test_rf041_agenda_resena`, `test_rf042_corregir`, `test_transicion_invalida_409`.

## Contexto (leer solo esto)
- [[CU-08 Gestionar estado del viaje]]
- [[EST-Viaje]]
- Contrato: `src/packages/shared/openapi.json` (módulo `viajes`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/viajes.py`
- `src/backend/rumbo/presentacion/routers/viajes.py`

## Fuera de alcance
- La sugerencia automática por fecha (proceso diario, M7).

## Notas de implementación
- `negocio/servicios/viajes.py` (nuevo) con `iniciar`, `finalizar` y `corregir_estado`: bloquean el viaje (`FOR UPDATE`), aplican visibilidad y `exigir_escritura`, y delegan las transiciones T4, T5 y T7 en `negocio/estados/viaje.py`. La respuesta es el `Viaje` con `saldo_pendiente` y `porcentaje_pagado` (`Viaje.desde_ficha`, que también puede usar `obtener_viaje` en T-091).
- Reseña post-viaje (RF-041): `finalizar` crea la Alerta `resena` con fecha `hoy()` en la agenda del responsable del viaje, aunque finalice un admin. RF-041 no fija un desfasaje; si el negocio lo quiere, hace falta una DEC. `corregir_estado` desde `finalizado` resuelve la `resena` pendiente o vista; una ya resuelta no se toca.
- RF-040 sin código propio: calendario y dashboard leen `Viaje.estado` de la base en la misma transacción.
- Tests tocados con autorización de Paloma en el verde: el fixture del viaje cancelado (restricción `viaje_estado_previo_ck`) y las tres operaciones en `_IMPLEMENTADAS` de `test_contrato_m6.py`. En el fix se agregaron 11 casos (permisos 404/403, alerta del admin, reseña vista, fecha, finalizar-corregir-finalizar, reseña resuelta) sin modificar los existentes.
- Review (`reviewer-seguridad`, sonnet): 0 bloqueantes, 2 importantes (tests de permisos y de la alerta) y 2 menores; arreglados salvo uno que queda para M7: `iniciar` y `finalizar` no resuelven la Alerta `viaje` de la sugerencia por fecha, que todavía no existe (la crea el proceso diario).
- Modelos: tests sonnet; implementación, refactor (sin cambios) y fix opus; review sonnet. Sin escalados.
