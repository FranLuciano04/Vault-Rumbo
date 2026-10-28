---
id: T-091
titulo: Listar los viajes con su situación económica
modulo: M6 — Viajes y economía
capa: backend
estado: libre
depende_de: [T-086, T-012, T-090]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-08, RF-037, RF-151]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-091 Listar los viajes con su situación económica

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada rol lista viajes según su visibilidad y abre la ficha con la economía, el saldo y el porcentaje pagado; el `freelance` ve su comisión.

## Criterios de aceptación
- [ ] `GET /viajes` filtra por estado, fechas y «lo mío», paginado; el `freelance` ve solo lo suyo.
- [ ] `GET /viajes/{id}` devuelve la ficha con ganancia, margen, comisión, saldo y porcentaje pagado calculados por `negocio/calculos.py` (ajeno → 404).
- [ ] Los importes salen como texto decimal.

## Tests esperados
`tests/api/test_viajes.py`: `test_rf037_ficha_con_saldo`, `test_rf151_freelance_solo_lo_suyo`, filtros.

## Contexto (leer solo esto)
- [[CU-08 Gestionar estado del viaje]] — consulta
- Contrato: `src/packages/shared/openapi.json` (módulo `viajes`) y [[Contrato de la API (OpenAPI)]] §Convenciones
- [[Prototipo UI]] — pantallas 14, 15, 42, 43 (PNG en `07-Entregables/Prototipo/img/`)

## Archivos probables
- `src/backend/rumbo/negocio/servicios/viajes.py`
- `src/backend/rumbo/datos/repositorios/viajes.py`
- `src/backend/rumbo/presentacion/routers/viajes.py`

## Fuera de alcance
- Cambios de estado.

## Notas de implementación
- **De T-078 (28/10/26):** `src/backend/rumbo/datos/repositorios/viajes.py` ya existe con un `RepositorioViajes` mínimo (`RepositorioBase[Viaje]`), que crearon las reseñas para validar el viaje asociado. Extendelo en lugar de crear otro.
