---
id: T-042
titulo: Editar la ficha del cliente
modulo: M2 — Clientes
capa: backend
estado: libre
depende_de: [T-040, T-041, T-149]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-03, CU-30, RF-002, RF-007, RF-008]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-042 Editar la ficha del cliente

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Quien puede ver a un cliente edita su ficha (contacto, segmento, etiquetas, preferencias y la marca de no recontactar), con las mismas validaciones del alta; los clientes nunca se borran.

## Criterios de aceptación
- [ ] `PATCH /clientes/{id}` valida como el alta → 422 si queda inválido (A2).
- [ ] El `freelance` solo edita sus clientes (ajeno → 404); `no_recontactar` y `etiquetas` son editables.
- [ ] No existe borrado de clientes (RF-008).

## Tests esperados
`tests/api/test_clientes.py`: `test_rf007_editar_ficha`, `test_rf002_edicion_invalida_422`, `test_rf008_no_hay_borrado`.

## Contexto (leer solo esto)
- [[CU-03 Gestionar ficha del cliente]] — A2 y A3
- Contrato: `src/packages/shared/openapi.json` (módulo `clientes`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/clientes.py`
- `src/backend/rumbo/presentacion/routers/clientes.py`

## Fuera de alcance
- El opt-out desde la sugerencia de recontacto (M7).

## Notas de implementación
- **Sumado el 22/10/26 (DEC-0017):** incluir el usuario de Instagram del cliente como campo **opcional**. No cuenta como contacto mínimo. El contrato lo expone desde T-149.
