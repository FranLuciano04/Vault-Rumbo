---
id: T-119
titulo: Publicar el contrato de calendario, dashboard y reportes
modulo: M8 — Calendario, dashboard y reportes
capa: contrato
estado: hecho
depende_de: [T-015]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-21, CU-22, CU-23]
origen: plan
asignado: FranLucianoo
tomado_el: 30/10/26 14:17
rama: feature/T-119-publicar-el-contrato-de-calendario-dashb
pr:
---
# T-119 Publicar el contrato de calendario, dashboard y reportes

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existen los esquemas y routers stub (`501`) del calendario, el dashboard y los reportes, con tipos, hooks y mocks.

## Criterios de aceptación
- [x] Las rutas de `dashboard` y `calendario` con filtros (período, responsable, tipo), roles y errores.
- [x] Los reportes admiten los formatos JSON, Excel y PDF según el contrato.
- [x] Tipos, hooks y mocks MSW con datos ficticios.

## Tests esperados
`tests/api/test_contrato_m8.py`: rutas, token, rol y 501.

## Contexto (leer solo esto)
- [[Contrato de la API (OpenAPI)]] — módulos `dashboard` y `calendario`
- `05-Diseño/API/openapi.json` (PC1)

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/{dashboard,calendario}.py`
- `src/backend/rumbo/presentacion/routers/{dashboard,calendario}.py`
- `src/packages/shared/src/{hooks,esquemas,mocks}/`

## Fuera de alcance
- La lógica.

## Notas de implementación
- Cuatro rutas GET con stubs 501:
  - `/api/dashboard`: período y `responsable_id`. Admin y dueño ven toda la agencia; empleado y freelance, lo suyo.
  - `/api/reportes`: admin y dueño.
  - `/api/reportes/{reporte_id}`: período, comparación y formato json/xlsx/pdf.
  - `/api/calendario`: período, `mios`, `tipo` viaje/vencimiento y responsable. El freelance ve solo lo suyo (DEC-0008).
- Los importes del dashboard van en `list[MontoPorMoneda]` (DEC-0007). `ColumnaReporte` declara su `moneda`.
- `descargarReporte` usa `arraybuffer`, como `descargarDocumentoCotizacion`, para no perder el problem+json.
- Review de Opus: 0 bloqueantes, 4 importantes y 6 menores.
  - Se arreglaron 3 importantes: la visibilidad del calendario, `responsable_id` en el dashboard y la descarga de reportes. Más los menores baratos (`keepPreviousData`, moneda en columnas, mock del freelance y el 403 antes que el 422).
  - Se reemplazó `test_cu21_dashboard_solo_filtra_por_periodo`, con autorización.
- **Decisiones abiertas para el equipo:**
  - Alertas en el calendario: CU-23 las incluye; el contrato solo tiene viaje y vencimiento. Se agregan o se acota CU-23 con una DEC.
  - Regla de conteo de pasajeros por destino: el dato existe en `Oportunidad.pasajeros`.
  - Catálogo de reportes: los ids del mock son provisorios.
- **Pendientes menores:**
  - El contrato de PC1 (`05-Diseño/API/generar-openapi.js`) no tiene `responsable_id` en el dashboard. Hay que alinearlo.
  - El filtro por estado del calendario se hace del lado del cliente.
  - Falta declarar un tope de rango y `desde > hasta` → 422.
  - No hay test propio del mock del calendario para el freelance.
- Modelos: tests sonnet, implementación sonnet, review opus, sin escalado.
