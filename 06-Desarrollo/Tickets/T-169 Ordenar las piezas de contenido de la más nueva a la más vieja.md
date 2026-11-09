---
id: T-169
titulo: Ordenar las piezas de contenido de la más nueva a la más vieja
modulo: M9 — Redes e IA
capa: backend
estado: hecho
depende_de: [T-130]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-19, RF-114]
origen: hallazgo T-132
asignado: palomap2003
tomado_el: 09/11/26 12:09
rama: feature/T-169-ordenar-las-piezas-de-contenido-de-la-ma
pr:
---
# T-169 Ordenar las piezas de contenido de la más nueva a la más vieja

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
`GET /api/contenidos` acepta un orden por fecha de publicación, ascendente o descendente. Hoy lista siempre de la fecha más vieja a la más nueva, y por eso en la columna Publicado del tablero las piezas recientes quedan detrás de «Ver más» (hallazgo de [[T-132 Planificar contenido en el tablero web|T-132]]).

## Criterios de aceptación
- [ ] `GET /api/contenidos` acepta el parámetro `orden` (`asc` o `desc`). Sin el parámetro sigue ordenando en forma ascendente, así el calendario no cambia.
- [ ] El orden se mantiene estable entre páginas, también con piezas de la misma fecha, y se combina con los filtros existentes.
- [ ] Un valor inválido responde 422. Se regeneran `openapi.json` y los tipos de `@rumbo/shared`, y se actualizan los mocks.

## Tests esperados
`test_rf114_listar_contenidos_en_orden_descendente`, `test_rf114_orden_por_defecto_es_ascendente`, `test_rf114_orden_estable_entre_paginas` y `test_rf114_orden_invalido_es_422`, más el ajuste del test de contrato de M9.

## Contexto (leer solo esto)
- [[CU-19 Planificar contenido en redes]]
- Endpoint del contrato: `GET /api/contenidos` en `05-Diseño/API/openapi.json`
- [[T-132 Planificar contenido en el tablero web|T-132]], notas de implementación

## Archivos probables
- `src/backend/rumbo/presentacion/routers/redes.py`
- `src/backend/rumbo/negocio/servicios/redes.py`
- `src/backend/rumbo/datos/repositorios/contenidos.py`
- `src/packages/shared/` (tipos generados, `FiltrosContenidos` y mocks)

## Fuera de alcance
- El tablero web, que va en T-170.

## Notas de implementación
- `orden: Literal["asc", "desc"] = "asc"` en el router. Un valor inválido (incluido `""` o `DESC`) responde 422. El repositorio ordena por `(fecha_publicacion, id)` en el mismo sentido: el desempate por `id` hace que la paginación sea estable. El mock MSW hace lo mismo.
- Se regeneraron `src/packages/shared/openapi.json` y `tipos.gen.ts`, y `FiltrosContenidos` suma `orden`. **No** se tocó `05-Diseño/API/openapi.json`, que es la foto del contrato del PC1: el contrato vivo del PC2 sale de FastAPI. Resuelto el 09/11 por decisión de Paloma: se agregó `orden` en `generar-openapi.js` y se regeneró la foto.
- Review (opus): aprobada, con 3 menores. Se arreglaron la descripción del parámetro y el test de estabilidad, que ahora fija el desempate por `id`. Se verificó con una mutación: sin el `id`, falla.
- Modelos: tests sonnet, implementación y fix sonnet, refactor sonnet (sin cambios), review opus. Sin escalados.
