---
id: T-155
titulo: Resumir asesor, último viaje y oportunidades en el listado de clientes
modulo: M2 — Clientes
capa: backend
estado: hecho
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
- [ ] Los datos respetan la visibilidad del actor (`politicas.visibilidad`): el `freelance` ve el resumen completo de sus clientes, incluidos los viajes y oportunidades de los que es responsable otro usuario (decidido por Francisco el 23/10/26, igual que en T-012).
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

## Notas de implementación- **Cierre (23/10/26):**
  - `GET /clientes` devuelve `Pagina[ClienteListado]`. `ClienteListado(Cliente)` suma `asesor`, `ultimo_viaje` y `oportunidades_abiertas`. Decisión de Francisco: `Cliente` no cambia, así que la ficha, el alta y el 409 no traen el resumen. Para eso se autorizó cambiar una línea de `test_contrato_m2.py`.
  - `RepositorioClientes.resumir` usa 3 consultas por página: asesores, último viaje con `DISTINCT ON` y oportunidades abiertas. Aplica `visibilidad` a `Viaje` y `Oportunidad`, aunque hoy no cambie el resultado.
  - **Visibilidad (Francisco, 23/10/26):** se sigue a `politicas`. El freelance ve el resumen completo de sus clientes, aunque el responsable sea otro. Se ajustó el criterio de aceptación.
  - **Último viaje (Francisco, 23/10/26):** es el último no cancelado que **ya salió** (`fecha_salida <= hoy` en hora de Argentina), porque en CU-30 es contexto de recontacto. Se agregó el helper `rumbo/core/fechas.hoy()` y se declaró `tzdata`, porque la imagen `python:3.13-slim` puede no traer la base de zonas horarias.
  - **Tests:** están en `tests/api/test_clientes_resumen.py` y no en `test_clientes.py`. Los de RF-151 se renombraron por la decisión de visibilidad. Con autorización se hicieron dos cosas: partir 5 líneas largas y pasar a fechas relativas a hoy; y en shared, que los tests del mock comparen la ficha con `aFicha(...)`.
  - **Review (Opus):** no hubo bloqueantes ni importantes. De los 3 menores, el mock de la ficha y de duplicados y el docstring de visibilidad se arreglaron; el de los nombres de tests queda anotado acá.
  - **Modelos:** Sonnet en los tests, el verde, el refactor y los fixes; Opus en la review. No hubo escalados.
  - **Checks:** el backend da 837 tests en verde, con cobertura del 97 % en total y del 99 % en negocio. Ruff y mypy pasan limpios. Shared da 107 tests y web 168, con 92,5 %.
