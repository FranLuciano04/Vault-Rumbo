---
id: T-027
titulo: Dar de alta usuarios con su cuenta de Firebase
modulo: M1 — Usuarios y configuración
capa: backend
estado: hecho
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
- **Costura de cuentas:** el `GestorDeCuentas` (Protocol) de `rumbo/core/seguridad.py` crea la cuenta, la borra y manda el mail. Su versión real es `GestorFirebase`: el Admin SDK en un hilo para crear y borrar, y `accounts:sendOobCode` con `PASSWORD_RESET` firmado con la credencial del Admin SDK para el mail (fuente: https://cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/sendOobCode). Con `returnOobLink` en false el mail lo manda Firebase. No hay variables ni secretos nuevos. Con el emulador se usa el token `owner`, solo en desarrollo. Los tests usan un `GestorDeCuentasFalso`.
- **Alta:** se valida el rol y el email (normalizado; en Rumbo se busca sin distinguir mayúsculas → 409 sin tocar Firebase). Después se crea la cuenta (`CuentaYaExiste` → 409, sin borrar la cuenta ajena) y, en un savepoint, el INSERT y el mail. Si falla la base, el mail o hay una cancelación (`BaseException`), se borra la cuenta y se relanza el error. `IntegrityError` → 409.
- **Decisión de Paloma (22/10/26):** si Firebase no puede mandar el mail, la respuesta es 502, se borra la cuenta y no queda `Usuario`.
- **Riesgo conocido (decisión de Paloma):** si falla el commit final del pedido, después del mail, o si llega una cancelación mientras se crea la cuenta, queda una cuenta de Firebase sin `Usuario` y reintentar da 409. Va a un ticket aparte (recuperar cuentas huérfanas).
- **Decisión abierta para la sync (`#accion/decidir`):** hoy un `admin` puede dar de alta a otro `admin` o a una `dueno`. Sigue la letra de CU-25 paso 3, pero ninguna DEC dice si puede otorgar un rol superior al suyo.
- **Tests de soporte (`--tocar-tests`):** las 3 rutas en `IMPLEMENTADAS` de `test_contrato_m1.py`. En el fix se sumaron dos tests (email con mayúsculas y cancelación), autorizados por el orquestador. En el rojo se sacó el test de «`password` extra → 422»: prohibir campos extra cambiaría el contrato, y el servidor nunca usa una contraseña.
- **Review de seguridad (sonnet):** 0 bloqueantes, 2 importantes y 4 menores. Se arreglaron la cancelación y la búsqueda sin mayúsculas. El commit final y el rol `dueno` siguieron las decisiones de arriba. Descartado: «nombre de solo espacios» (`Entrada` recorta, así que da 422). Quedan como menores: `ValueError` del SDK → 502 (el email inválido ya da 422 en el esquema, e `INVALID_EMAIL` del servidor no tiene tipo propio) y timeouts del Admin SDK por defecto.
- **Verificación manual (23/10/26, Paloma):** ✅ con `rumbo-9ff17`, el mail llegó, se eligió la contraseña con el link y la cuenta entra a Rumbo con la API levantada (no hizo falta `userIp`). ✅ Con el Auth Emulator (compose con `docker-compose.e2e.yml`, en un proyecto aparte): la dueña da de alta a una empleada (201), la cuenta aparece en el emulador, Firebase emite el código `PASSWORD_RESET`, la empleada elige la contraseña con ese código y entra (`/auth/yo` 200, rol `empleado`). También dan 409 el email repetido en mayúsculas y 403 cuando la empleada lista usuarios. `GestorFirebase` sigue sin tests propios (core/seguridad.py, 72 %).
- **Modelos:** tests sonnet, implementación/refactor/fix opus, review sonnet. Sin escalados.
