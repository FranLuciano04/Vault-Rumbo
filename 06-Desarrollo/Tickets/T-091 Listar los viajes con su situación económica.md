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
- [ ] Cada viaje del listado y de la ficha trae `cliente_nombre` y `destino_nombre` resueltos, como `cliente_nombre` en `Oportunidad` (hallazgo de la review de T-100). Agregarlos al esquema `Viaje` del contrato y regenerar `openapi.json` y los tipos de `@rumbo/shared`; después, `TablaViajes.tsx` los usa en lugar de buscarlos con `useClientes` y `useDestinos`.
- [ ] `GET /viajes?cliente_id=…` filtra por cliente, respetando la visibilidad del actor: lo usa `SelectorViaje` al registrar una reseña (CU-17 A1, hallazgo H-04 de la review de M5). Verificar contra la API real que la web registra una reseña vinculada a un viaje.

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
- **De T-100 (29/10/26):** la web resuelve hoy el nombre del cliente y del destino con la primera página de `/api/clientes` y `/api/destinos` (`por_pagina: 100`, el máximo). Con más de 100 clientes, algunas filas quedan sin nombre. Lo resuelve el criterio de `cliente_nombre` y `destino_nombre` de arriba.
