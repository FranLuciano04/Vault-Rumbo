---
id: T-029
titulo: Editar los parámetros del negocio
modulo: M1 — Usuarios y configuración
capa: backend
estado: hecho
depende_de: [T-026, T-012, T-011]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0013, CU-06, CU-07, CU-30]
origen: plan
asignado: FranLucianoo
tomado_el: 22/10/26 17:43
rama: feature/T-029-editar-los-parametros-del-negocio
pr:
---
# T-029 Editar los parámetros del negocio

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña ven y editan los parámetros de la agencia (vigencia de la cotización, anticipación de la alerta de salida y meses para el recontacto) que usan otros módulos.

## Criterios de aceptación
- [ ] `GET` y `PUT /configuracion` solo para `admin` y `dueno`.
- [ ] Valores fuera de rango (vigencia < 1, anticipación < 0, recontacto < 1) → 422.
- [ ] Un servicio `parametros.obtener()` queda disponible para los demás módulos.

## Tests esperados
`tests/api/test_configuracion.py`: lectura, edición con auditoría, 422 por rango, 403 por rol.

## Contexto (leer solo esto)
- [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] — tabla `configuracion`
- Contrato: `src/packages/shared/openapi.json` (módulo `configuracion`) y [[Contrato de la API (OpenAPI)]] §Convenciones
- [[Prototipo UI]] — pantallas 30 (PNG en `07-Entregables/Prototipo/img/`)

## Archivos probables
- `src/backend/rumbo/negocio/servicios/configuracion.py`
- `src/backend/rumbo/presentacion/routers/configuracion.py`

## Fuera de alcance
- Comisión por defecto (ticket propio).

## Notas de implementación
- **Implementación (22/10/26, Francisco):**
  - `negocio/servicios/parametros.py` tiene tres funciones:
    - `obtener(sesion)` es de uso interno, sin rol, y la usan los demás módulos;
    - `ver(sesion, actor)` exige admin o dueño y la usa `GET /configuracion`;
    - `editar(sesion, actor, …)` exige admin o dueño y la usa `PUT /configuracion`.
  - Las tres pasan por `RepositorioConfiguracion`, que lee la fila única `id=1` sembrada por la migración 0001. Si falta, lanza `NoEncontrado`.
  - El 422 por rango sale del esquema `ConfiguracionEditar` y lo respaldan los CHECK de la tabla.
  - `test_contrato_m1.py` suma `GET` y `PUT /api/configuracion` a `IMPLEMENTADAS`, según la convención autorizada en T-030.
- **Desvío del flujo:** se salteó el paso de refactor porque el diff era chico. La review revisó la duplicación con el servicio de T-030 y recomendó **no** unificarlos: son entidades distintas.
- **Review (Opus):** 0 bloqueantes, 2 importantes y 3 menores, todos arreglados:
  - repositorio en lugar de leer la sesión directo;
  - `ver()` con rol para el `GET`, con el docstring de `politicas.py` alineado;
  - error claro si falta la fila;
  - el caso de `recontacto_meses` faltante;
  - `ruff format` de los tests del rojo, que habrían roto el CI.
- **Verificación:** 598 tests en verde; ruff check, ruff format --check y mypy limpios.
- **Modelos:** tests, verde y fix con Sonnet; review con Opus. No hubo escalados.
