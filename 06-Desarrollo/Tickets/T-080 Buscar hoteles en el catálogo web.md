---
id: T-080
titulo: Buscar hoteles en el catálogo web
modulo: M5 — Hoteles y reseñas
capa: web
estado: hecho
depende_de: [T-075, T-020]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-18, RF-106, RF-107, RF-109, RF-110]
origen: plan
asignado: FranLucianoo
tomado_el: 28/10/26 15:17
rama: feature/T-080-buscar-hoteles-en-el-catalogo-web
pr:
---
# T-080 Buscar hoteles en el catálogo web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El catálogo de hoteles permite buscar y filtrar, ordena por valoración y muestra alternativas cuando no hay resultados.

## Criterios de aceptación
- [x] Grilla con filtros, puntaje y orden.
- [x] Estado sin resultados con alternativas.
- [x] El `freelance` solo consulta (sin botón de alta).

## Tests esperados
`describe('RF-106 búsqueda de hoteles')`, `describe('RF-110 sin resultados')` con MSW por rol.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 21, 22, 44 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-18 Buscar y recomendar hoteles]]

## Archivos probables
- `src/apps/web/src/features/hoteles/`

## Fuera de alcance
- Detalle y formularios (tickets propios).

## Notas de implementación
- **Implementación (28/10/26):**
  - Ruta `/hoteles` con `SeccionHoteles`, `PaginaHoteles`, `TarjetaHotel` y `SinResultadosHoteles`.
  - Filtros con etiquetas visibles: destino, categoría, precio máximo (con debounce y validación) y orden. El orden por defecto es «Mejor valorados» (`orden=valoracion`). Los servicios van como chips de selección única, en un `role="group"`.
  - Si no hay resultados (`total === 0`), se muestran las `alternativas` de la API: «Quitar filtro: …», y además «Dar de alta un hotel» cuando `puede_dar_de_alta` lo permite. Si `alternativas` viene en null, se ofrece «Limpiar filtros».
  - El freelance ve el aviso «Solo consulta» (pantalla 44) y no tiene botón de alta.
- **Decisión del orquestador:** el contrato no trae catálogo de categorías ni de servicios. Por eso se agregan en `@rumbo/shared` las constantes `CATEGORIAS_HOTEL` (de 1 a 5 estrellas) y `SERVICIOS_HOTEL` (los de la pantalla 21) y se alinea el mock. T-081 (alta y edición) tiene que usar las mismas listas, y la nota ya quedó en ese ticket.
- **Shared:** se agrega `formatearPuntaje`, que redondea sobre el texto y evita los errores de punto flotante.
- **Tests:** el commit `test(T-080)` corrigió el orden de los handlers MSW y una aserción que impedía mostrar el precio. El implementador había partido el precio en dos spans para esquivarla; se revirtió y ahora el precio se muestra entero.
- **Review (opus):** 0 bloqueantes, 3 importantes y 5 menores, todos arreglados.
  - Importantes: el precio viejo volvía después de limpiar los filtros, las listas fijas no coincidían y faltaba el aviso para el freelance.
- **Desvíos del prototipo:**
  - El precio es un tope y no un rango.
  - No se puede elegir un rango de categorías ni varios servicios a la vez, porque el contrato no lo permite.
- **Modelos:** sonnet en tests e implementación; opus en la review.
