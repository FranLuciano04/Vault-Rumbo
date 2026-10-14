---
id: T-076
titulo: Gestionar los hoteles del catálogo
modulo: M5 — Hoteles y reseñas
capa: backend
estado: libre
depende_de: [T-075, T-012, T-011]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-16, RF-097, RF-098, RF-099, RF-100, RF-153]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-076 Gestionar los hoteles del catálogo

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Todos menos el `freelance` dan de alta y editan hoteles del catálogo, con aviso de duplicados, y dan de baja un hotel que cerró.

## Criterios de aceptación
- [ ] Alta y edición con datos mínimos validados (422) (A1, A3); `freelance` → 403.
- [ ] Posible duplicado (nombre y destino) → aviso con confirmación (A2).
- [ ] `POST /hoteles/{id}/baja` lo pasa a `cerrado` sin borrar sus reseñas (A4).

## Tests esperados
`tests/api/test_hoteles.py`: `test_rf097_alta_y_edicion`, `test_rf098_datos_minimos_422`, `test_rf099_posible_duplicado`, `test_rf100_baja_hotel_cerrado`, `test_freelance_403`.

## Contexto (leer solo esto)
- [[CU-16 Gestionar hotel en catálogo]]
- Contrato: `src/packages/shared/openapi.json` (módulo `hoteles`) y [[Contrato de la API (OpenAPI)]] §Convenciones
- [[Hotel]]

## Archivos probables
- `src/backend/rumbo/negocio/servicios/hoteles.py`
- `src/backend/rumbo/datos/repositorios/hoteles.py`
- `src/backend/rumbo/presentacion/routers/hoteles.py`

## Fuera de alcance
- Búsqueda y reseñas (tickets propios).

## Notas de implementación
