---
id: T-029
titulo: Editar los parámetros del negocio
modulo: M1 — Usuarios y configuración
capa: backend
estado: libre
depende_de: [T-026, T-012, T-011]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0013, CU-06, CU-07, CU-30]
origen: plan
asignado:
tomado_el:
rama:
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
