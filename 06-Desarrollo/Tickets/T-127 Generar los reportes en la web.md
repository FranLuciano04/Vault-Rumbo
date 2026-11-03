---
id: T-127
titulo: Generar los reportes en la web
modulo: M8 — Calendario, dashboard y reportes
capa: web
estado: hecho
depende_de: [T-126]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-22, RF-131, RF-132, RF-133, RF-134]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 02/11/26 22:09
rama: feature/T-127-generar-los-reportes-en-la-web
pr:
---
# T-127 Generar los reportes en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña eligen un reporte y un período, lo ven, lo comparan con otro período y lo exportan a Excel o PDF.

## Criterios de aceptación
- [ ] Catálogo de reportes y selector de período.
- [ ] Comparación entre períodos.
- [ ] Descarga en Excel y PDF.

## Tests esperados
`describe('RF-131 reporte')`, `describe('RF-134 comparar')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 29 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-22 Generar reportes y estadísticas]]

## Archivos probables
- `src/apps/web/src/features/reportes/`

## Fuera de alcance
- —

## Notas de implementación
- **DEC-0024 punto 10:** el catálogo de reportes es el de CU-22 paso 1 (ids en la DEC).
- **UI:**
  - Un `<select>` «Reporte» con el catálogo, en lugar de la lista lateral del prototipo.
  - Inputs de fecha que viajan a la API en ISO. Por defecto se toma el mes en curso, salvo en `comparacion-mensual`: ahí, mientras no se toquen las fechas, se usa el default del backend (12 meses) y los inputs se completan con el período de la respuesta.
  - Un checkbox «Comparar con otro período» que muestra el período comparado en una segunda tabla.
  - Botones «Descargar Excel/PDF». El archivo se llama `<id>-AAAAMMDD-AAAAMMDD.<ext>`.
- **Formato:** el formato de cada columna se decide por la clave, igual que en el backend: `margen_*` se muestra como `12,50 %` alineado a la derecha y `mes` como `mm/aa`. Los enteros van con separador de miles.
- **Robustez:** con fechas incompletas no se consulta. `useReporte` (@rumbo/shared) conserva los datos anteriores mientras se trata del mismo reporte. Los botones de descarga se desactivan mientras se descarga.
- **Guarda por rol:** `SeccionReportes` redirige a `/agenda` a quien no tenga la sección visible, como `SeccionConfiguracion`.
- **Refactor compartido:** `guardarArchivo` quedó en `lib/descargas.ts` y lo usa también `AccionesCotizacion`.
- **Fuera de alcance (decisión de Nahuel):** las tarjetas de resumen, la columna «vs. período» y la fila de total del prototipo. El contrato `Reporte` no trae ni la variación ni los totales, y calcularlos en la web sería lógica de negocio.
- **Tests tocados con autorización:** se corrigió el `_blob` sin uso (lint), se sacó el prop `usuario` y se agregaron casos para el default de la comparación mensual, las fechas incompletas y la guarda por rol (`App.reportes.test.tsx`).
- **Review (opus):** sin bloqueantes; se arreglaron los 3 importantes y los 6 menores en `bb80798`.
- **Modelos:** tests, implementación, refactor (sin cambios) y fix con Sonnet; review con Opus. No hubo escalados.
