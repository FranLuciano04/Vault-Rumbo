---
id: T-151
titulo: Responder 422 ante un número fuera del rango de la base
modulo: M1 — Usuarios y configuración
capa: backend
estado: hecho
depende_de: []
tamaño: XS
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-15, RF-086, RF-087, DEC-0001]
origen: hallazgo T-032
asignado: palomap2003
tomado_el: 22/10/26 20:18
rama: feature/T-151-responder-422-ante-un-numero-fuera-del-r
pr:
---
# T-151 Responder 422 ante un número fuera del rango de la base

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Si un cuerpo trae un entero que no entra en la columna de Postgres (por ejemplo `anticipacion_dias: 10000000000`), la API responde 422 problem+json en vez de 500. Lo encontró la review de T-032. Se resuelve en el manejador de errores, que traduce el `DataError` de la base, así cubre a todos los módulos sin cambiar el contrato ni inventar un tope de negocio (decisión de Paloma, 22/10/26).

## Criterios de aceptación
- [ ] `POST /api/destinos/{destino_id}/requisitos` y `PATCH /api/requisitos-destino/{requisito_id}` con `anticipacion_dias` fuera del rango de INTEGER → 422 problem+json, sin fila creada ni modificada.
- [ ] Lo mismo con un entero fuera de rango en `ConfiguracionEditar` (parámetros del negocio).
- [ ] Un 500 por cualquier otro error sigue siendo 500. Solo se traduce el error de dato fuera de rango.

## Tests esperados
`tests/api/test_errores.py` (o el archivo de cada módulo): `test_rf086_anticipacion_fuera_de_rango_da_422`, `test_rf087_editar_anticipacion_fuera_de_rango_da_422` y un caso de parámetros del negocio fuera de rango.

## Contexto (leer solo esto)
- `src/backend/rumbo/presentacion/errores.py` — manejadores de errores
- [[Contrato de la API (OpenAPI)]] §Convenciones — formato problem+json

## Archivos probables
- `src/backend/rumbo/presentacion/errores.py`

## Fuera de alcance
- Topes de negocio en los esquemas (`le=`) y cambios en `openapi.json`.

## Notas de implementación
- **Detección (`rumbo/core/errores_de_base.py`):** el entero fuera de rango no llega como `DataError` de SQLAlchemy. asyncpg lo rechaza al codificar el parámetro y llega como `DBAPIError`, cuyo `orig.__cause__` es un `asyncpg.DataError` causado por un `OverflowError`. También se cubre el SQLSTATE `22003` del servidor. Se distingue solo por tipos, sin leer el mensaje. `IntegrityError` y el resto siguen en 500.
- **Manejador:** `presentacion/errores.py` registra `DBAPIError`. Ante un número fuera de rango responde 422 problem+json, sin SQL ni el valor, y lo deja en el log con `logger.warning`. Cualquier otro error va a `_error_no_controlado` (500). La capa de presentación no importa el driver.
- **Tests de soporte (autorización de Paloma, `--tocar-tests`):** las dos `_sesion_de_test` de `tests/conftest.py` hacen `yield` dentro de `begin_nested()`. Así, después de un error en el flush, el test todavía puede leer la base. El verde lo había resuelto con un savepoint por pedido en `core/db.py`; la review mostró que en producción no aportaba nada y sumaba 2 viajes a la base, así que se revirtió.
- **Review (opus):** 0 bloqueantes, 2 importantes (savepoint en producción, driver en presentación) y 2 menores (falta de tests unitarios del clasificador, log del 422). Se arreglaron los 4. Tests unitarios nuevos en `tests/test_errores_de_base.py`.
- **Pendiente:** un `22003` que no venga del usuario (por ejemplo, un SUM que desborda) también responde 422. Queda registrado en el log.
- **Modelos:** tests sonnet, implementación/refactor/fix sonnet, review opus. Sin escalados.
