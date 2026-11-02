---
id: T-123
titulo: Generar los reportes del período
modulo: M8 — Calendario, dashboard y reportes
capa: backend
estado: hecho
depende_de: [T-119, T-121]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-22, RF-131, RF-132, RF-134, RF-135]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 02/11/26 19:34
rama: feature/T-123-generar-los-reportes-del-periodo
pr:
---
# T-123 Generar los reportes del período

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña generan los reportes del catálogo para un período, los comparan con otro período y reciben un resultado claro cuando no hay datos.

## Criterios de aceptación
- [ ] `GET /reportes` (catálogo) y `GET /reportes/{id}` en JSON, solo `admin`/`dueno`.
- [ ] Comparación entre dos períodos (A2, RF-134).
- [ ] Período sin datos (A3, RF-135); reporte mensual recurrente según A1.

## Tests esperados
`tests/api/test_reportes.py`: `test_rf131_generar`, `test_rf134_comparar`, `test_rf135_sin_datos`, roles.

## Contexto (leer solo esto)
- [[CU-22 Generar reportes y estadísticas]]
- Contrato: `src/packages/shared/openapi.json` (módulo `dashboard`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/reportes.py`
- `src/backend/rumbo/presentacion/routers/dashboard.py`

## Fuera de alcance
- Exportar (ticket siguiente).

## Notas de implementación
- **DEC-0024 punto 10:** el catálogo de reportes es el de CU-22 paso 1, con los ids `ventas`, `ganancia`, `cobranzas`, `pagos-operadores`, `ventas-por-destino`, `ventas-por-operador`, `ventas-por-vendedor`, `pasajeros`, `formas-de-pago` y `comparacion-mensual`. Las comisiones se atribuyen al vendedor (punto 6).
- **Forma de las filas:** importes en columnas por moneda (`*_ars`, `*_usd`) como texto decimal. Período sin datos (A3) → 200 con `columnas` y `filas == []`. Sin fechas, el mes en curso (A1). `comparar_desde`/`comparar_hasta` van juntos; a medias o invertidos → 422.
- **Decisiones de Nahuel (02/11/26), borrador para validar con el equipo:**
  - `pagos-operadores` es una foto al día de hoy, con `pagado_*` y `pendiente_*`, y no se compara (`filas_comparadas` = null): `ViajeHotel` no tiene fecha de pago al proveedor.
  - En `cobranzas`, `pendiente_*` es la foto de hoy solo en `filas`; en `filas_comparadas` va en 0,00.
  - `comparacion-mensual` sin fechas toma los últimos 12 meses y completa con 0,00 los meses sin ventas.
- **Otras:** `ganancia` suma `margen_*` (DEC-0007, % como texto). Hay filas «Sin operador» y «Sin especificar» en forma de pago (si falta la moneda del cobro, se usa la del viaje).
- **Tests tocados con autorización:** los 6 de `test_contrato_m8.py` que esperaban 501 en `/reportes` JSON (`xlsx`/`pdf` siguen en 501). Las líneas largas del docstring del rojo se acortaron para ruff.
- **Review (Opus):** sin bloqueantes; se arreglaron 4 importantes y 3 menores. Hay errores de mypy previos en `tests/` (líneas 90 y 105 de `test_reportes.py`, fuera de lo que chequea el CI con `mypy rumbo`).
- **Modelos:** tests, implementación, refactor y fix con Sonnet; review con Opus. No hubo escalados.
