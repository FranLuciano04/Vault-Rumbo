---
id: T-077
titulo: Buscar hoteles ordenados por su puntaje
modulo: M5 — Hoteles y reseñas
capa: backend
estado: libre
depende_de: [T-076]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-18, RF-106, RF-107, RF-108, RF-109, RF-110]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-077 Buscar hoteles ordenados por su puntaje

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cualquier rol busca hoteles del catálogo por destino y filtros, ordenados por valoración, ve el detalle con sus reseñas y, si no hay resultados, recibe alternativas.

## Criterios de aceptación
- [ ] `GET /hoteles` filtra y ordena por puntaje promedio de reseñas publicadas (RF-107, RF-109).
- [ ] Sin resultados → alternativas según CU-18 A1 (RF-110).
- [ ] `GET /hoteles/{id}` y `GET /hoteles/{id}/resenas` con las reseñas publicadas (las ocultas solo para `admin`/`dueno`).

## Tests esperados
`tests/api/test_hoteles_busqueda.py`: `test_rf106_buscar_por_destino`, `test_rf107_promedio_solo_publicadas`, `test_rf109_orden_por_valoracion`, `test_rf110_alternativas`.

## Contexto (leer solo esto)
- [[CU-18 Buscar y recomendar hoteles]]
- Contrato: `src/packages/shared/openapi.json` (módulo `hoteles`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/hoteles.py`
- `src/backend/rumbo/datos/repositorios/hoteles.py`

## Fuera de alcance
- Recomendación dentro de la cotización (ticket web propio).

## Notas de implementación
