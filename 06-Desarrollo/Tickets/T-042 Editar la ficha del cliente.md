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
trazabilidad: [CU-03, CU-30, RF-002, RF-007, RF-008, CU-02, RF-003, CU-15]
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
- **Sumado el 24/10/26 (decisiones de Francisco, se absorben acá en vez de abrir subtickets):**
  - **Duplicados para el `freelance` (CU-02 A1, RF-003):** si el alta de un freelance coincide con un cliente que no ve, el 409 avisa que ya hay un cliente con ese contacto en la agencia, **sin candidatos ni ningún dato ajeno**. Con `confirmar_duplicado: true`, el alta sale igual. Hay que cambiar el test de T-040 que fija que no se le avisa nada.
  - **Requisito de destino de baja (CU-15 A3):** `editar_requisito` (`negocio/servicios/configuracion.py`) responde 404 si el requisito está de baja. Hoy da 200.
  - De T-157: `test_rf031_edicion_acepta_20_etiquetas_de_80_caracteres` tiene que esperar el éxito, y `ClienteEditar` tiene que recortar los espacios.
