---
id: T-126
titulo: Mostrar el dashboard con el embudo en la web
modulo: M8 — Calendario, dashboard y reportes
capa: web
estado: tomado
depende_de: [T-119, T-020]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-21, RF-123, RF-124, RF-125, RF-127, RF-128, RF-129]
origen: plan
asignado: FranLucianoo
tomado_el: 30/10/26 16:17
rama: feature/T-126-mostrar-el-dashboard-con-el-embudo-en-la
pr:
---
# T-126 Mostrar el dashboard con el embudo en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El dashboard muestra el embudo y los indicadores con filtros de período y responsable; cada rol ve su versión.

## Criterios de aceptación
- [ ] Tarjetas e indicadores del prototipo con el embudo.
- [ ] Filtros y navegación al detalle de cada indicador.
- [ ] Vistas por rol (28, 46, 47).

## Tests esperados
`describe('RF-123 embudo')`, `describe('RF-129 vista por rol')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 28, 46, 47 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-21 Ver dashboard y embudo]]

## Archivos probables
- `src/apps/web/src/features/dashboard/`

## Fuera de alcance
- —

## Notas de implementación
- **Del plan:** Si hace falta una librería de gráficos que no está en la spec §3, preguntar antes.
