---
id: T-084
titulo: Recomendar hoteles al emitir una cotización
modulo: M5 — Hoteles y reseñas
capa: web
estado: hecho
depende_de: [T-072, T-080]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-06, CU-18, RF-106]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 28/10/26 16:28
rama: feature/T-084-recomendar-hoteles-al-emitir-una-cotizac
pr:
---
# T-084 Recomendar hoteles al emitir una cotización

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Al armar una cotización se pueden buscar hoteles del catálogo ordenados por valoración y sumarlos a la propuesta.

## Criterios de aceptación
- [ ] Buscador de hoteles dentro del formulario de cotización, filtrado por el destino de la oportunidad.
- [ ] Los hoteles elegidos quedan en el detalle de la cotización.
- [ ] Sin resultados, se muestran las alternativas.

## Tests esperados
`describe('RF-106 recomendación en la cotización')` con MSW.

## Contexto (leer solo esto)
- [[CU-06 Emitir cotización]] — A4
- [[CU-18 Buscar y recomendar hoteles]]

## Archivos probables
- `src/apps/web/src/features/oportunidades/cotizaciones/`

## Fuera de alcance
- —

## Notas de implementación
- `BuscadorHoteles` en el formulario de cotización: se abre con «Buscar hoteles» (no pide nada antes) y ordena por valoración. El `destino_id` se resuelve desde `destino_consultado` con `useDestinos({ buscar })`. Si es null busca en todo el catálogo; si no coincide, avisa y muestra todos. Pagina con `PaginadorResenas` (nueva prop `etiqueta`).
- El contrato `ItemCotizacion` es `{concepto, precio}`, sin `hotel_id`: el hotel elegido entra como ítem. En ARS queda «<Hotel> (ref. por noche)» con el precio de referencia; en otra moneda el precio queda vacío. `hotel_id` y `hotel_nombre` viven solo en el formulario y no viajan a la API. Si hace falta un vínculo real cotización→hotel, es un cambio de contrato de backend.
- `SinResultadosHoteles` tiene una nueva prop `permitirAlta` (en la cotización no ofrece «Dar de alta un hotel»). `TarjetaHotel` tiene una nueva prop `accion`.
- Tras emitir, el `role="status"` lista los ítems.
- Review (opus): 1 importante (precio en ARS cargado en cotizaciones en USD) y 4 menores (destino sin coincidencia, paginación, alta que perdía el formulario, tests débiles), todos arreglados. En el fix se autorizó tocar el test (`--tocar-tests`) para el error de `tsc`, limpiar listeners y agregar casos; ninguna aserción existente cambió.
- No se contrastó contra el prototipo. Del catálogo solo se usan el destino y el orden por valoración (sin categoría, precio ni servicios).
- Modelos: tests sonnet, implementación/fix sonnet (el refactor no tuvo cambios), review opus. Sin escalados.
