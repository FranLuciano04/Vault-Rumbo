---
tipo: referencia
estado: formalizado
responsable: equipo
modulo: M8
actualizado: 05/11/26
---
# M8 — pedido de review

tags:: #tipo/referencia #estado/formalizado #pc/pc2

> Pedido de review del módulo **M8 — Calendario, dashboard y reportes** para Codex, según [[Review de módulo — rol de Codex]] y [[DEC-0014 Flujo de implementación con agentes|DEC-0014]]. Los hallazgos van en `06-Desarrollo/Reviews/M8 — review Codex.md`.

## Alcance
M8 agrega las vistas de gestión: el calendario consolidado, el dashboard con el embudo y los reportes exportables.

**Backend:**
- `GET /calendario` consolida viajes, vencimientos de pagos y alertas, con filtros (CU-23).
- `GET /dashboard` calcula el embudo, los indicadores económicos y los operativos, por moneda y acotados por rol (CU-21, DEC-0007, DEC-0008).
- Los reportes del período, con comparación entre períodos, y su exportación a Excel y PDF (CU-22). Excel suma la dependencia `openpyxl`.

**Contrato compartido:** esquemas, `openapi.json`, tipos generados, hooks y mocks de calendario, dashboard y reportes.

**Web:** las secciones Calendario, Dashboard y Reportes. Mobile no cambia.

**Pruebas e2e:** `gestion.spec.ts` contra el sistema real con los datos de demo.

Revisá **solo los diffs de los merges de abajo** (`git diff <merge>^1 <merge>`). `main` ya tiene código posterior encima, así que si un archivo cambió después, el código vigente puede no ser el del merge.

## Tickets y merges

| Ticket | Capa | Riesgo | Trazabilidad | Merge |
|---|---|---|---|---|
| [[T-119 Publicar el contrato de calendario, dashboard y reportes]] | contrato | normal | CU-21, CU-22, CU-23 | `c3010e8` Merge pull request #158 |
| [[T-120 Consultar el calendario consolidado]] | backend | normal | CU-23, RF-136 a RF-139 | `8060a1c` Merge pull request #168 |
| [[T-121 Calcular el embudo con los indicadores económicos]] | backend | normal | CU-21, RF-123, RF-124, RF-127, RF-129, RF-130 | `e4fb17a` Merge pull request #161 |
| [[T-122 Calcular los indicadores operativos del dashboard]] | backend | normal | CU-21, RF-125, RF-126, RF-128 | `e8a6313` Merge pull request #167 |
| [[T-123 Generar los reportes del período]] | backend | normal | CU-22, RF-131, RF-132, RF-134, RF-135 | `744d7c7` Merge pull request #179 |
| [[T-124 Exportar los reportes a Excel o PDF]] | backend | normal | CU-22, RF-133 | `40db989` Merge pull request #180 |
| [[T-125 Mostrar el calendario de viajes en la web]] | web | normal | CU-23, RF-136 a RF-139 | `025088e` Merge pull request #189 |
| [[T-126 Mostrar el dashboard con el embudo en la web]] | web | normal | CU-21, RF-123 a RF-125, RF-127 a RF-129 | `a2ee195` Merge pull request #165 |
| [[T-127 Generar los reportes en la web]] | web | normal | CU-22, RF-131 a RF-134 | `e285efd` Merge pull request #182 |
| [[T-128 Probar de punta a punta el tablero de gestión]] | e2e | normal | CU-21, CU-22, CU-23 | `ad4e188` Merge pull request #193 |

**Tamaño:** los 10 merges suman 67 archivos distintos (+11.001 / −255 líneas, con las notas de tickets y los archivos generados incluidos).

**Migraciones:** M8 no agrega ninguna.

**Riesgo:** los 10 tickets son de riesgo normal, aunque M8 calcula dinero y acota datos por rol. Por eso conviene mirar con cuidado los puntos 1 y 2.

## Archivos tocados por el módulo
Unión de `git diff --name-only <merge>^1 <merge>` de los 10 merges, sin las notas de tickets ni de bitácoras.

**Backend (`src/backend/`)**
- Dependencias: `pyproject.toml`, `uv.lock`.
- Arranque: `rumbo/main.py`.
- Datos: `rumbo/datos/repositorios/{calendario,dashboard}.py`.
- Negocio:
  - `rumbo/negocio/calculos.py`;
  - `rumbo/negocio/servicios/{calendario,dashboard,exportar_reportes,reportes}.py`;
  - `rumbo/negocio/documentos/{cotizacion,formato,reporte}.py` y `plantillas/reporte.html`.
- Presentación:
  - `rumbo/presentacion/esquemas/{calendario,dashboard}.py`;
  - `rumbo/presentacion/routers/{calendario,dashboard}.py`.
- Tests:
  - `tests/api/test_{calendario,contrato_m8,dashboard,reportes,reportes_exportar}.py`;
  - `tests/negocio/test_{calculos_comision,documento_reporte}.py`.

**Contrato compartido (`src/packages/shared/`)**
- Generados: `openapi.json`, `src/tipos.gen.ts`.
- `src/modelos.ts`.
- Hooks: `src/hooks/{calendario,dashboard,dashboard.test,index}.ts`.
- Mocks: `src/mocks/{dashboard,index}.ts`.

**Web (`src/apps/web/`)**
- App: `src/app/{App,SeccionCalendario,SeccionDashboard,SeccionReportes}.tsx` y `App.reportes.test.tsx`.
- Calendario: `src/features/calendario/{PaginaCalendario,PaginaCalendario.test}.tsx` y `periodo{,.test}.ts`.
- Dashboard: `src/features/dashboard/{EmbudoDeVentas,PaginaDashboard,PaginaDashboard.test,PanelLista,TarjetaIndicador,VentasPorMes}.tsx`.
- Reportes: `src/features/reportes/{PaginaReportes,PaginaReportes.test,TablaReporte}.tsx`.
- Compartido: `src/lib/{descargas,errores}.ts` y `src/features/oportunidades/cotizaciones/AccionesCotizacion.tsx`.
- e2e: `e2e/{apoyo.ts,gestion.spec.ts}`.

## Puntos que conviene mirar entre tickets
1. **Visibilidad por rol (T-120 a T-124, DEC-0005, DEC-0008).**
   - Que calendario, dashboard, reportes y exportación acoten igual a `empleado` y `freelance`, y que ninguno muestre datos de otra persona.
   - Que `responsable_id` solo tenga efecto para admin y dueño.
   - Que el Excel y el PDF no traigan más datos que la vista en pantalla.
   - Que empleado y freelance no vean ganancia, margen ni comisiones ajenas.
2. **Dinero (T-121 a T-124, DEC-0007, DEC-0024).**
   - Que ganancia, margen, comisiones, cobrado y pendiente salgan por moneda, sin mezclar ARS y USD.
   - Que el mismo indicador dé lo mismo en dashboard y reportes.
   - Los viajes cancelados, los pagos anulados y las comisiones de un vendedor de baja.
   - El cambio en `negocio/calculos.py`: que no altere lo ya cumplido en M6.
3. **Períodos y zona horaria (T-120 a T-123, T-125).**
   - Que los bordes de `desde` y `hasta` sean los de `America/Argentina/Buenos_Aires` y se comporten igual en los tres módulos.
   - La fecha que usa cada indicador: creación del viaje, fecha de cobro o vencimiento.
   - Los cambios de mes en `periodo.ts` y en `sumar_meses`.
4. **Exportación (T-124, T-127).**
   - Que la protección contra inyección de fórmulas cubra todas las celdas de texto del Excel.
   - Que los datos escapen bien en `plantillas/reporte.html`.
   - Los límites de tamaño y de tiempo con un período largo.
   - Que el refactor a `documentos/formato.py` no cambie el PDF de las cotizaciones (`cotizacion.py`, `AccionesCotizacion.tsx`).
   - Que `openpyxl` no agregue vulnerabilidades conocidas.
5. **Rendimiento (T-120 a T-123).**
   - Consultas N+1 y agregaciones hechas en Python en vez de en la base.
   - Cuántas consultas hace un `GET /dashboard`.
6. **Contrato backend ↔ shared ↔ web (T-119, T-125 a T-127).**
   - Que `openapi.json`, `tipos.gen.ts` y los mocks coincidan con lo que devuelve el backend, en especial lo que T-122 agregó después de T-119.
   - Que la web oculte lo mismo que el backend prohíbe, sin depender de eso para la seguridad.
   - Que los enlaces de los indicadores lleven a listados con filtros válidos.
   - Los cambios en `lib/errores.ts` y `lib/descargas.ts`: que no alteren a las demás pantallas.
7. **Ya conocido, no hace falta reportarlo:**
   - Falta ratificar con el equipo las decisiones de Francisco sobre los indicadores, anotadas en T-121.
   - `pendiente_de_pagar` suma el costo completo del viaje porque T-098 no guarda el importe por tramo: es un supuesto a confirmar con la agencia (T-122).
   - «Consultas pendientes» y «Viajes activos» llevan al listado completo (T-122).
   - `pagos-operadores` es una foto al día de hoy y no se compara (T-123).
   - Quedan fuera las tarjetas de resumen, la columna «vs. período» y la fila de total de reportes (T-127), y el filtro «lo mío» y el aviso de freelance del calendario (T-125).
   - RF-133 en el e2e valida el formato del archivo exportado, no su contenido (T-128).
   - `e2e/cu01.spec.ts` no pasa `prettier --check`, y el CI no corre Prettier sobre la web.
