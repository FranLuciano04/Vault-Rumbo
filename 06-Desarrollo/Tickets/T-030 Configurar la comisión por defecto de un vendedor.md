---
id: T-030
titulo: Configurar la comisión por defecto de un vendedor
modulo: M1 — Usuarios y configuración
capa: backend
estado: libre
depende_de: [T-026, T-012, T-011]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-13, RF-083, RF-084, RF-085, RN-01, DEC-0004, DEC-0007]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-030 Configurar la comisión por defecto de un vendedor

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña fijan la comisión por defecto de cada vendedor, como importe o como porcentaje sobre la ganancia, y el cambio solo afecta a los viajes nuevos.

## Criterios de aceptación
- [ ] `PUT /usuarios/{id}/comision-por-defecto` guarda tipo y valor como `Decimal`.
- [ ] Porcentaje fuera de 0–100, importe negativo o tipo sin valor → 422 (A1).
- [ ] Cambiar la comisión no modifica la comisión guardada en viajes existentes (RF-085).

## Tests esperados
`tests/api/test_comision.py`: `test_rf083_define_porcentaje`, `test_rf084_valor_invalido_422`, `test_rf085_no_cambia_viajes_existentes` (con una fábrica de viaje).

## Contexto (leer solo esto)
- [[CU-13 Configurar porcentaje de comisión]]
- [[RN-01 Comisión automática]]
- [[DEC-0004 Comisión configurable por porcentaje|DEC-0004]]
- [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]]
- Contrato: `src/packages/shared/openapi.json` (módulo `configuracion`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/configuracion.py`
- `src/backend/rumbo/presentacion/routers/configuracion.py`

## Fuera de alcance
- Aplicar la comisión a un viaje (economía, M6).

## Notas de implementación
