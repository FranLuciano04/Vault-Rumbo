---
id: T-031
titulo: Gestionar el catálogo de destinos
modulo: M1 — Usuarios y configuración
capa: backend
estado: hecho
depende_de: [T-026, T-012, T-011]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-26, RF-089, RF-090, RF-091, RF-092, RF-153, DEC-0006]
origen: plan
asignado: FranLucianoo
tomado_el: 22/10/26 18:07
rama: feature/T-031-gestionar-el-catalogo-de-destinos
pr:
---
# T-031 Gestionar el catálogo de destinos

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña mantienen el catálogo de destinos (alta, edición, baja lógica y reactivación); todos los roles lo consultan. Es el **primer ABM**: fija el patrón de repositorio, servicio, router y tests que copian los demás catálogos.

## Criterios de aceptación
- [ ] Listar (activos por defecto, con filtro de inactivos), ver, alta y edición; escritura solo `admin`/`dueno`.
- [ ] Nombre duplicado (normalizado: sin tildes ni mayúsculas) → 409 (A1).
- [ ] Baja lógica aunque el destino esté en uso (A2) y reactivación (A3).

## Tests esperados
`tests/api/test_destinos.py`: `test_rf089_alta_y_listado`, `test_rf090_nombre_duplicado_409`, `test_rf091_baja_logica_en_uso`, `test_rf092_reactivar`, roles.

## Contexto (leer solo esto)
- [[CU-26 Gestionar destinos]]
- [[DEC-0006 Destino como entidad de catálogo|DEC-0006]]
- Contrato: `src/packages/shared/openapi.json` (módulo `configuracion`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/datos/repositorios/configuracion.py`
- `src/backend/rumbo/negocio/servicios/configuracion.py`
- `src/backend/rumbo/presentacion/routers/configuracion.py`

## Fuera de alcance
- Requisitos del destino (ticket propio).

## Notas de implementación
- **Implementación (22/10/26, Francisco):** es el primer ABM de catálogo y fija el **patrón que copian T-032 y T-033**:
  - **Repositorio** (`datos/repositorios/destinos.py`): `buscar_por_nombre` (normalizado, con inactivos y `excluir_id`) y `paginar`, que filtra `activo` (`bool = True`) y busca sin tildes ni mayúsculas, con `LIKE` escapado y orden por nombre normalizado.
  - **Servicio** (`negocio/servicios/configuracion.py`):
    - `listar_*` y `obtener_*` son de lectura, para todos los roles, con visibilidad.
    - `crear_*`, `editar_*`, `dar_de_baja_*` y `reactivar_*` exigen admin o dueño.
    - Helpers `_exigir_nombre_libre`, `_guardar_con_nombre_unico` (savepoint: el `IntegrityError` del índice pasa a 409) y `_fijar_activo` (idempotente).
  - **Router** con `ActorDep`, sin lógica.
  - **Índice único funcional** `destino_nombre_normalizado_uq` (migración `0002_destino_nombre_unico`), declarado también en el modelo.
  - `nombre_normalizado` y las constantes de tildes pasan a `datos/modelos/base.py`, para que el modelo pueda declarar el índice sin un import circular. `normalizar` sigue en `repositorios/base.py`. Clientes las reutiliza sin cambiar su comportamiento.
- **Tests de contrato (convención autorizada por Francisco):** las 6 rutas de destinos pasan a `IMPLEMENTADAS`, y `NULOS_EN_ANULABLES` ahora excluye las rutas implementadas.
- **Review (Opus):** 0 bloqueantes, 2 importantes y 4 menores, todos arreglados en el fix:
  - el contrato no estaba regenerado después de cambiar el default de `activo`;
  - el duplicado se controlaba sin índice único;
  - la búsqueda distinguía tildes;
  - faltaba el test del escape del `LIKE`;
  - el orden no usaba el nombre normalizado;
  - `translate` dependía del locale.
- **Hallazgo fuera de alcance:** ningún test ni el CI comprueba que `src/packages/shared/openapi.json` esté al día con el código. En este ticket quedó desfasado sin que nada avisara. Va como ticket aparte.
- **Para el equipo:** la migración 0002 necesita `alembic upgrade head` en las bases de desarrollo.
- **Verificación:**
  - backend: 643 tests, ruff y mypy limpios;
  - `openapi.json` idéntico al generado;
  - shared: 87 tests y typecheck;
  - web: typecheck.
- **Modelos:** tests, verde, refactor y fix con Sonnet; review con Opus. No hubo escalados.
