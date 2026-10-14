---
id: T-064
titulo: Implementar los estados de la oportunidad
modulo: M4 — Oportunidades y cotizaciones
capa: backend
estado: libre
depende_de: [T-063]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-05, RF-016, RF-017, RF-020, DEC-0002]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-064 Implementar los estados de la oportunidad

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La oportunidad avanza y se cierra solo por las transiciones de EST-Oportunidad: pasar a en gestión, perder con motivo, reactivar una perdida y ganar sin cotización formal.

## Criterios de aceptación
- [ ] `negocio/estados/oportunidad.py` implementa EST-Oportunidad; cada acción `POST` aplica una transición y las inválidas → 409.
- [ ] Perder exige un motivo del enum (422 si falta) (A2); reactivar vuelve al estado que define EST-Oportunidad (A3).
- [ ] Ganar sin cotización deja la oportunidad lista para confirmar la reserva (A4).

## Tests esperados
`tests/negocio/test_estados_oportunidad.py`: cada transición válida e inválida; `tests/api/…`: `test_rf017_perder_con_motivo`, `test_rf020_reactivar`, `test_rf016_ganar_sin_cotizacion`.

## Contexto (leer solo esto)
- [[EST-Oportunidad]]
- [[CU-05 Seguir oportunidad]] — A2, A3 y A4
- [[DEC-0002 Modelar la consulta como Oportunidad|DEC-0002]]
- Contrato: `src/packages/shared/openapi.json` (módulo `oportunidades`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/estados/oportunidad.py`
- `src/backend/rumbo/negocio/servicios/oportunidades.py`

## Fuera de alcance
- Pasar a `cotizada` (lo hace la cotización) y crear el viaje (M6).

## Notas de implementación
