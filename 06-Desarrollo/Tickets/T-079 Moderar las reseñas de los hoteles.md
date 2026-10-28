---
id: T-079
titulo: Moderar las reseñas de los hoteles
modulo: M5 — Hoteles y reseñas
capa: backend
estado: hecho
depende_de: [T-078]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-29, RF-111, RF-112, RF-153]
origen: plan
asignado: FranLucianoo
tomado_el: 28/10/26 12:59
rama: feature/T-079-moderar-las-resenas-de-los-hoteles
pr:
---
# T-079 Moderar las reseñas de los hoteles

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña ocultan una reseña (baja lógica), la restauran o, de forma excepcional, la eliminan físicamente; el puntaje del hotel se recalcula.

## Criterios de aceptación
- [x] `POST /resenas/{id}/ocultar|restaurar` solo `admin`/`dueno` (403 al resto).
- [x] `DELETE /resenas/{id}` elimina físicamente solo en el caso excepcional de CU-29 A2.
- [x] Una reseña oculta no cuenta en el promedio.

## Tests esperados
`tests/api/test_resenas.py`: `test_rf111_ocultar`, `test_rf112_restaurar`, `test_eliminacion_fisica`, `test_promedio_sin_ocultas`, roles.

## Contexto (leer solo esto)
- [[CU-29 Eliminar reseña]]
- Contrato: `src/packages/shared/openapi.json` (módulo `hoteles`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/hoteles.py`
- `src/backend/rumbo/presentacion/routers/hoteles.py`

## Fuera de alcance
- —

## Notas de implementación
- **De la review de T-075 (28/10/26):**
  - Solo admin y dueña ven las reseñas ocultas: `?estado=oculta` responde 403 al resto de los roles.
  - Ocultar una reseña ya oculta, restaurar una publicada o editar una oculta responde 409.
  - `Resena.cliente_id` le llega al freelance también en reseñas de clientes que no son suyos. Es solo un UUID, pero hay que decidir si se oculta (DEC-0008).
- **Implementación (28/10/26):** `POST /resenas/{id}/ocultar` y `POST /resenas/{id}/restaurar` (200), y `DELETE /resenas/{id}` (204), en `negocio/servicios/resenas.py`. Solo los pueden usar admin y dueña; el resto recibe 403.
  - **Ocultar:** exige `motivo_baja`, que se recorta y no puede quedar vacío (422 si no). Ocultar una reseña que ya está oculta da 409.
  - **Restaurar:** vuelve a `publicada` y deja `motivo_baja` en nulo. Restaurar una publicada da 409.
  - **Bloqueo de fila:** la moderación y `editar_resena` (T-078) leen con `obtener_para_modificar`, que usa `FOR UPDATE` y `populate_existing`.
- **Decisión de Francisco (CU-29 A2, 28/10/26):** la eliminación física solo se puede hacer sobre una reseña **ya oculta**, tenga o no viaje asociado. Una publicada da 409.
  - Cada eliminación deja un `logger.info` estructurado con `resena_id`, `hotel_id`, `cliente_id`, `puntaje`, `motivo_baja` y `actor_id`.
  - Queda como `#accion/decidir` en CU-29 si además hace falta un rastro consultable.
- **Tests:** van en `tests/api/test_moderacion_resenas.py`, no en `test_resenas.py` como decía el ticket. Los nombres son los que pide el ticket. Además, `tests/negocio/test_resenas.py` cubre el `FOR UPDATE` y el log.
- **Review (opus):** 0 bloqueantes, 2 importantes y 2 menores, todos arreglados.
  - Importantes:
    - Había una carrera: restaurar y eliminar al mismo tiempo podía borrar una reseña publicada, y dos ocultamientos simultáneos se pisaban.
    - La eliminación física no dejaba rastro.
  - Menores: el CU-29 desactualizado y la ubicación de los tests.
  - Se corrigió una línea de comentario de más de 100 caracteres en `test_contrato_m5.py` (ruff).
- **Checks (DEC-0022):** solo los rápidos. La suite completa corre en el CI.
- **Modelos:** sonnet para los tests y la implementación; opus para la review. Un corte por el límite de uso obligó a retomar al implementador, sin pérdida de trabajo.
