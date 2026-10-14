---
id: T-082
titulo: Mostrar el detalle del hotel con sus reseñas en la web
modulo: M5 — Hoteles y reseñas
capa: web
estado: libre
depende_de: [T-080]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-18, CU-29, RF-108, RF-111, RF-112]
origen: plan
asignado:
tomado_el:
rama:
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
