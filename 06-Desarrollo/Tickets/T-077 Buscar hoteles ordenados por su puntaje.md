---
id: T-077
titulo: Buscar hoteles ordenados por su puntaje
modulo: M5 — Hoteles y reseñas
capa: backend
estado: hecho
depende_de: [T-076]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-18, RF-106, RF-107, RF-108, RF-109, RF-110]
origen: plan
asignado: FranLucianoo
tomado_el: 28/10/26 14:27
rama: feature/T-077-buscar-hoteles-ordenados-por-su-puntaje
pr:
---
# T-077 Buscar hoteles ordenados por su puntaje

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cualquier rol busca hoteles del catálogo por destino y filtros, ordenados por valoración, ve el detalle con sus reseñas y, si no hay resultados, recibe alternativas.

## Criterios de aceptación
- [x] `GET /hoteles` filtra y ordena por puntaje promedio de reseñas publicadas (RF-107, RF-109).
- [x] Sin resultados → alternativas según CU-18 A1 (RF-110).
- [x] `GET /hoteles/{id}` y `GET /hoteles/{id}/resenas` con las reseñas publicadas (las ocultas solo para `admin`/`dueno`).

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
- **De la review de T-076 (28/10/26):**
  - `puntaje_promedio` y `cantidad_resenas` salen de `RepositorioHoteles.resumen_resenas`, que hace una consulta por hotel. En el listado y la búsqueda no hay que llamarlo por fila, porque eso es N+1: el resumen tiene que venir en la misma consulta de la página, con una subconsulta agregada o un `GROUP BY` sobre las reseñas publicadas.
  - `servicios` es `ARRAY(Text)`, así que el filtro por servicio se resuelve con `@>` o `&&`.
- **Implementación (28/10/26):** `GET /hoteles` (búsqueda) y `GET /hoteles/{id}/resenas` (reseñas del hotel), con la visibilidad del actor.
  - **Búsqueda (`RepositorioHoteles.buscar`):**
    - El promedio y la cantidad de reseñas salen en la misma consulta de la página, con un outer join a una subconsulta agrupada de las publicadas. No hay N+1 y un test lo verifica contando las consultas.
    - Filtros con AND. `categoria` y `servicio` se comparan exactos y sin distinguir mayúsculas; `servicio` es un elemento del `text[]`. `precio_max` incluye el valor y deja afuera los hoteles sin precio. Un texto vacío o con solo espacios no cuenta como filtro.
    - Órdenes:
      - por nombre;
      - por valoración, de mayor a menor, con los hoteles sin reseñas al final;
      - por precio, de menor a mayor, con los hoteles sin precio al final.
    - En todos los casos se desempata por nombre normalizado y después por id.
  - **Reseñas del hotel:** se ordenan por fecha, `created_at` e id, todo descendente salvo el id. `estado=oculta` responde 403 al empleado y al freelance, antes de buscar el hotel.
- **Decisión (CU-18 A1, RF-110):** el contrato suma `alternativas` en la respuesta de la búsqueda.
  - Si hay resultados, viene en `null`.
  - Si no hay resultados, trae `{ampliar_filtros, puede_dar_de_alta}`. `ampliar_filtros` lista los filtros aplicados. `puede_dar_de_alta` es verdadero para los roles que gestionan el catálogo.
  - No sugiere hoteles concretos.
- **Infraestructura común:** `respuesta_pagina(..., extras=, modelos=)` registra en `contrato.py` los modelos que hay que publicar, y `openapi.py` los publica con una función genérica. El OpenAPI de los demás módulos no cambia.
- **Front:** `useHoteles` devuelve `PaginaHoteles` y el mock respeta las mismas reglas de orden y filtro que la API.
- **Review (opus):** 0 bloqueantes, 1 importante (el `openapi.py` compartido importaba un esquema de hoteles) y 6 menores. Todos se arreglaron menos uno.
  - **Pendiente:** un índice `resena (hotel_id, estado)`. Hoy la consulta recorre la tabla completa y la subconsulta agrega todas las publicadas. Con el volumen de una PyME no hace falta todavía. Va en un ticket o fix futuro con migración, para no correr la suite completa sin necesidad (DEC-0022).
- **Checks:** pasan los tests del ticket y los contratos de los 6 módulos, porque se tocó `contrato.py` y `openapi.py`, además de shared y web.
- **Modelos:** sonnet en tests e implementación; opus en la review.
