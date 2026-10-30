---
id: T-106
titulo: Armar el itinerario de hoteles en la web
modulo: M6 — Viajes y economía
capa: web
estado: hecho
depende_de: [T-102, T-075]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-09, RF-043, RF-044, RF-046, RF-047]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 29/10/26 22:44
rama: feature/T-106-armar-el-itinerario-de-hoteles-en-la-web
pr:
---
# T-106 Armar el itinerario de hoteles en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
En la ficha del viaje se arma el itinerario eligiendo hoteles del catálogo por tramo, se editan o quitan tramos y se marca el pago al proveedor.

## Criterios de aceptación
- [ ] Lista de tramos con buscador de hoteles del catálogo.
- [ ] Edición y baja de tramos; validación de fechas.
- [ ] Marca de pagado al proveedor.

## Tests esperados
`describe('RF-043 itinerario')`, `describe('RF-047 pago a proveedor')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 17 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-09 Armar itinerario de hoteles]]

## Archivos probables
- `src/apps/web/src/features/viajes/itinerario/`

## Fuera de alcance
- —

## Notas de implementación
- `features/viajes/itinerario/`: `ItinerarioViaje` (lista, alta, edición, baja y checkbox de pago al proveedor), `BuscadorHoteles`, `FormularioTramo` y `esquemas.ts`. Va embebido en la sección «Itinerario» de `FichaViaje`, con el mismo `editable` que la economía.
- El buscador filtra por nombre en el cliente sobre los hoteles activos **del destino del viaje** (la API no busca por texto). Si hay más de 100, avisa. Tiene un enlace para dar de alta un hotel fuera del catálogo (A2). El orden se edita con un campo (A3). En cada tramo se ve el estado de la alerta de pago, sin calcular la fecha en el front.
- Tests corregidos con autorización (`--tocar-tests`):
  - Se sacaron los `filas[0]!`, que fallaban el lint.
  - `MemoryRouter` en `renderItinerario`.
  - Los hoteles de los tests se cambiaron a los del destino del viaje.
  - `manejadoresHoteles` en `FichaViaje.test.tsx`.
  - Se sumaron los tests que pidió la review.
- Menores que quedan:
  - «Quitar» borra sin confirmar, porque la web todavía no tiene un patrón de diálogo.
  - `editable` de la UI no coincide con el backend: un freelance responsable y un viaje finalizado pueden escribir según el backend. Es decisión de producto.
  - Diferencias cosméticas con la pantalla 17: toggle en lugar de checkbox, círculo de orden, menú «…», noches y destino o puntaje en la tarjeta.
- Modelos: tests sonnet, implementación y fix sonnet, review opus. Sin escalados.
