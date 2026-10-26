---
id: T-063
titulo: Listar las oportunidades del embudo
modulo: M4 — Oportunidades y cotizaciones
capa: backend
estado: hecho
depende_de: [T-061, T-012]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-05, RF-016, RF-151]
origen: plan
asignado: palomap2003
tomado_el: 26/10/26 16:57
rama: feature/T-063-listar-las-oportunidades-del-embudo
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
- **Modelos:** tests, verde y fix con sonnet; review con opus. No hubo escalados. El refactor no cambió nada (recomendó no unificar `_exigir_responsable_activo` con `_exigir_asesor_activo` de clientes hasta que aparezca un tercer uso).
- **Contrato:** como en T-052, un segundo commit `test(T-063)` sacó el listado, el detalle y el PATCH de `OPERACIONES_STUB` en `test_contrato_m4.py`. Las otras 13 rutas siguen fijadas en 501, y el 401 y la forma del contrato siguen cubriendo las 16.
- **Permisos del PATCH (DEC-0005 §2, DEC-0008):** edita el responsable, o admin y dueño. Un empleado que no es el responsable recibe 403. El freelance recibe 404 si la oportunidad es ajena y 403 si la ve por ser asesor del cliente pero no es el responsable. Reasignar `responsable_id` es solo de admin y dueño (403), y el nuevo responsable tiene que existir y estar activo (422). Si el cuerpo trae el mismo `responsable_id` que el guardado, no se exige el rol.
- **`estado` en el PATCH:** se ignora (200, sin cambio). El cambio de estado va por las acciones.
- **Fechas:** el servicio compara la fecha enviada contra la guardada y responde 422 sobre el campo enviado, sin llegar al CHECK de la base.
- **Filtros:** el criterio dice «estado, responsable y "lo mío"», pero el contrato solo publica `mios`, `estado` y `cliente_id`. Se siguió el contrato: un admin no puede filtrar por el responsable de otro. El repositorio ya acepta `responsable_id`; si hace falta el filtro, es un cambio de contrato.
- **Hallazgos de la review:** 0 bloqueantes, 1 importante y 3 menores. El importante: ningún test cubría los permisos del PATCH (la review lo comprobó con mutaciones); se sumaron 6 tests. Menores arreglados: el responsable que manda su propio `responsable_id` recibía 403, y `test_patch_no_cambia_estado` aceptaba 200 o 422. El tercero es la aclaración de los filtros de arriba. Se autorizó tocar los tests.
- **No cubierto:** el orden del listado por `updated_at` (no hay forma determinista de fijarlo en la fábrica).
