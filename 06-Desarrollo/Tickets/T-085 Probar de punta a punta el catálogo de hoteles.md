---
id: T-085
titulo: Probar de punta a punta el catálogo de hoteles
modulo: M5 — Hoteles y reseñas
capa: e2e
estado: libre
depende_de: [T-077, T-079, T-081, T-083, T-084, T-025]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-16, CU-17, CU-18, CU-29]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-085 Probar de punta a punta el catálogo de hoteles

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El catálogo funciona contra el sistema real y la semilla de demo suma hoteles y reseñas ficticios.

## Criterios de aceptación
- [ ] Un empleado da de alta un hotel y registra una reseña; la búsqueda lo ordena por puntaje.
- [ ] La admin oculta la reseña y el promedio cambia; la restaura.
- [ ] El `freelance` no puede dar de alta hoteles.

## Tests esperados
`e2e/hoteles.spec.ts`: `RF-097 alta`, `RF-101 reseña`, `RF-109 orden`, `RF-111 ocultar`.

## Contexto (leer solo esto)
- [[CU-16 Gestionar hotel en catálogo]]
- [[CU-17 Registrar reseña de hotel]]
- [[CU-18 Buscar y recomendar hoteles]]
- [[CU-29 Eliminar reseña]]

## Archivos probables
- `src/apps/web/e2e/hoteles.spec.ts`
- `src/backend/rumbo/datos/semillas/hoteles.py`

## Fuera de alcance
- —

## Notas de implementación
