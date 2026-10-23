---
id: T-159
titulo: Rechazar los tokens revocados o de cuentas deshabilitadas en Firebase
modulo: M0 — Fundaciones
capa: backend
estado: libre
depende_de: []
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-24, RF-142, DEC-0016]
origen: review-codex M0
asignado:
tomado_el:
rama:
pr:
---
# T-159 Rechazar los tokens revocados o de cuentas deshabilitadas en Firebase

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La API rechaza con 401 problem+json un ID token cuyas sesiones se revocaron en Firebase, o cuya cuenta está deshabilitada en Firebase, aunque el token no haya vencido y el `Usuario` siga activo. Hoy `VerificadorFirebase.verificar` llama a `auth.verify_id_token` sin `check_revoked=True`, en contra del criterio de aceptación de [[T-010 Verificar el token de Firebase para resolver el usuario actual|T-010]] (hallazgo H-02 de [[M0 — review Codex]]).

## Criterios de aceptación
- [ ] `VerificadorFirebase` pide la verificación con `check_revoked=True`, y un test lo comprueba sobre los argumentos de la llamada, no solo sobre la excepción.
- [ ] `RevokedIdTokenError` y `UserDisabledError` terminan en `TokenInvalido` (401 problem+json), nunca en 500.
- [ ] Una falla de red de Firebase durante la comprobación de revocación sigue dando `ServicioExterno` (502), sin filtrar el token en los logs.

## Tests esperados
- `test_rf142_verificador_pide_check_revoked`: un doble de `auth.verify_id_token` registra `check_revoked=True`.
- `test_rf142_cuenta_deshabilitada_da_token_invalido`: `UserDisabledError` → `TokenInvalido`.
- `test_rf142_token_revocado_da_401` a nivel API (`GET /api/auth/yo`), con el verificador real y el SDK mockeado.
- Si el emulador del CI lo permite: revocar las sesiones con `auth.revoke_refresh_tokens` y comprobar que el token anterior recibe 401.

## Contexto (leer solo esto)
- [[M0 — review Codex]] — H-02 y su triage
- [[T-010 Verificar el token de Firebase para resolver el usuario actual]] — criterios y la nota «Sin `check_revoked`»
- [[CU-24 Iniciar sesión]], RF-142 en `02-Analisis/Requisitos funcionales.md`
- `src/backend/rumbo/core/seguridad.py` — `VerificadorFirebase`
- `src/backend/tests/test_seguridad.py`

## Archivos probables
- `src/backend/rumbo/core/seguridad.py`
- `src/backend/tests/test_seguridad.py`, `src/backend/tests/api/test_seguridad.py`

## Fuera de alcance
- Cachear el resultado de la revocación. Si hace falta por rendimiento, va en otro ticket.
- La baja de usuarios en Rumbo (`Usuario.activo`), que ya corta el acceso.

## Decisión abierta
`check_revoked=True` suma una consulta a Firebase por cada pedido autenticado. Si el equipo prefiere aceptar la ventana de hasta 1 h para no sumar latencia, este ticket se reemplaza por una `DEC-` que formalice la excepción, más el ajuste del criterio de T-010 y del test que hoy simula la revocación. **Confirmar con el equipo antes de tomarlo.** #accion/decidir

## Notas de implementación
<Las completa el orquestador al cerrar.>
