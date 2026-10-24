---
id: T-043
titulo: Mostrar el historial del cliente
modulo: M2 — Clientes
capa: backend
estado: hecho
depende_de: [T-041]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-03, RF-006]
origen: plan
asignado: palomap2003
tomado_el: 24/10/26 11:36
rama: feature/T-043-mostrar-el-historial-del-cliente
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
- **Orden (confirmado por Paloma, 24/10/26):** oportunidades por fecha de alta (`created_at`), viajes por `fecha_salida` y reseñas por `fecha`, siempre de la más reciente a la más antigua y con desempate por `id`. `Oportunidad` no tiene una fecha de negocio propia.
- **Reseñas ocultas (confirmado por Paloma):** en el historial se aplica la misma visibilidad que en el catálogo (CU-29). Las reseñas `oculta` las ven solo `admin` y `dueno`. Lo fija `test_rf151_historial_oculta_resenas_ocultas_salvo_jefes`, que sumó la review.
- La visibilidad del cliente reusa la de `GET /clientes/{id}`: un cliente ajeno o inexistente da 404. En `test_contrato_m2.py`, la ruta pasó a `IMPLEMENTADAS`.
- **Menores que no se arreglaron:** el helper `traer` del repositorio lleva un `# type: ignore[attr-defined]` porque `Oportunidad`, `Viaje` y `Resena` no comparten una base tipada con `cliente_id`. Las listas no tienen tope ni paginación, que alcanza para el volumen de una PyME.
- **Modelos:** tests, implementación, refactor (sin cambios) y fix con Sonnet; review con Opus. No hubo escalados.
