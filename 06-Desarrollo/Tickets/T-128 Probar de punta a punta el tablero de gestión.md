---
id: T-128
titulo: Probar de punta a punta el tablero de gestión
modulo: M8 — Calendario, dashboard y reportes
capa: e2e
estado: libre
depende_de: [T-120, T-122, T-124, T-125, T-127, T-109]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-21, CU-22, CU-23]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-128 Probar de punta a punta el tablero de gestión

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Calendario, dashboard y reportes funcionan contra el sistema real con los datos de demo.

## Criterios de aceptación
- [ ] El calendario muestra los viajes y vencimientos de la semilla.
- [ ] El dashboard de la dueña y el de un empleado muestran cifras distintas (acotado por rol).
- [ ] Un reporte se exporta a Excel y PDF.

## Tests esperados
`e2e/gestion.spec.ts`: `RF-136 calendario`, `RF-129 dashboard por rol`, `RF-133 exportar`.

## Contexto (leer solo esto)
- [[CU-21 Ver dashboard y embudo]]
- [[CU-22 Generar reportes y estadísticas]]
- [[CU-23 Ver calendario de viajes y vencimientos]]

## Archivos probables
- `src/apps/web/e2e/gestion.spec.ts`

## Fuera de alcance
- —

## Notas de implementación
