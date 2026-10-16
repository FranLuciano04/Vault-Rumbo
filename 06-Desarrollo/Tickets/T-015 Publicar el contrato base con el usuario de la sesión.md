---
id: T-015
titulo: Publicar el contrato base con el usuario de la sesión
modulo: M0 — Fundaciones
capa: contrato
estado: tomado
depende_de: [T-009, T-014]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-24, RF-141, DEC-0016]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 16/10/26 12:54
rama: feature/T-015-publicar-el-contrato-base-con-el-usuario
pr:
---
# T-015 Publicar el contrato base con el usuario de la sesión

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El backend publica su primer contrato: los esquemas comunes (problema, página) y `GET /api/auth/yo` como stub `501`, con el comando `exportar-openapi`, los tipos generados y el mock MSW por rol que usan los shells.

## Criterios de aceptación
- [ ] `uv run python -m rumbo.presentacion.cli exportar-openapi ../packages/shared/openapi.json` exporta el contrato; `GET /api/auth/yo` figura con su esquema, seguridad Bearer y respuesta 401.
- [ ] El endpoint existe y responde `501` problem+json.
- [ ] Tipos regenerados y un hook `useYo` + mock MSW que devuelve un usuario de cada rol.

## Tests esperados
`tests/api/test_contrato_seguridad.py`: la ruta existe, exige token y responde 501. En shared, el mock devuelve la forma del esquema.

## Contexto (leer solo esto)
- [[CU-24 Iniciar sesión]] — paso 3
- [[DEC-0016 Autenticación con Firebase|DEC-0016]] — endpoints que quedan
- [[Contrato de la API (OpenAPI)]] — módulo `seguridad`
- `05-Diseño/API/openapi.json` (PC1, referencia)

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/comunes.py`
- `src/backend/rumbo/presentacion/esquemas/seguridad.py`
- `src/backend/rumbo/presentacion/routers/seguridad.py`
- `src/backend/rumbo/presentacion/cli.py`
- `src/packages/shared/`

## Fuera de alcance
- La lógica de `/auth/yo` (ticket de backend). `/auth/login` y `/auth/logout` ya no existen (DEC-0016).

## Notas de implementación
