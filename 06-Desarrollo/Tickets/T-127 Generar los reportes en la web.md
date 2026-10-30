---
id: T-127
titulo: Generar los reportes en la web
modulo: M8 — Calendario, dashboard y reportes
capa: web
estado: libre
depende_de: [T-126]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-22, RF-131, RF-132, RF-133, RF-134]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-127 Generar los reportes en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña eligen un reporte y un período, lo ven, lo comparan con otro período y lo exportan a Excel o PDF.

## Criterios de aceptación
- [ ] Catálogo de reportes y selector de período.
- [ ] Comparación entre períodos.
- [ ] Descarga en Excel y PDF.

## Tests esperados
`describe('RF-131 reporte')`, `describe('RF-134 comparar')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 29 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-22 Generar reportes y estadísticas]]

## Archivos probables
- `src/apps/web/src/features/reportes/`

## Fuera de alcance
- —

## Notas de implementación
- **DEC-0024 punto 10:** el catálogo de reportes es el de CU-22 paso 1 (ids en la DEC).
