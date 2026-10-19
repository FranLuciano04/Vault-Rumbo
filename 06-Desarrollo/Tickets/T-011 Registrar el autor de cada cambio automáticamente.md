---
id: T-011
titulo: Registrar el autor de cada cambio automáticamente
modulo: M0 — Fundaciones
capa: backend
estado: hecho
depende_de: [T-008, T-010]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [RF-152, RNF-04, DEC-0008]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 19/10/26 15:56
rama: feature/T-011-registrar-el-autor-de-cada-cambio-automa
pr:
---
# T-011 Registrar el autor de cada cambio automáticamente

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
`core.db` completa `created_by`, `updated_by`, `created_at` y `updated_at` en cada alta y modificación, con el usuario del pedido o vacío si lo hace el proceso automático, sin que los servicios lo hagan a mano.

## Criterios de aceptación
- [ ] Un alta completa `created_by`/`created_at` con el usuario actual; una modificación cambia `updated_by`/`updated_at` sin tocar los `created_*`.
- [ ] Sin usuario actual (proceso automático) los `*_by` quedan vacíos.
- [ ] `viaje_hotel` no lleva auditoría (la hereda de `viaje`).

## Tests esperados
`tests/negocio/test_auditoria.py`: `test_rf152_alta_registra_autor`, `test_rf152_modificacion_registra_autor`, `test_rf152_proceso_automatico_sin_autor`.

## Contexto (leer solo esto)
- `05-Diseño/Datos/rumbo.sql` — comentario de auditoría (líneas 35–38)
- [[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]]
- [[ARQ — Vista general]] — `core/db.py`

## Archivos probables
- `src/backend/rumbo/core/db.py`
- `src/backend/tests/negocio/test_auditoria.py`

## Fuera de alcance
- Historial de versiones de cada registro (no está en el alcance).

## Notas de implementación
- **Cómo:** listener global `before_flush` sobre `Session` en `core/db.py` (`_registrar_autor`). Lee `usuario_auditoria` (ContextVar de T-010). Detecta las filas auditadas por sus columnas `created_by`/`updated_by`, no por `AuditoriaMixin`, para que `core` no importe la capa de datos (ARQ). Las fechas las sigue poniendo la base (`server_default`/`onupdate`).
- **Decisiones de la persona:** una modificación sin usuario actual deja `updated_by = None`; alcanza con `updated_at >= created_at` (`now()` de Postgres es por transacción).
- **Restricción documentada:** un `update()` masivo del ORM no pasa por el flush y no completa `updated_by`, así que los repositorios modifican vía ORM. Seeds e importaciones atribuyen el autor seteando la ContextVar.
- **Tests:** 5 en `tests/negocio/test_auditoria.py` y uno de punta a punta en `tests/api/test_auditoria_http.py`, que protege el orden entre el commit de `SesionDep` y el reset de la ContextVar. En el fix se autorizó tocar el helper `_usuario` (patrón `set`/`reset`).
- **Review (opus):** 2 importantes (import de `core` a datos y `update()` masivo) y 3 menores; los 5 se aplicaron. Sin bloqueantes.
- **Modelos:** tests sonnet, implementación y fix sonnet, review opus. No hizo falta escalar.
- **Entorno:** en esta PC, pytest necesita `--basetemp` propio porque `%TEMP%\pytest-of-test123` no tiene permisos, y `uv` necesita `--system-certs`.
