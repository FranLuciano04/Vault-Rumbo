---
id: T-078
titulo: Registrar las reseñas de un hotel
modulo: M5 — Hoteles y reseñas
capa: backend
estado: libre
depende_de: [T-076]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-17, RF-101, RF-102, RF-103, RF-104, RF-105, DEC-0003]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-078 Registrar las reseñas de un hotel

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Todos menos el `freelance` registran la reseña de un cliente sobre un hotel, asociada o no a un viaje, y la editan después.

## Criterios de aceptación
- [ ] `POST /hoteles/{id}/resenas` valida puntaje y datos (422); si se asocia a un viaje, ese viaje tiene que ser del cliente (A1, A2).
- [ ] Un cliente puede tener varias reseñas del mismo hotel (RF-104).
- [ ] `PATCH /resenas/{id}` edita una reseña (RF-105).

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
