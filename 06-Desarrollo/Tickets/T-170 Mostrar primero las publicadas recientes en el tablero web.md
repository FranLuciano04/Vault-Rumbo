---
id: T-170
titulo: Mostrar primero las publicadas recientes en el tablero web
modulo: M9 — Redes e IA
capa: web
estado: tomado
depende_de: [T-169, T-132]
tamaño: XS
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-19, RF-114]
origen: hallazgo T-132
asignado: palomap2003
tomado_el: 09/11/26 12:45
rama: feature/T-170-mostrar-primero-las-publicadas-recientes
pr:
---
# T-170 Mostrar primero las publicadas recientes en el tablero web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La columna Publicado del tablero muestra primero las piezas con fecha más reciente, y las más viejas quedan detrás de «Ver más». Las demás columnas siguen de la fecha más próxima a la más lejana.

## Criterios de aceptación
- [ ] La columna Publicado pide `orden=desc`, sin filtro de fecha: ninguna pieza publicada desaparece del tablero.
- [ ] Las demás columnas, las descartadas y el calendario mantienen su orden.

## Tests esperados
`describe('RF-114 kanban')`: la columna Publicado pide `orden=desc` sin `desde`, una pieza publicada reciente aparece antes que una vieja y las demás columnas no mandan `orden`, con MSW.

## Contexto (leer solo esto)
- [[T-132 Planificar contenido en el tablero web|T-132]], notas de implementación
- [[T-169 Ordenar las piezas de contenido de la más nueva a la más vieja|T-169]]

## Archivos probables
- `src/apps/web/src/features/redes/useTableroContenido.ts`
- `src/apps/web/src/features/redes/PaginaRedes.test.tsx`

## Fuera de alcance
- Cambios en la API, que van en T-169.

## Notas de implementación
