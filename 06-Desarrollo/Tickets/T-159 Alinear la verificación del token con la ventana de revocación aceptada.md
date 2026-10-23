---
id: T-159
titulo: Alinear la verificación del token con la ventana de revocación aceptada
modulo: M0 — Fundaciones
capa: backend
estado: libre
depende_de: []
tamaño: XS
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-24, RF-142, DEC-0016, DEC-0018]
origen: review-codex M0
asignado:
tomado_el:
rama:
pr:
---
# T-159 Alinear la verificación del token con la ventana de revocación aceptada

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El código y los tests de la verificación del token dicen lo mismo que [[DEC-0018 Revocación de sesiones de Firebase|DEC-0018]]: la API no comprueba la revocación en cada pedido, el acceso se corta con `Usuario.activo` y un corte hecho solo en Firebase tarda hasta 1 h. Hoy un comentario de `core/seguridad.py` dice que el rechazo «incluye vencido y revocado», y ningún test impide que alguien active `check_revoked` sin una decisión nueva (hallazgo H-02 de [[M0 — review Codex]], resuelto con DEC-0018).

## Criterios de aceptación
- [ ] Un test fija que `VerificadorFirebase` llama a `auth.verify_id_token` **sin** `check_revoked=True`, y su nombre o docstring cita DEC-0018.
- [ ] Los comentarios de `VerificadorFirebase.verificar` citan DEC-0018 y ya no dicen que se rechazan los tokens revocados en Firebase.
- [ ] El test parametrizado `test_rf142_token_rechazado_por_firebase_da_token_invalido` sigue pasando y aclara que solo prueba la traducción de las excepciones del SDK.

## Tests esperados
- `test_rf142_verificador_no_pide_check_revoked_dec0018`: un doble de `auth.verify_id_token` registra los argumentos y el test exige que `check_revoked` no sea `True`.
- Ninguno más: el comportamiento no cambia.

## Contexto (leer solo esto)
- [[DEC-0018 Revocación de sesiones de Firebase]]
- [[M0 — review Codex]] — H-02 y su triage
- `src/backend/rumbo/core/seguridad.py` — `VerificadorFirebase`
- `src/backend/tests/test_seguridad.py`

## Archivos probables
- `src/backend/rumbo/core/seguridad.py`
- `src/backend/tests/test_seguridad.py`

## Fuera de alcance
- Activar `check_revoked` o cachear la revocación (descartados en DEC-0018).
- Cambiar la baja de usuarios (CU-25).

## Notas de implementación
- 23/10/26: el ticket se creó para activar `check_revoked`. El equipo eligió la opción B (DEC-0018) y se reescribió para alinear el código con esa decisión.
