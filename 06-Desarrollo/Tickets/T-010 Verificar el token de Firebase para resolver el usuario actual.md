---
id: T-010
titulo: Verificar el token de Firebase para resolver el usuario actual
modulo: M0 — Fundaciones
capa: backend
estado: hecho
depende_de: [T-008, T-009]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-24, RF-140, RF-142, RNF-01, RNF-03, DEC-0016]
origen: plan
asignado: FranLucianoo
tomado_el: 18/10/26 21:19
rama: feature/T-010-verificar-el-token-de-firebase-para-reso
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
- **Implementación:**
  - `core/seguridad.py` tiene `VerificadorFirebase`, que llama a `auth.verify_id_token` de firebase-admin 7.7.0 dentro de `asyncio.to_thread`. Crea la app de Firebase recién cuando se necesita y queda cacheado.
  - `presentacion/dependencias.py` tiene `usuario_actual` (async). Busca al usuario a través del servicio `negocio/servicios/seguridad.py` y del repositorio `datos/repositorios/seguridad.py`. Responde 401 problem+json si el token es inválido, vencido o revocado, si el uid no existe o si el usuario está inactivo.
  - Una falla de certificados da 502 genérico y cualquier otro error da 500 genérico. El cliente nunca ve un mensaje de Firebase.
  - La contextvar `usuario_auditoria` se carga solo cuando el pedido se acepta. Se limpia al final de cada pedido con una subdependencia con `yield`: `usuario_actual` no puede llevar `yield` porque depende de `SesionDep`, que tiene otro alcance.
- **Candado del emulador** (bloqueante de la review, cerrado):
  - Variable nueva `ENTORNO` (`desarrollo` | `produccion`). Si no se define, vale `produccion`; lo aprobó Francisco.
  - Si hay emulador configurado fuera de `desarrollo`, el backend no arranca. Cuenta tanto si viene del `.env` como del entorno del proceso, y tiene prioridad la variable del proceso.
  - En `.env.example`, `FIREBASE_AUTH_EMULATOR_HOST` y `ENTORNO` quedan comentadas.
  - `conftest.py` apaga el emulador para que la suite no dependa del `.env` de cada uno.
- **Sin `check_revoked`:** costaría una llamada a Firebase por pedido. La baja se hace con `Usuario.activo`, que se consulta en cada pedido. Un usuario deshabilitado solo en Firebase sigue entrando hasta que vence su token (1 h).
- **Tests agregados con autorización de Francisco:**
  - `tests/test_seguridad.py`: el candado y el verificador real.
  - El 502 en `tests/api/test_seguridad.py`.
  - Se reescribió el test vacuo de la contextvar.
- **Menor pendiente:** `test_rf140_app_firebase_es_idempotente` asume que firebase-admin carga las credenciales recién cuando las usa. Revisarlo cuando se actualice la librería.
- **Para T-005:** documentar `FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `FIREBASE_AUTH_EMULATOR_HOST` y `ENTORNO` (en el servidor, `produccion` o sin definir).
- **Review:** reviewer-seguridad (Sonnet), en dos rondas.
  - Primera ronda: 1 bloqueante, 2 importantes y 3 menores.
  - Segunda ronda: confirmó que el bloqueante quedó cerrado y dejó 2 menores (uno arreglado y el otro anotado arriba).
- **Modelos:** tests con Sonnet; implementación, refactor y fix con Opus; review con Sonnet. Sin escalados.
