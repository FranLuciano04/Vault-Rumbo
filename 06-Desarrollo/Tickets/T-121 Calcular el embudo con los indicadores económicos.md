---
id: T-121
titulo: Calcular el embudo con los indicadores económicos
modulo: M8 — Calendario, dashboard y reportes
capa: backend
estado: hecho
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
- [x] Embudo por estado de oportunidad con conversión (RF-123).
- [x] Ventas, ganancia, margen, comisiones, cobrado y por cobrar en `Decimal` (RF-124).
- [x] Filtros de período y responsable; `empleado` y `freelance` ven solo lo suyo (A1, RF-129); período sin datos → ceros (A2).

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
- `GET /api/dashboard` calcula en vivo:
  - el embudo, con conversión = ganadas / cerradas;
  - ventas, ganancia, margen ponderado (4 decimales), comisiones, cobrado y pendiente de cobrar, todo por moneda (DEC-0007).
- Cuatro consultas fijas en `datos/repositorios/dashboard.py`, con visibilidad. Para empleado y freelance se fuerza `responsable_id` al propio (RF-129).
- Se agregaron `margen` y `comisiones` al esquema `Dashboard` de T-119 (los pide RF-124).
- `calculos.comision_del_vendedor` es nueva: no había cálculo de la comisión como importe.
- **Reglas supuestas (para ratificar con el equipo):**
  - Oportunidades y ventas entran por `created_at`; los cobros, por `fecha_cobro`.
  - Venta = viaje no cancelado.
  - Sin fechas, el período es el mes en curso.
- **Decididas por Francisco el 30/10/26 (propuesta, falta ratificación del equipo):**
  - El pendiente de cobrar es la foto del momento: todos los pagos pendientes o vencidos, sin importar cuándo se vendió el viaje.
  - La comisión porcentual con ganancia ≤ 0 es 0.
- Review de Opus: 0 bloqueantes, 3 importantes y 4 menores.
  - Importantes: el pendiente de cobrar y la comisión negativa se arreglaron con esas decisiones. Los indicadores de RF-124 que nadie tenía quedan anotados en T-122.
  - Menores arreglados: 422 con `desde > hasta`, test del borde del período en hora de Argentina y docstring.
- **Pendientes menores:**
  - Índices en `pago.viaje_id` y `viaje.created_at` (para T-122 o T-123).
  - El freelance ve en el dashboard solo los viajes en los que es responsable, no los de sus clientes llevados por otro. Es seguro, pero hay que confirmarlo contra RF-129.
- El fix `6d3a28f` ajustó `test_contrato_m8.py`, con autorización, para que el dashboard deje de esperar 501.
- Modelos: tests sonnet, implementación sonnet, review opus, sin escalado.
