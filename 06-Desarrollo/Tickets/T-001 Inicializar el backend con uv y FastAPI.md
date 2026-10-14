---
id: T-001
titulo: Inicializar el backend con uv y FastAPI
modulo: M0 — Fundaciones
capa: infra
estado: hecho
depende_de: []
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0001, DEC-0015]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 14/10/26 17:22
rama: feature/T-001-inicializar-el-backend-con-uv-y-fastapi
pr:
---
# T-001 Inicializar el backend con uv y FastAPI

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existe `src/backend` como proyecto Python 3.13 manejado con uv, con la estructura de carpetas de ARQ (vacía), una app FastAPI que responde `GET /api/salud` y las herramientas de calidad configuradas. Es la base sobre la que trabajan todos los tickets de backend.

## Criterios de aceptación
- [ ] `uv sync` instala todo y `uv run fastapi dev rumbo/main.py` responde `200` en `/api/salud`.
- [ ] `ruff check`, `ruff format --check`, `mypy rumbo` (estricto en `core/` y `negocio/`) y `pytest` pasan con un test de humo.
- [ ] La cobertura está configurada en `pyproject.toml` con los umbrales de la spec §6 (backend total ≥ 70 %; el de `negocio/` ≥ 80 % queda como comando aparte para el CI).

## Tests esperados
No sigue TDD (`infra`). Se verifica ejecutando los comandos de la spec §4 de backend; deja un `tests/test_salud.py` de humo.

## Contexto (leer solo esto)
- [[Spec de implementación]] §3, §4, §5 y §6
- [[ARQ — Vista general]] — «Estructura de carpetas»
- [[DEC-0001 Stack tecnológico|DEC-0001]]

## Archivos probables
- `src/backend/pyproject.toml`
- `src/backend/uv.lock`
- `src/backend/rumbo/main.py`
- `src/backend/rumbo/{core,presentacion,negocio,datos}/__init__.py`
- `src/backend/tests/test_salud.py`

## Fuera de alcance
- Base de datos, autenticación y Alembic (tickets propios).

## Notas de implementación
- **Del plan:** Versiones exactas verificadas contra la documentación oficial (`source-driven-development`). Incluye `pydantic-settings` (spec §3).
- **Implementación:** Python 3.13.13 gestionado por uv; fastapi 0.143.1, ruff 0.17.0, mypy 2.4.0, pytest 9.1.1 (fijadas en `uv.lock`). `GET /api/salud` → `{"estado":"ok"}`; docs en `/api/docs`. `.gitignore` propio en `src/backend`.
- **Review (hallazgo importante corregido):** en mypy 2.4, `strict = true` dentro de un override se aplica a todo el proyecto; se reemplazó por los flags explícitos y se verificó que `datos/` no queda estricto y `core/` sí. También se sacó `--cov` de `addopts` (correr un archivo suelto no falla por `fail_under`) y se agregó a la spec §4 el comando del umbral de `negocio/` ≥ 80 % para el CI.
- **Entorno:** en una PC con proxy TLS, `uv` necesita `UV_SYSTEM_CERTS=1`. mypy avisa «unused section(s)» hasta que existan submódulos en `core/` y `negocio/`; no es un error.
- **Modelos:** implementación Sonnet, review Opus, fix Haiku. Sin escalados.
