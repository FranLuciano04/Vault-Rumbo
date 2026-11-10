---
id: T-180
titulo: Guardar los hoteles elegidos en la cotización
modulo: M11 — Ajustes de la revisión del equipo
capa: web
estado: libre
depende_de: [T-174]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-06, CU-09, RF-021, RF-106]
origen: revisión del equipo (10/11/26)
asignado:
tomado_el:
rama:
pr:
---
# T-180 Guardar los hoteles elegidos en la cotización

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cuando se elige un hotel del catálogo al armar la cotización, el ítem guarda el hotel y sus fechas de check-in y check-out. Con eso, al confirmar la reserva, el viaje nace con el itinerario armado (T-177). Aplica la `DEC-` que destraba T-174.

## Criterios de aceptación
- [ ] Un ítem que salió de un hotel del catálogo muestra los campos check-in y check-out. Arrancan con las fechas tentativas de la oportunidad y validan que el check-out no sea anterior al check-in.
- [ ] Al emitir la cotización, esos ítems mandan `hotel_id`, `check_in` y `check_out` a la API. Los ítems sin hotel se mandan como hoy.
- [ ] La cotización emitida y su historial muestran los hoteles con sus fechas.

## Tests esperados
`describe('RF-106 hotel con fechas en la cotización')`: las fechas iniciales, el check-out anterior al check-in, el pedido con y sin hotel y la vista de la cotización emitida. Ajustar `RecomendarHoteles.test.tsx`, que hoy verifica que el `hotel_id` no se manda.

## Contexto (leer solo esto)
- La `DEC-` aprobada (ver T-174, «Decisión pendiente», punto 3)
- `src/apps/web/src/features/oportunidades/cotizaciones/FormularioCotizacion.tsx` y `esquemas.ts` (`hotel_id` «no viaja a la API»)

## Archivos probables
- `src/apps/web/src/features/oportunidades/cotizaciones/`

## Fuera de alcance
- El backend, que va en T-177.
