---
id: T-126
titulo: Mostrar el dashboard con el embudo en la web
modulo: M8 — Calendario, dashboard y reportes
capa: web
estado: hecho
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
- [x] Tarjetas e indicadores del prototipo con el embudo.
- [x] Filtros y navegación al detalle de cada indicador.
- [x] Vistas por rol (28, 46, 47).

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
- `features/dashboard/`: `PaginaDashboard`, `EmbudoDeVentas`, `VentasPorMes`, `TarjetaIndicador` y `PanelLista`, sin librerías de gráficos (barras con divs). La ruta es `/dashboard` (`SeccionDashboard`).
- Por rol, según DEC-0024 y las pantallas 28, 46 y 47:
  - Admin y dueño ven la agencia, el ranking y el filtro «Empleado», que sale de `useUsuarios` e incluye al freelance.
  - Empleado y freelance ven sus ventas, su comisión, el ticket promedio, lo cobrado a sus pasajeros y los viajes próximos.
- ARS y USD van siempre por separado (DEC-0007).
- Review de Opus: 0 bloqueantes, 4 importantes y 6 menores. Todos se arreglaron en el fix, con tests modificados y agregados bajo autorización.
- **Desvíos y pendientes:**
  - «Tus viajes activos» del prototipo pasó a «Viajes próximos», porque el contrato no tiene ese contador. Sumarlo queda para T-122.
  - El período se elige con Desde y Hasta, no con un selector de mes.
  - Las etapas del embudo enlazan a `/oportunidades` sin filtrar.
  - Los indicadores operativos se ven vacíos hasta T-122.
- Se agregó un handler de `GET /api/usuarios` en `manejadoresDashboardPara` (`@rumbo/shared`).
- Modelos: tests sonnet, implementación y refactor sonnet, review opus, sin escalado.
