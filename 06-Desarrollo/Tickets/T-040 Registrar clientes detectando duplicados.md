---
id: T-040
titulo: Registrar clientes detectando duplicados
modulo: M2 — Clientes
capa: backend
estado: tomado
depende_de: [T-039, T-012, T-011]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-02, RF-001, RF-002, RF-003, RF-150]
origen: plan
asignado: palomap2003
tomado_el: 22/10/26 16:27
rama: feature/T-040-registrar-clientes-detectando-duplicados
pr:
---
# T-040 Registrar clientes detectando duplicados

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cualquier rol registra un cliente con sus datos mínimos; si parece repetido, el sistema lo avisa y pide confirmación; si lo crea un `freelance`, queda asignado a él.

## Criterios de aceptación
- [ ] Faltan datos mínimos (nombre, contacto, segmento) → 422 (A3).
- [ ] Posible duplicado por contacto o nombre → respuesta con los candidatos y sin alta, salvo confirmación explícita (A1).
- [ ] El cliente creado por un `freelance` queda con `asesor_asignado_id` = ese freelance (RF-150).

## Tests esperados
`tests/api/test_clientes.py`: `test_rf001_registrar_cliente`, `test_rf002_datos_minimos_422`, `test_rf003_posible_duplicado_pide_confirmacion`, `test_rf150_freelance_queda_asignado`.

## Contexto (leer solo esto)
- [[CU-02 Registrar cliente]] — flujo principal, A1 y A3
- [[Cliente]]
- Contrato: `src/packages/shared/openapi.json` (módulo `clientes`) y [[Contrato de la API (OpenAPI)]] §Convenciones
- [[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]]

## Archivos probables
- `src/backend/rumbo/negocio/servicios/clientes.py`
- `src/backend/rumbo/datos/repositorios/clientes.py`
- `src/backend/rumbo/presentacion/routers/clientes.py`

## Fuera de alcance
- Alta rápida desde una consulta (CU-04, M4).

## Notas de implementación
