---
id: T-098
titulo: Registrar el pago al proveedor de cada tramo
modulo: M6 — Viajes y economía
capa: backend
estado: libre
depende_de: [T-097, T-051]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-09, RF-045, RF-047, DEC-0013]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-098 Registrar el pago al proveedor de cada tramo

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada tramo con vencimiento de pago al proveedor genera su alerta; al marcarlo pagado, la alerta se resuelve.

## Criterios de aceptación
- [ ] Cargar o cambiar el vencimiento de pago de un tramo crea o mueve su alerta (RF-045).
- [ ] Marcar el tramo como pagado al proveedor resuelve la alerta (A4, RF-047).
- [ ] Quitar el tramo cierra su alerta.

## Tests esperados
`tests/api/test_itinerario.py`: `test_rf045_alerta_de_proveedor`, `test_rf047_pagado_resuelve_alerta`, `test_quitar_tramo_cierra_alerta`.

## Contexto (leer solo esto)
- [[CU-09 Armar itinerario de hoteles]] — A4
- [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] — origen de alerta del tramo
- Contrato: `src/packages/shared/openapi.json` (módulo `viajes`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/viajes.py`

## Fuera de alcance
- Contabilidad de proveedores (fuera de alcance).

## Notas de implementación
