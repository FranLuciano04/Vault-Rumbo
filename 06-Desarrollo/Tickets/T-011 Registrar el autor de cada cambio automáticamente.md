---
id: T-011
titulo: Registrar el autor de cada cambio automáticamente
modulo: M0 — Fundaciones
capa: backend
estado: libre
depende_de: [T-008, T-010]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [RF-152, RNF-04, DEC-0008]
origen: plan
asignado:
tomado_el:
rama:
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
