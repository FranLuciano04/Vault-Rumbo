---
id: T-145
titulo: Responder un error controlado si falta el proyecto de Firebase
modulo: M0 — Fundaciones
capa: backend
estado: hecho
depende_de: [T-010]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-24, RF-142, DEC-0016]
origen: hallazgo T-016
asignado: Nahuel Viniegra
tomado_el: 21/10/26 17:38
rama: feature/T-145-responder-un-error-controlado-si-falta-e
pr:
---
# T-145 Responder un error controlado si falta el proyecto de Firebase

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cuando el backend corre sin `FIREBASE_PROJECT_ID` (ni credenciales que lo definan), un pedido autenticado recibe hoy un 500 sin formato. El motivo es que `auth.verify_id_token` lanza `ValueError` y `VerificadorFirebase.verificar` no lo captura. Al terminar, ese caso responde con un error controlado en `problem+json`, sin detalle interno, y queda un log que dice qué falta configurar. El resto de la API sigue arrancando igual, como fija DEC-0016.

**Propuesta, a confirmar al tomarlo:** mapearlo a `ServicioExterno` (502), igual que `CertificateFetchError`, con un `logger.error` que nombre `FIREBASE_PROJECT_ID`. Si el equipo prefiere otro código, se decide antes del rojo.

## Criterios de aceptación
- [ ] Sin proyecto de Firebase configurado, un pedido con token a una ruta autenticada responde el error acordado en `problem+json`, sin el mensaje del `ValueError`.
- [ ] Se registra un log de error que menciona la variable que falta.
- [ ] Un token inválido, con el proyecto configurado, sigue dando 401.

## Tests esperados
- En `tests/test_seguridad.py`: `VerificadorFirebase.verificar` con un `verify_id_token` que lanza `ValueError` → lanza `ServicioExterno` (o el error acordado) y loguea.
- En `tests/api`: `test_rf142_sin_proyecto_firebase_error_controlado`, que comprueba el código y el `problem+json` sin detalle interno.

## Contexto (leer solo esto)
- [[DEC-0016 Autenticación con Firebase|DEC-0016]]
- `src/backend/rumbo/core/seguridad.py` (`VerificadorFirebase`, `_app_firebase`) y `src/backend/rumbo/core/config.py` (comentario de `firebase_project_id`)
- `src/backend/rumbo/presentacion/errores.py` (mapeo de `ServicioExterno` a 502)

## Archivos probables
- `src/backend/rumbo/core/seguridad.py`
- `src/backend/rumbo/core/config.py` (actualizar el comentario que hoy dice «falla (500)»)

## Fuera de alcance
- Impedir que el backend arranque sin la variable: DEC-0016 pide que arranque igual.
- Las otras rutas que usan Firebase fuera del pedido HTTP, como `crear_cuenta` en la CLI, que ya valida la variable.

## Notas de implementación
- Nahuel confirmó el código antes del rojo: 502 `ServicioExterno`, igual que con `CertificateFetchError`.
- `VerificadorFirebase.verificar` captura `ValueError` en el último `except`, así que `InvalidIdTokenError` sigue dando 401. Registra un `logger.error` que nombra `FIREBASE_PROJECT_ID`, sin traza, porque algunos `ValueError` del Admin SDK interpolan el token. Se actualizó el comentario de `core/config.py`.
- La review de seguridad (Sonnet) dio aprobable y verificó contra firebase-admin que ningún caso que debe dar 401 termina en 502: `HTTPBearer` frena antes el `Bearer` vacío. Dejó 3 menores:
  - Se arregló sacar `exc_info` del log (fix).
  - Quedan como pendientes:
    - Un log de error por cada pedido mientras falte la variable.
    - Un test que fije que `Bearer ` vacío da 401.
    - Un test que verifique que el token no aparece en el log.
- Fuera de alcance: con `projectId` configurado pero sin credenciales, `DefaultCredentialsError` daría 500.
- Modelos: tests sonnet, implementación y fix opus, refactor opus (sin cambios) y review sonnet. No hubo escalados.
- Checks: ruff y mypy no dan avisos, pasan los 266 tests y la cobertura es del 97 % en todo el backend, del 95,65 % en negocio y del 100 % en `core/seguridad.py`.
