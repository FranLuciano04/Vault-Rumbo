---
id: T-180
titulo: Guardar los hoteles elegidos en la cotización
modulo: M11 — Ajustes de la revisión del equipo
capa: web
estado: hecho
depende_de: [T-174]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-06, CU-09, RF-021, RF-106]
origen: revisión del equipo (10/11/26)
asignado: FranLucianoo
tomado_el: 13/11/26 11:54
rama: feature/T-180-guardar-los-hoteles-elegidos-en-la-cotiz
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

## Notas de implementación
- **Implementado (13/11/26, Francisco):** con `hotel_id`, check-in y check-out son obligatorios (DEC-0028) y el check-out no puede ser anterior. El mensaje se reutiliza de `viajes/itinerario/esquemas.ts` (`CHECK_OUT_ANTERIOR`). Arrancan con las fechas tentativas de la oportunidad, o vacíos si no las tiene. La emitida muestra «concepto (dd/mm/aa al dd/mm/aa)» y el historial lista los hoteles con sus fechas, en un `span` para no romper `RespuestaCotizacion.test.tsx`. El contrato y los mocks no cambiaron (T-174).
- **Review (opus):** 1 importante, que el aviso de concepto y precio salía por errores de fechas, y 3 menores: las etiquetas con el nombre del hotel, la revalidación del check-out y la key del historial. Todos arreglados. Con `--tocar-tests` se agregó una sola aserción al test del check-out anterior.
- Queda opcional: `FormularioTramo` tampoco revalida el check-out al cambiar el check-in.
- **Modelos:** tests sonnet, implementación y refactor sonnet, review opus. Sin escalados.
