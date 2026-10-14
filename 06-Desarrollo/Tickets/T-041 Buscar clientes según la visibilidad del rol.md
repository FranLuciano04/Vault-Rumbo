---
id: T-041
titulo: Buscar clientes según la visibilidad del rol
modulo: M2 — Clientes
capa: backend
estado: libre
depende_de: [T-039, T-012]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-03, RF-005, RF-009, RF-031, RF-151]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-041 Buscar clientes según la visibilidad del rol

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada rol busca clientes por texto o etiquetas y abre su ficha, viendo solo lo que le corresponde: el `freelance` únicamente sus clientes; el resto, toda la agencia con el filtro «lo mío».

## Criterios de aceptación
- [ ] `GET /clientes` con búsqueda por texto, etiquetas (segmentos comerciales) y «lo mío», paginado.
- [ ] `GET /clientes/{id}` devuelve la ficha; un cliente ajeno para el `freelance` → 404 (A1).
- [ ] La visibilidad sale de `politicas`, nunca del filtro que manda el front.

## Tests esperados
`tests/api/test_clientes.py`: `test_rf005_buscar_por_texto`, `test_rf031_filtrar_por_etiquetas`, `test_rf009_vista_personal`, `test_rf151_freelance_no_ve_ajeno_404`.

## Contexto (leer solo esto)
- [[CU-03 Gestionar ficha del cliente]] — pasos 1–2 y A1
- Contrato: `src/packages/shared/openapi.json` (módulo `clientes`) y [[Contrato de la API (OpenAPI)]] §Convenciones
- [[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]]

## Archivos probables
- `src/backend/rumbo/negocio/servicios/clientes.py`
- `src/backend/rumbo/datos/repositorios/clientes.py`

## Fuera de alcance
- Historial (ticket propio).

## Notas de implementación
