---
id: T-125
titulo: Mostrar el calendario de viajes en la web
modulo: M8 — Calendario, dashboard y reportes
capa: web
estado: libre
depende_de: [T-119, T-020]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-23, RF-136, RF-137, RF-138, RF-139]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-125 Mostrar el calendario de viajes en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El calendario muestra viajes, vencimientos y alertas por mes, semana o día, con filtros, y cada evento lleva a su gestión.

## Criterios de aceptación
- [ ] Vistas mes, semana y día.
- [ ] Filtros y estado vacío.
- [ ] Click en un evento navega a su ficha.

## Tests esperados
`describe('RF-137 navegación del calendario')`, `describe('RF-139 ir al detalle')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 20, 38 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-23 Ver calendario de viajes y vencimientos]]

## Archivos probables
- `src/apps/web/src/features/calendario/`

## Fuera de alcance
- —

## Notas de implementación
- **Del plan:** Si hace falta una librería de calendario que no está en la spec §3, preguntar antes.
- **DEC-0024 punto 8:** el calendario muestra también las alertas programadas, con el filtro por tipo viaje / vencimiento / alerta. El filtro por estado se hace en el cliente (punto 9).
