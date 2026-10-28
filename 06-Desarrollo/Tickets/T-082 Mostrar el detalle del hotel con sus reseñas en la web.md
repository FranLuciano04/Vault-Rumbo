---
id: T-082
titulo: Mostrar el detalle del hotel con sus reseñas en la web
modulo: M5 — Hoteles y reseñas
capa: web
estado: hecho
depende_de: [T-080]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-18, CU-29, RF-108, RF-111, RF-112]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 28/10/26 15:55
rama: feature/T-082-mostrar-el-detalle-del-hotel-con-sus-res
pr:
---
# T-082 Mostrar el detalle del hotel con sus reseñas en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El detalle del hotel muestra sus datos, el puntaje y las reseñas; admin y dueña además las moderan.

## Criterios de aceptación
- [ ] Detalle con reseñas publicadas y puntaje.
- [ ] Moderación (ocultar, restaurar) solo para `admin`/`dueno` (pantalla 24).
- [ ] Vistas de solo lectura de `freelance` y `empleado` (45, 48).

## Tests esperados
`describe('RF-108 detalle de hotel')`, `describe('RF-111 moderación')` con MSW por rol.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 24, 45, 48 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-18 Buscar y recomendar hoteles]] — paso 3
- [[CU-29 Eliminar reseña]]

## Archivos probables
- `src/apps/web/src/features/hoteles/`

## Fuera de alcance
- —

## Notas de implementación
- Ruta `/hoteles/:hotelId` (`SeccionDetalleHotel`, con `useParams` y `useOutletContext`); el nombre en `TarjetaHotel` es el enlace al detalle.
- `DetalleHotel` muestra destino, categoría, badge de estado (aviso si está `cerrado`), puntaje, servicios y precio; reseñas publicadas paginadas (`PaginadorResenas`). Admin y dueño moderan: ocultar con motivo obligatorio (`ResenaPublicada`) y restaurar desde `ResenasOcultas`; freelance y empleado nunca piden `estado=oculta` (403). El freelance ve el aviso «Solo consulta» de la pantalla 45.
- Tests: `RF-108 detalle de hotel`, `RF-108 paginación de reseñas`, `RF-108 detalle por rol (solo lectura)`, `RF-111 moderación`, `RF-112 restaurar reseña`. En el fix se autorizó tocar el test (`--tocar-tests`) para quitar un `!`, renombrar describes según el RF real y agregar casos; ninguna aserción existente cambió.
- Review (opus): 2 importantes (paginación de reseñas, estado del hotel) y menores (destino, aviso freelance, reset al cancelar, error de ocultas, carga/vacío), todos arreglados.
- Pendientes menores (diseño de las pantallas 24/45): pestañas «Publicadas · N / Ocultas · N», cliente y viaje de origen en cada reseña (requiere datos que `Resena` no trae), texto explicativo del panel de ocultar. Sin tests para los estados de carga/vacío/error de ocultas.
- Modelos: tests sonnet, implementación/refactor/fix sonnet, review opus. Sin escalados.
