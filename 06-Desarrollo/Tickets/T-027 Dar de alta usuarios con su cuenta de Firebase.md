---
id: T-027
titulo: Dar de alta usuarios con su cuenta de Firebase
modulo: M1 — Usuarios y configuración
capa: backend
estado: tomado
depende_de: [T-026, T-017, T-012, T-011]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-25, RF-144, RF-145, RF-146, RF-150, DEC-0016]
origen: plan
asignado: palomap2003
tomado_el: 22/10/26 21:22
rama: feature/T-027-dar-de-alta-usuarios-con-su-cuenta-de-fi
pr:
---
# T-027 Dar de alta usuarios con su cuenta de Firebase

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña listan usuarios y dan de alta uno nuevo: Rumbo crea su cuenta en Firebase, guarda el `Usuario` con su rol y accesos, y Firebase le manda el mail para elegir la contraseña.

## Criterios de aceptación
- [ ] `GET /usuarios`, `GET /usuarios/{id}` y `POST /usuarios` solo para `admin` y `dueno` (403 al resto).
- [ ] Email duplicado (en Rumbo o en Firebase) → 409 sin crear nada (A1).
- [ ] Si falla Firebase → 502 sin `Usuario`; si falla la base después de crear la cuenta, la cuenta se borra (compensación).

## Tests esperados
`tests/api/test_usuarios.py`: `test_rf144_alta_crea_cuenta_y_usuario`, `test_rf145_alta_con_acceso_a_redes`, `test_rf146_email_duplicado_409`, `test_rf144_falla_firebase_502_sin_usuario`, roles 403. Con el Firebase falso.

## Contexto (leer solo esto)
- [[CU-25 Gestionar usuarios y roles]] — paso 3 y A1
- [[DEC-0016 Autenticación con Firebase|DEC-0016]]
- Contrato: `src/packages/shared/openapi.json` (módulo `seguridad`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/seguridad.py`
- `src/backend/rumbo/core/seguridad.py`
- `src/backend/rumbo/presentacion/routers/usuarios.py`

## Fuera de alcance
- Edición y baja (ticket siguiente).
- Mails propios: el mail lo manda Firebase.

## Notas de implementación
- **Del plan:** El Admin SDK solo **genera** el link de restablecimiento; para que Firebase **envíe** el mail desde el servidor hay que verificar en la documentación oficial la vía correcta (p. ej., la API REST `accounts:sendOobCode` con `PASSWORD_RESET`). No armar mails propios (spec §7).
