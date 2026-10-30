---
id: T-122
titulo: Calcular los indicadores operativos del dashboard
modulo: M8 — Calendario, dashboard y reportes
capa: backend
estado: libre
depende_de: [T-121]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-21, RF-125, RF-126, RF-128]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-122 Calcular los indicadores operativos del dashboard

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El dashboard suma los indicadores operativos y de agenda y la analítica comercial, cada uno con el enlace a su detalle.

## Criterios de aceptación
- [ ] Indicadores operativos y de agenda (RF-125).
- [ ] Analítica comercial (RF-126).
- [ ] Cada indicador trae el filtro para navegar a su detalle (RF-128).

## Tests esperados
`tests/api/test_dashboard.py`: `test_rf125_operativos`, `test_rf126_analitica`, `test_rf128_enlace_al_detalle`.

## Contexto (leer solo esto)
- [[CU-21 Ver dashboard y embudo]]
- Contrato: `src/packages/shared/openapi.json` (módulo `dashboard`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/dashboard.py`

## Fuera de alcance
- —

## Notas de implementación
- **Hallazgo de T-121 (review):** RF-124 también pide `ventas_mensuales` (comparación con meses anteriores), `pendiente_de_pagar` (a operadores) y `proximos_vencimientos`. Ningún ticket los tenía; quedan para este. Hoy `GET /api/dashboard` los devuelve vacíos o en cero.
- Conviene sumar índices en `pago.viaje_id` y `viaje.created_at`: el dashboard los recorre enteros.
- **DEC-0024 punto 7:** pasajeros por destino = suma de `Oportunidad.pasajeros` de las ventas del período; los viajes sin oportunidad no suman pasajeros.
