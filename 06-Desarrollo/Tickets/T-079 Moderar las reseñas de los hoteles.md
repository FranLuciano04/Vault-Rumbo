---
id: T-079
titulo: Moderar las reseñas de los hoteles
modulo: M5 — Hoteles y reseñas
capa: backend
estado: libre
depende_de: [T-078]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-29, RF-111, RF-112, RF-153]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-079 Moderar las reseñas de los hoteles

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña ocultan una reseña (baja lógica), la restauran o, de forma excepcional, la eliminan físicamente; el puntaje del hotel se recalcula.

## Criterios de aceptación
- [ ] `POST /resenas/{id}/ocultar|restaurar` solo `admin`/`dueno` (403 al resto).
- [ ] `DELETE /resenas/{id}` elimina físicamente solo en el caso excepcional de CU-29 A2.
- [ ] Una reseña oculta no cuenta en el promedio.

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
