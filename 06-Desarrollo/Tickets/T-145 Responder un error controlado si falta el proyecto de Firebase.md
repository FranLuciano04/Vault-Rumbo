---
id: T-145
titulo: Responder un error controlado si falta el proyecto de Firebase
modulo: M0 — Fundaciones
capa: backend
estado: libre
depende_de: [T-010]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-24, RF-142, DEC-0016]
origen: hallazgo T-016
asignado:
tomado_el:
rama:
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
