---
id: T-078
titulo: Registrar las reseñas de un hotel
modulo: M5 — Hoteles y reseñas
capa: backend
estado: hecho
depende_de: [T-076]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-17, RF-101, RF-102, RF-103, RF-104, RF-105, DEC-0003]
origen: plan
asignado: FranLucianoo
tomado_el: 28/10/26 12:16
rama: feature/T-078-registrar-las-resenas-de-un-hotel
pr:
---
# T-078 Registrar las reseñas de un hotel

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Todos menos el `freelance` registran la reseña de un cliente sobre un hotel, asociada o no a un viaje, y la editan después.

## Criterios de aceptación
- [x] `POST /hoteles/{id}/resenas` valida puntaje y datos (422); si se asocia a un viaje, ese viaje tiene que ser del cliente (A1, A2).
- [x] Un cliente puede tener varias reseñas del mismo hotel (RF-104).
- [x] `PATCH /resenas/{id}` edita una reseña (RF-105).

## Tests esperados
`tests/api/test_resenas.py`: `test_rf101_registrar`, `test_rf102_asociar_viaje`, `test_rf103_validacion_422`, `test_rf104_varias_del_mismo_cliente`, `test_rf105_editar`.

## Contexto (leer solo esto)
- [[CU-17 Registrar reseña de hotel]]
- [[DEC-0003 Relación Viaje–Hotel y Reseña|DEC-0003]]
- Contrato: `src/packages/shared/openapi.json` (módulo `hoteles`) y [[Contrato de la API (OpenAPI)]] §Convenciones
- [[Reseña]]

## Archivos probables
- `src/backend/rumbo/negocio/servicios/hoteles.py`
- `src/backend/rumbo/presentacion/routers/hoteles.py`

## Fuera de alcance
- La alerta de reseña post-viaje (M6).

## Notas de implementación
- **De la review de T-075 (28/10/26):**
  - Solo admin y dueña ven las reseñas ocultas: `?estado=oculta` responde 403 al resto de los roles.
  - Ocultar una reseña ya oculta, restaurar una publicada o editar una oculta responde 409.
  - `Resena.cliente_id` le llega al freelance también en reseñas de clientes que no son suyos. Es solo un UUID, pero hay que decidir si se oculta (DEC-0008).
- **Implementación (28/10/26):**
  - `POST /hoteles/{id}/resenas` (201) y `PATCH /resenas/{id}`.
  - Las capas son el router, el servicio nuevo `negocio/servicios/resenas.py` y los repositorios nuevos `resenas.py` y `viajes.py`. `viajes.py` es mínimo y T-091 lo va a extender.
  - El promedio del hotel sale de `resumen_resenas` (T-076).
- **Decisiones:**
  - **Hotel cerrado:** se puede reseñar, porque la reseña es de una estadía pasada y CU-16 A4 conserva su historial.
  - **Errores de datos:**
    - Cliente o viaje inexistente: 422 en su campo.
    - Viaje de otro cliente: 422 en `viaje_id`.
    - Hotel inexistente: 404.
  - **Visibilidad:** el cliente y el viaje se buscan con la visibilidad de quien pide. Empleado, admin y dueña ven toda la agencia (DEC-0005).
  - **Editar una reseña oculta:**
    - Admin y dueña: 409.
    - Empleado: 404, porque no ve las ocultas (DEC-0005 y DEC-0008).
  - **Edición:** el hotel, el cliente y el viaje no se cambian.
- **Review (opus):** 0 bloqueantes, 1 importante y 3 menores, todos arreglados.
  - Importante: la consulta se salteaba la visibilidad para dar 409 al empleado. Se cambió a 404 y se corrigió el test del rojo.
  - Menores: una aserción débil y el docstring.
  - **Queda abierto para la sync:** si se puede asociar un viaje cancelado o un viaje cuyo itinerario no incluye ese hotel. Ni CU-17 ni DEC-0003 lo prohíben.
- **Checks (DEC-0022):** solo los rápidos (tests del ticket y vecinos, ruff y mypy). No toca código compartido, así que la suite completa corre en el CI.
- **Modelos:** sonnet para tests e implementación, opus para la review.
