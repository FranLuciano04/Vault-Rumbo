---
id: T-010
titulo: Verificar el token de Firebase para resolver el usuario actual
modulo: M0 — Fundaciones
capa: backend
estado: libre
depende_de: [T-008, T-009]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-24, RF-140, RF-142, RNF-01, RNF-03, DEC-0016]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-010 Verificar el token de Firebase para resolver el usuario actual

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada pedido autenticado trae el ID token de Firebase; la API lo verifica con `firebase-admin` (o con el emulador) y carga al `Usuario` por `firebase_uid`. Los tests usan un verificador falso con un usuario por rol.

## Criterios de aceptación
- [ ] Sin token, con token inválido o vencido → 401 problem+json.
- [ ] Token válido de un uid que no existe en Rumbo o de un usuario inactivo → 401 (una baja corta el acceso en el pedido siguiente).
- [ ] Token válido de un usuario activo → la dependencia `usuario_actual` devuelve el `Usuario` y lo deja disponible para la auditoría (contextvar).

## Tests esperados
`tests/api/test_seguridad.py`: `test_rf140_token_valido_resuelve_usuario`, `test_rf142_token_invalido_401`, `test_rf142_usuario_inactivo_401`, `test_rf142_uid_desconocido_401`. El `conftest` expone un cliente autenticado por rol (`admin`, `dueno`, `empleado`, `freelance`).

## Contexto (leer solo esto)
- [[DEC-0016 Autenticación con Firebase|DEC-0016]]
- [[CU-24 Iniciar sesión]] — paso 2 y A1
- [[ARQ — Vista general]] — `core/seguridad.py` y `presentacion/dependencias.py`
- [[Spec de implementación]] §6 (Autenticación)

## Archivos probables
- `src/backend/rumbo/core/seguridad.py`
- `src/backend/rumbo/presentacion/dependencias.py`
- `src/backend/tests/conftest.py`

## Fuera de alcance
- Crear cuentas en Firebase (lo agrega la CLI y CU-25).
- Roles en custom claims (descartado en DEC-0016).

## Notas de implementación
- **Del plan:** El verificador real respeta `FIREBASE_AUTH_EMULATOR_HOST`. Nunca se usa el proyecto real en tests ni en el CI.
