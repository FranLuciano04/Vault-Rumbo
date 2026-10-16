---
id: T-008
titulo: Crear la migración inicial de Alembic desde rumbo.sql
modulo: M0 — Fundaciones
capa: backend
estado: hecho
depende_de: [T-007]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0015, DEC-0013]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 16/10/26 14:22
rama: feature/T-008-crear-la-migracion-inicial-de-alembic-de
pr:
---
# T-008 Crear la migración inicial de Alembic desde rumbo.sql

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Alembic (async) crea el esquema completo de `rumbo.sql`, incluida la fila inicial de `configuracion`, y los modelos no tienen diferencias con la base migrada.

## Criterios de aceptación
- [ ] `uv run alembic upgrade head` sobre una base vacía crea todo el esquema; `downgrade base` lo borra.
- [ ] `alembic check` (autogenerate) no detecta diferencias entre los modelos y la base migrada.
- [ ] El `conftest` prepara la base de tests con la migración, no con `create_all`.

## Tests esperados
`tests/test_migracion.py`: upgrade en una base vacía, comparación de tablas, columnas y enums con los modelos, y la fila de `configuracion` con sus defaults.

## Contexto (leer solo esto)
- `05-Diseño/Datos/rumbo.sql`
- [[DEC-0015 Decisiones de implementación|DEC-0015]] — supuesto: la primera migración reproduce rumbo.sql

## Archivos probables
- `src/backend/alembic.ini`
- `src/backend/alembic/env.py`
- `src/backend/alembic/versions/0001_esquema_inicial.py`
- `src/backend/tests/test_migracion.py`

## Fuera de alcance
- Datos de demo (los carga la CLI).

## Notas de implementación
- **Del plan:** `rumbo.sql` cambió por DEC-0016 y todavía no se corrió contra PostgreSQL: este ticket es el primero que lo verifica. Si el SQL tiene un error, se corrige en `rumbo.sql` también, avisando.
- **Resultado:** `rumbo.sql` corrió sin errores contra PostgreSQL; no se modificó. La migración `0001` embebe sus 37 sentencias (asyncpg no ejecuta varias por llamada), y un test verifica que sigan iguales a `rumbo.sql`. `env.py` es async y toma la URL de `get_settings()`, así que lee `.env`.
- **Tests tocados (autorizado por Nahuel):** la fixture `bd` de `test_modelos.py` (T-007) cambió `create_all` por `DELETE FROM configuracion`, porque la base migrada ya trae la fila inicial. En la review se autorizó que `correr_alembic` invoque el script de consola `alembic` y no `python -m alembic`.
- **Review (opus):** se arreglaron 2 bloqueantes (`prepend_sys_path`, lectura de `.env`) y 3 menores: guarda `_test` antes del `DROP SCHEMA`, fixture de migración no autouse y test de equivalencia con `rumbo.sql`. **Menor pendiente:** `prepend_sys_path = .` depende del cwd, y desde `src/` falla; se podría usar `%(here)s`. El flujo documentado (desde `src/backend`) funciona.
- **Entorno Windows:** pytest necesita `--basetemp` fuera del temp por defecto (acceso denegado), y `SSLKEYLOGFILE` rompe asyncpg (T-140). Ninguno de los dos viene de este ticket.
- **Modelos:** tests sonnet, implementación, refactor y fix sonnet, review opus. No hubo escalado.
