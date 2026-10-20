---
id: T-016
titulo: Devolver el usuario de la sesión con su rol
modulo: M0 — Fundaciones
capa: backend
estado: tomado
depende_de: [T-015, T-010]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-24, RF-141, DEC-0005, DEC-0013]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 20/10/26 18:48
rama: feature/T-016-devolver-el-usuario-de-la-sesion-con-su
pr:
---
# T-016 Devolver el usuario de la sesión con su rol

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
`GET /api/auth/yo` devuelve al usuario autenticado con su rol y sus accesos (por ejemplo, redes), para que web y mobile armen el contexto de trabajo.

## Criterios de aceptación
- [ ] Responde 200 con los datos del esquema del contrato para cada rol.
- [ ] `acceso_redes` sale verdadero siempre para `admin` y `dueno` (por rol) y según la columna para los demás.
- [ ] Un usuario inactivo recibe 401.

## Tests esperados
`tests/api/test_seguridad.py`: `test_rf141_yo_devuelve_rol_y_accesos` por rol, `test_rf141_admin_tiene_acceso_a_redes`, `test_rf142_inactivo_401`.

## Contexto (leer solo esto)
- [[CU-24 Iniciar sesión]] — paso 3
- [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] — acceso a redes
- Contrato: `src/packages/shared/openapi.json` (módulo `seguridad`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/presentacion/routers/seguridad.py`
- `src/backend/rumbo/negocio/servicios/seguridad.py`

## Fuera de alcance
- Gestión de usuarios (M1).

## Notas de implementación
