---
id: T-063
titulo: Listar las oportunidades del embudo
modulo: M4 — Oportunidades y cotizaciones
capa: backend
estado: libre
depende_de: [T-061, T-012]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-05, RF-016, RF-151]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-063 Listar las oportunidades del embudo

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada rol ve el embudo de oportunidades por estado según su visibilidad, abre una y edita sus datos o notas.

## Criterios de aceptación
- [ ] `GET /oportunidades` filtra por estado, responsable y «lo mío», paginado; el `freelance` ve solo lo suyo.
- [ ] `GET /oportunidades/{id}` (ajena → 404) y `PATCH` de datos y notas.
- [ ] El `PATCH` no cambia el estado (eso va por acciones).
- [ ] Un `PATCH` con una sola fecha tentativa que queda fuera de orden respecto de la guardada responde 422, no 500. El esquema ya rechaza el cuerpo con las dos fechas invertidas, pero no ve la fecha guardada, y el CHECK de la base terminaría en 500 (`errores.py:_error_de_base` no lo traduce). Origen: review del arreglo `fix/M4-validaciones-y-ids-de-mocks`.

## Tests esperados
`tests/api/test_oportunidades.py`: `test_rf016_embudo_por_estado`, `test_rf151_freelance_solo_lo_suyo`, `test_patch_no_cambia_estado`, `test_patch_fecha_hasta_anterior_a_la_guardada_responde_422`.

## Contexto (leer solo esto)
- [[CU-05 Seguir oportunidad]]
- Contrato: `src/packages/shared/openapi.json` (módulo `oportunidades`) y [[Contrato de la API (OpenAPI)]] §Convenciones
- [[Prototipo UI]] — pantallas 12, 34 (PNG en `07-Entregables/Prototipo/img/`)

## Archivos probables
- `src/backend/rumbo/negocio/servicios/oportunidades.py`
- `src/backend/rumbo/presentacion/routers/oportunidades.py`

## Fuera de alcance
- Acciones de estado (ticket propio).

## Notas de implementación
