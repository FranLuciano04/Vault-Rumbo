---
id: T-008
titulo: Crear la migración inicial de Alembic desde rumbo.sql
modulo: M0 — Fundaciones
capa: backend
estado: libre
depende_de: [T-007]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0015, DEC-0013]
origen: plan
asignado:
tomado_el:
rama:
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
