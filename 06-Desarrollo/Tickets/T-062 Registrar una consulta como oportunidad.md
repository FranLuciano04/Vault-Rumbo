---
id: T-062
titulo: Registrar una consulta como oportunidad
modulo: M4 — Oportunidades y cotizaciones
capa: backend
estado: libre
depende_de: [T-061, T-040]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-04, RF-004, RF-010, RF-011, RF-012, RF-013, DEC-0002]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-062 Registrar una consulta como oportunidad

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se registra una consulta como oportunidad `nueva` de un cliente existente o de uno nuevo dado de alta en el mismo paso, con aviso si el cliente ya tiene una oportunidad abierta.

## Criterios de aceptación
- [ ] `POST /oportunidades` con cliente existente o alta rápida (A1, RF-004) en una sola transacción (RNF-05).
- [ ] Oportunidad abierta del mismo cliente → aviso con la existente y sin alta, salvo confirmación (A2).
- [ ] Datos mínimos faltantes (canal, cliente, interés) → 422 (A3).

## Tests esperados
`tests/api/test_oportunidades.py`: `test_rf010_registrar_consulta`, `test_rf004_alta_rapida_de_cliente`, `test_rf012_oportunidad_abierta_avisa`, `test_rf013_datos_minimos_422`.

## Contexto (leer solo esto)
- [[CU-04 Registrar consulta]]
- [[DEC-0002 Modelar la consulta como Oportunidad|DEC-0002]]
- Contrato: `src/packages/shared/openapi.json` (módulo `oportunidades`) y [[Contrato de la API (OpenAPI)]] §Convenciones
- [[Oportunidad]]

## Archivos probables
- `src/backend/rumbo/negocio/servicios/oportunidades.py`
- `src/backend/rumbo/datos/repositorios/oportunidades.py`
- `src/backend/rumbo/presentacion/routers/oportunidades.py`

## Fuera de alcance
- Consulta derivada del recontacto (M7).

## Notas de implementación
