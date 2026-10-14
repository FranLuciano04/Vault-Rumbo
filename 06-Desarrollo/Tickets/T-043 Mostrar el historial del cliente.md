---
id: T-043
titulo: Mostrar el historial del cliente
modulo: M2 — Clientes
capa: backend
estado: libre
depende_de: [T-041]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-03, RF-006]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-043 Mostrar el historial del cliente

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La ficha muestra el historial del cliente: sus oportunidades, viajes y reseñas, del más reciente al más antiguo.

## Criterios de aceptación
- [ ] `GET /clientes/{id}/historial` devuelve oportunidades, viajes y reseñas del cliente, ordenados por fecha.
- [ ] Respeta la visibilidad (ajeno → 404 para el `freelance`).
- [ ] Un cliente sin historial devuelve listas vacías.

## Tests esperados
`tests/api/test_clientes.py`: `test_rf006_historial_ordenado` (con fábricas de oportunidad, viaje y reseña), `test_rf006_sin_historial`.

## Contexto (leer solo esto)
- [[CU-03 Gestionar ficha del cliente]] — paso 3
- Contrato: `src/packages/shared/openapi.json` (módulo `clientes`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/clientes.py`
- `src/backend/rumbo/datos/repositorios/clientes.py`

## Fuera de alcance
- La gestión de esas entidades (sus módulos).

## Notas de implementación
