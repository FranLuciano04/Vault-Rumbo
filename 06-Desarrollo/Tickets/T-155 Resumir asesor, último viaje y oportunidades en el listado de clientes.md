---
id: T-155
titulo: Resumir asesor, último viaje y oportunidades en el listado de clientes
modulo: M2 — Clientes
capa: backend
estado: tomado
depende_de: [T-041]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-03, RF-005, RF-006, RF-151]
origen: hallazgo T-044 (decidido el 23/10/26)
asignado: FranLucianoo
tomado_el: 23/10/26 18:40
rama: feature/T-155-resumir-asesor-ultimo-viaje-y-oportunida
pr:
---
# T-155 Resumir asesor, último viaje y oportunidades en el listado de clientes

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada fila del listado de clientes trae los datos que muestra el prototipo (pantallas 8 y 39): el asesor con su nombre, el último viaje y la cantidad de oportunidades abiertas. Así la web deja de mostrar «—» en esas columnas.

## Criterios de aceptación
- [ ] `GET /clientes` devuelve en cada ítem `asesor` (`{id, nombre}` o `null`), `ultimo_viaje` (`{fecha_salida, destino}` del viaje más reciente no cancelado, o `null`) y `oportunidades_abiertas` (cantidad en `nueva`, `en_gestion` o `cotizada`). Contrato, tipos y mocks regenerados.
- [ ] Los datos respetan la visibilidad del actor: el `freelance` no ve viajes ni oportunidades ajenas, aunque sean del mismo cliente.
- [ ] Sin consultas N+1: el listado resuelve el resumen en una cantidad fija de consultas por página.

## Tests esperados
`tests/api/test_clientes.py`: `test_rf005_listado_trae_asesor_ultimo_viaje_y_oportunidades`, `test_rf005_cliente_sin_viajes_ni_oportunidades`, `test_rf005_ultimo_viaje_ignora_cancelados`, `test_rf151_freelance_no_cuenta_lo_ajeno`, y un test de cantidad de consultas.

## Contexto (leer solo esto)
- [[CU-03 Gestionar ficha del cliente]] — paso 1
- [[Prototipo UI]] — pantallas 8 y 39
- Contrato: `src/packages/shared/openapi.json` (módulo `clientes`)

## Archivos probables
- `src/backend/rumbo/datos/repositorios/clientes.py`
- `src/backend/rumbo/presentacion/esquemas/clientes.py`
- `src/packages/shared/` (OpenAPI, tipos y mocks)

## Fuera de alcance
- Mostrar las columnas en la web (T-157).

## Notas de implementación