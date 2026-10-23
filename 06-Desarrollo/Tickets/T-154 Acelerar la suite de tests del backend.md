---
id: T-154
titulo: Acelerar la suite de tests del backend
modulo: M0 — Fundaciones
capa: infra
estado: hecho
depende_de: []
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0014]
origen: hallazgo T-033
asignado: Nahuel Viniegra
tomado_el: 23/10/26 14:11
rama: feature/T-154-acelerar-la-suite-de-tests-del-backend
pr:
---
# T-154 Acelerar la suite de tests del backend

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La suite del backend corre en una fracción del tiempo actual, para que cada fase de `/implementar-ticket` (rojo, verde, refactor, fix) no cueste entre 6 y 13 minutos de tests.

## Diagnóstico (medido el 23/10/26 en T-033)
- `tests/api/test_operadores.py`: 57 tests en 142 s. Casi todo es **setup**: ~2,1 s por test. El cuerpo de cada test es despreciable.
- La causa principal es la conexión a la base: el fixture `motor` de `tests/conftest.py` crea un engine con `NullPool` **por test**, así que cada test abre una conexión nueva.
- Con `TEST_DATABASE_URL` en `localhost`, cada conexión tarda **2,1 s**; con `127.0.0.1`, **0,02 s**. En Windows, `localhost` resuelve primero a `::1` (IPv6), falla contra el puerto publicado por Docker y recién después cae a IPv4.
- `.env.example` ya usa `127.0.0.1`, pero un `.env` local copiado con `localhost` paga la demora sin aviso. El CI usa `localhost` en Linux, donde no se nota.
- Además, `/implementar-ticket` corre la suite afectada dos veces por fase (el subagente y `tickets.mjs fase`), y `test_contrato_m1.py` (parametrizado por ruta y rol) tarda ~6 min por sí solo.

## Soluciones propuestas (en orden de impacto)
1. **Evitar la demora de `localhost`** — el cambio más barato; solo esto debería bajar la suite a una fracción del tiempo actual.
   - En `tests/conftest.py`, normalizar el host `localhost` de `TEST_DATABASE_URL` a `127.0.0.1` (o fallar con un mensaje claro que pida cambiarlo).
   - Mismo criterio para `DATABASE_URL` de desarrollo si aplica, y una línea en la spec de implementación §4 explicando por qué.
2. **Engine de tests por sesión, no por test.** Pasar `motor` a `scope="session"` con un pool real (y `loop_scope="session"` en pytest-asyncio), conservando la transacción externa con `SAVEPOINT` que se revierte por test. Medir si suma frente al punto 1 antes de dejarlo.
3. **Paralelizar con `pytest-xdist`** (`-n auto`): una base por worker (`rumbo_test_gw0`, `rumbo_test_gw1`, …), creada y migrada en `base_de_tests_migrada`, o clonada de una plantilla migrada (`CREATE DATABASE … TEMPLATE`). Mantener la guarda de que el nombre termine en `_test`.
4. **Fases livianas en el flujo** (requiere `/gestionar-skills`, porque toca `implementar-ticket`): en rojo, verde, refactor y fix, el `--test` corre solo los tests del ticket y los vecinos directos; la suite completa y `test_contrato_m1.py` se corren una vez, en el paso 6 (checks), antes del PR.

## Criterios de aceptación
- [ ] Con un `.env` que diga `localhost`, el setup de un test de API baja de ~2 s a menos de 0,2 s (medido con `pytest --durations`).
- [ ] La suite completa del backend pasa igual que antes, en serie y con `uv run pytest -n auto`, cada worker con su propia base `_test`.
- [ ] Quedan anotados en este ticket los tiempos antes y después de la suite completa y de `test_contrato_m1.py`.

## Tests esperados
Ticket de infra: se verifica ejecutando. Corrida de `uv run pytest --durations=15` antes y después, en serie y con `-n auto`, más un test chico que fije la normalización del host (`localhost` → `127.0.0.1`) y que se conserve la guarda del sufijo `_test`.

## Contexto (leer solo esto)
- `src/backend/tests/conftest.py` — fixtures `base_de_tests_migrada`, `motor`, `sesion`
- `src/backend/pyproject.toml` — `[tool.pytest.ini_options]` y dependencias de dev
- `.github/workflows/ci.yml` — job del backend (`TEST_DATABASE_URL`)
- [[Spec de implementación]] §4 (comandos)
- [[Flujo de implementación]] — solo para el punto 4

## Archivos probables
- `src/backend/tests/conftest.py`
- `src/backend/pyproject.toml` y `uv.lock` (`pytest-xdist`)
- `src/backend/.env.example`
- `.github/workflows/ci.yml` (opcional: `-n auto`)
- `.claude/skills/implementar-ticket/SKILL.md` (punto 4, vía `/gestionar-skills`)

## Fuera de alcance
- Reescribir o borrar tests existentes, o bajar la cobertura.
- Cambiar el motor de base de los tests (sigue siendo PostgreSQL).

## Notas de implementación
- **Arreglo inmediato, sin esperar el ticket:** en el `.env` local de `src/backend`, cambiar `localhost` por `127.0.0.1` en `TEST_DATABASE_URL` (y en `DATABASE_URL`). No se versiona.

## Resultado (medido el 23/10/26, `.env` con `localhost`, Windows, 4 núcleos)
| | Antes | Después |
|---|---|---|
| Suite completa en serie | 24 min 26 s (772 tests) | 3 min 13 s (777 tests) |
| Suite completa con `-n auto` | — | 2 min 04 s |
| `tests/api/test_contrato_m1.py` | 4 min 22 s | 31 s |
| `tests/api/test_operadores.py` | 2 min 47 s | 15 s |
| Setup típico de un test de API | 2,1 s | 0,04 s (mediana) |

- Solución 1 (normalizar `localhost` a `127.0.0.1`) y solución 3 (una base `rumbo_gwN_test` por worker de xdist) hechas en `tests/conftest.py`; el CI corre con `-n auto` y la cobertura sigue combinándose (total 96,5 %, negocio 99 %).
- Solución 2 (engine por sesión) **no se aplicó**: con la 1 el setup mediano ya es 0,04 s, así que el techo de ganancia (~0,03 s por test) es menor al 10 % de la suite en serie y exige `loop_scope="session"` en todos los tests.
- Solución 4 (fases livianas en `implementar-ticket`): aplicada el 23/10/26 después del merge, vía `/gestionar-skills` (`implementar-ticket` 1.3.0 y los agentes `implementador` y `simplificador`).
- **Review (opus), fix aplicado:** con xdist la guarda `_test` miraba el nombre ya transformado (`…/rumbo` → `rumbo_gw0_test` pasaba); ahora `url_de_tests` rechaza un nombre original sin `_test`, con test. Se valida el nombre antes del `CREATE DATABASE` y la spec §4 avisa que las bases `rumbo_gwN_test` quedan en el servidor.
- **Modelos usados:** implementación y fix sonnet, review opus. Sin escalados.
- **Checks finales:** ruff y mypy limpios; `pytest -n auto`: 779 passed, 1 skipped en 2 min 54 s; cobertura total 97 %, negocio 99 %.
