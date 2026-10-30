---
id: T-121
titulo: Calcular el embudo con los indicadores económicos
modulo: M8 — Calendario, dashboard y reportes
capa: backend
estado: tomado
depende_de: [T-119, T-012, T-090]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-21, RF-123, RF-124, RF-127, RF-129, RF-130]
origen: plan
asignado: FranLucianoo
tomado_el: 30/10/26 15:43
rama: feature/T-121-calcular-el-embudo-con-los-indicadores-e
pr:
---
# T-121 Calcular el embudo con los indicadores económicos

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El dashboard calcula en vivo el embudo de ventas y los indicadores económicos y de cobranza del período, acotados al rol.

## Criterios de aceptación
- [ ] Embudo por estado de oportunidad con conversión (RF-123).
- [ ] Ventas, ganancia, margen, comisiones, cobrado y por cobrar en `Decimal` (RF-124).
- [ ] Filtros de período y responsable; `empleado` y `freelance` ven solo lo suyo (A1, RF-129); período sin datos → ceros (A2).

## Tests esperados
`tests/api/test_dashboard.py`: `test_rf123_embudo`, `test_rf124_indicadores_economicos`, `test_rf127_filtros`, `test_rf129_acotado_por_rol`, `test_periodo_sin_datos`.

## Contexto (leer solo esto)
- [[CU-21 Ver dashboard y embudo]]
- [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]]
- Contrato: `src/packages/shared/openapi.json` (módulo `dashboard`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/dashboard.py`
- `src/backend/rumbo/presentacion/routers/dashboard.py`

## Fuera de alcance
- Indicadores operativos (ticket propio).

## Notas de implementación
