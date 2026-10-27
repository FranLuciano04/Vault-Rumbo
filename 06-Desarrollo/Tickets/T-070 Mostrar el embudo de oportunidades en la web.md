---
id: T-070
titulo: Mostrar el embudo de oportunidades en la web
modulo: M4 — Oportunidades y cotizaciones
capa: web
estado: hecho
depende_de: [T-061, T-020]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-05, RF-016, RF-151]
origen: plan
asignado: palomap2003
tomado_el: 27/10/26 14:09
rama: feature/T-070-mostrar-el-embudo-de-oportunidades-en-la
pr:
---
# T-070 Mostrar el embudo de oportunidades en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El embudo muestra las oportunidades por estado, con filtros por responsable y «lo mío»; el `freelance` ve solo lo suyo.

## Criterios de aceptación
- [ ] Columnas por estado con tarjetas y totales.
- [ ] Filtros y acceso a la oportunidad.
- [ ] Vista del `freelance` (pantalla 34).

## Tests esperados
`describe('RF-016 embudo')` con MSW por rol.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 12, 34 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-05 Seguir oportunidad]]

## Archivos probables
- `src/apps/web/src/features/oportunidades/`

## Fuera de alcance
- Mover tarjetas arrastrando: los cambios de estado van por acciones explícitas.

## Notas de implementación
- **Contrato ampliado (decisión de Paloma en la sesión):** `GET /oportunidades` acepta `responsable_id` (dentro de la visibilidad; si viene `mios=true`, gana `mios`) y `Oportunidad` trae `cliente_nombre` (solo lectura, por join como `Cliente.asesor`). Sin eso, el filtro por responsable y el nombre en la tarjeta solo se podían resolver del lado del cliente, y fallaban con más de una página.
- Cada columna pide su `estado` y muestra el `total` del servidor; «Ver más» por columna con `useOportunidadesPorPaginas` (shared).
- Admin y dueño arrancan en «Toda la agencia», con el combobox «Responsable» solo en esa pestaña (como la agenda, CU-14 A1); empleado y `freelance`, en «Mis oportunidades». `FiltroResponsable` se mudó a `src/components/`.
- Review (Opus): 2 importantes (volver a «todos» mostraba solo lo propio; columnas sin paginar) y 4 menores, todos arreglados en el fix. Se sumaron 2 tests autorizados.
- Quedan sin ticket, para la sync: el buscador «Buscar por cliente o destino» y los badges de la tarjeta («Insistencia vencida», «Cotización vencida», «Viaje creado») de las pantallas 12 y 34.
- Modelos: tests Sonnet, implementación (backend y web) Sonnet, refactor Sonnet (sin cambios), review Opus. Sin escalados.
