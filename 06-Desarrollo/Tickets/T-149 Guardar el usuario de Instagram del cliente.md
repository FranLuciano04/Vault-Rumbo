---
id: T-149
titulo: Guardar el usuario de Instagram del cliente
modulo: M2 — Clientes
capa: backend
estado: libre
depende_de: [T-040]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-02, CU-03, RF-001, DEC-0017]
origen: plan (DEC-0017, 22/10/26)
asignado:
tomado_el:
rama:
pr:
---
# T-149 Guardar el usuario de Instagram del cliente

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La ficha del [[Cliente]] guarda, de forma opcional, su usuario de Instagram ([[DEC-0017 Contacto mínimo del cliente|DEC-0017]]). Es un dato extra: el contacto mínimo sigue siendo teléfono/WhatsApp o email.

## Criterios de aceptación
- [ ] Columna `cliente.instagram` (`varchar`, nullable) con su migración de Alembic. El modelo `Cliente` y el contrato la exponen: `Cliente`, `ClienteCrear` y `ClienteEditar`, opcional y anulable. Se regeneran `openapi.json`, los tipos, el esquema zod del alta y los mocks de clientes.
- [ ] Un alta solo con Instagram y sin teléfono ni email → 422 (CU-02 A3): Instagram no cuenta como contacto mínimo.
- [ ] El valor se normaliza sin `@` ni espacios y respeta el largo máximo; un formato inválido → 422.

## Tests esperados
`tests/api/test_clientes.py`: `test_rf001_alta_con_instagram_opcional`, `test_rf002_instagram_no_cuenta_como_contacto_minimo`, `test_rf001_instagram_se_normaliza`; en shared, el esquema zod acepta y normaliza el campo.

## Contexto (leer solo esto)
- [[DEC-0017 Contacto mínimo del cliente]]
- [[CU-02 Registrar cliente]] — paso 2 y A3
- [[Cliente]] — atributo `instagram`
- [[DGM-ER]] — `CLIENTE.instagram`

## Archivos probables
- `src/backend/rumbo/datos/modelos/comercial.py` y `src/backend/alembic/`
- `src/backend/rumbo/presentacion/esquemas/clientes.py`
- `src/packages/shared/` (OpenAPI, tipos, esquema zod y mocks)

## Fuera de alcance
- Los formularios de web y mobile: los suman T-045, T-046 y T-048.
- Buscar clientes por Instagram.

## Notas de implementación