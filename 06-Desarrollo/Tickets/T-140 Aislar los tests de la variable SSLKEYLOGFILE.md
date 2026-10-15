---
id: T-140
titulo: Aislar los tests de la variable SSLKEYLOGFILE
modulo: M0 — Fundaciones
capa: backend
estado: hecho
depende_de: [T-006]
tamaño: XS
riesgo: normal
modelo_tests: sonnet
modelo_impl: haiku
modelo_review: opus
trazabilidad: [DEC-0015, RNF-15]
origen: hallazgo T-006
asignado: Nahuel Viniegra
tomado_el: 14/10/26 21:52
rama: feature/T-140-aislar-los-tests-de-la-variable-sslkeylo
pr:
---
# T-140 Aislar los tests de la variable SSLKEYLOGFILE

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
`uv run pytest` funciona en Windows también cuando lo corre Claude Code, sin anteponer `env -u SSLKEYLOGFILE`. Hoy el sandbox de Claude Code define `SSLKEYLOGFILE`, y en Windows asyncpg aborta con `OPENSSL_Uplink … no OPENSSL_Applink` al conectarse a PostgreSQL (lo encontró T-006).

## Criterios de aceptación
- [ ] `tests/conftest.py` quita `SSLKEYLOGFILE` del entorno al cargarse, antes de cualquier conexión, con un comentario que explica el porqué y cita este ticket.
- [ ] Con `SSLKEYLOGFILE` definida, `uv run pytest` (sin `env -u`) pasa completo.
- [ ] La spec §4 deja de pedir `env -u SSLKEYLOGFILE` y conserva las notas de `--basetemp` y de los puertos.

## Tests esperados
- `tests/test_entorno.py`: `test_rnf15_sslkeylogfile_no_llega_a_los_tests` comprueba que la variable no está en `os.environ` durante los tests.
- Verificación del orquestador: `SSLKEYLOGFILE=/tmp/x uv run pytest` en verde. Sin el arreglo, en Windows aborta.

## Contexto (leer solo esto)
- [[T-006 Configurar la sesión async de la base con su entorno]] — «Notas de implementación», punto «Entorno local».
- [[Spec de implementación]] §4 — bloque «Entorno de Claude Code en Windows».

## Archivos probables
- `src/backend/tests/conftest.py`
- `src/backend/tests/test_entorno.py`
- `06-Desarrollo/Spec de implementación.md`

## Fuera de alcance
- Los otros menores de T-006 (test de aislamiento que depende del orden y `motor.dispose()` al apagar): quedan para el lifespan.
- Cambiar cómo se conecta la app fuera de los tests: a quien corre el servidor en su terminal no le pasa.

## Notas de implementación
- `tests/conftest.py` hace `os.environ.pop("SSLKEYLOGFILE", None)` a nivel de módulo, antes de cualquier fixture o conexión. La spec §4 ya no pide `env -u`.
- **Desvío de proceso:** `fase verde` rechazó el cambio porque trata `conftest.py` como archivo de test. El commit `feat` se hizo a mano con «Tests-autorizados: sí», con autorización de Nahuel. `test_entorno.py` siguió intacto desde el rojo.
- No hubo refactor: el diff tiene 5 líneas. La review (opus) aprobó sin hallazgos.
- Verificación: `SSLKEYLOGFILE=/tmp/x uv run pytest --basetemp=.pytest_tmp` da 33 passed, con cobertura del 97 %. `--basetemp` sigue haciendo falta por el temporal del sistema, que no depende de este ticket.
- Quedan con el consejo viejo de `env -u` las notas de T-006 y una entrada vieja de la bitácora. Son registros históricos y no se tocaron.
- Modelos usados: tests con sonnet, implementación con haiku y review con opus. No hubo escalados.
