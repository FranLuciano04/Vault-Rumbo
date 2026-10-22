---
id: T-149
titulo: Guardar el usuario de Instagram del cliente
modulo: M2 — Clientes
capa: backend
estado: hecho
depende_de: [T-040]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-02, CU-03, RF-001, DEC-0017]
origen: plan (DEC-0017, 22/10/26)
asignado: FranLucianoo
tomado_el: 22/10/26 18:50
rama: feature/T-149-guardar-el-usuario-de-instagram-del-clie
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
- **Implementación (22/10/26, Francisco):**
  - Columna `cliente.instagram` (`varchar(30)`, nullable) con la migración 0003, reversible.
  - Tipo reutilizable `Instagram` en `esquemas/clientes.py`: quita solo los espacios ASCII de los extremos y un `@` inicial, pasa a minúsculas, y lo que queda vacío o en «@» pasa a `null`. Después aplica la regex `^[a-z0-9._]{1,30}$`.
  - En la salida (`Cliente`) el campo es requerido y anulable, como `preferencias`. En `ClienteCrear` y `ClienteEditar` es opcional.
  - `registrar_cliente` lo guarda. Con `exclude_unset`, un PATCH sin `instagram` no lo borra: es lo que tiene que hacer T-042.
  - En shared, `normalizarInstagram` (exportada) aplica la misma regla en el zod del alta y en los mocks. `openapi.json` y `tipos.gen.ts` están regenerados.
- **Tests:**
  - Quedaron en archivos aparte para no tocar los de T-040: `tests/api/test_clientes_instagram.py` y `src/esquemas/clientes-instagram.test.ts`.
  - Con autorización de Francisco se sumó `instagram` a las columnas de `cliente` en `tests/test_modelos.py`. Las columnas posteriores a `rumbo.sql` vienen de migraciones nuevas, y el criterio vale para las próximas.
- **Review (Opus): aprobable.** 0 bloqueantes, 0 importantes y 4 menores. Tres se arreglaron en el fix:
  - el mismo conjunto de espacios en Pydantic y en zod, con el caso del BOM;
  - `instagram` requerido en la salida (el test del rojo se corrigió con autorización);
  - mocks normalizados.
  - El cuarto (tests en un archivo aparte) queda anotado acá.
- **Desvío del flujo:** se salteó el paso de refactor porque el diff era chico. La review no encontró simplificaciones que valieran la pena.
- **Verificación:**
  - backend: 668 tests, ruff y mypy limpios;
  - shared: 107 tests, lint y typecheck;
  - web: typecheck;
  - el contrato y los tipos coinciden con lo generado.
- **Para el equipo:** correr `uv run alembic upgrade head` (migración 0003).
- **Modelos:** tests, verde y fix con Sonnet; review con Opus. No hubo escalados.
