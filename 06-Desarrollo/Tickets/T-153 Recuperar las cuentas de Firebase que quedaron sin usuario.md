---
id: T-153
titulo: Recuperar las cuentas de Firebase que quedaron sin usuario
modulo: M1 — Usuarios y configuración
capa: backend
estado: hecho
depende_de: [T-027]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-25, RF-144, RF-146, DEC-0016]
origen: hallazgo T-027
asignado: palomap2003
tomado_el: 24/10/26 15:39
rama: feature/T-153-recuperar-las-cuentas-de-firebase-que-qu
pr:
---
# T-153 Recuperar las cuentas de Firebase que quedaron sin usuario

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Si un alta de usuario deja una cuenta de Firebase sin `Usuario` en Rumbo, el admin puede volver a darlo de alta sin recibir un 409. Pasa si el commit final del pedido falla después del mail, o si llega una cancelación mientras se crea la cuenta. Hoy reintentar da 409 «Ya existe un usuario con ese email». Lo encontró la review de seguridad de T-027. Paloma decidió tratarlo como riesgo conocido y resolverlo aparte (22/10/26).

> ✅ **Decidido el 23/10/26 (Francisco):** se reutiliza la cuenta de Firebase sin `Usuario` y se completa el alta. El email sigue siendo único: si ya tiene `Usuario`, da 409. CU-25 A1 ya está actualizado. El ticket se puede tomar.

> ⚠️ **Cambiado el 24/10/26 (Paloma), por la review de seguridad:** la cuenta huérfana **no se reutiliza tal cual**, porque sus credenciales (contraseña, proveedor enlazado o sesiones) podrían ser de otra persona (*pre-account hijacking*). Se **borra y se crea una nueva**. CU-25 A1 ya está actualizado.

## Criterios de aceptación
- [ ] Alta con un email que ya tiene cuenta en Firebase pero ningún `Usuario` en Rumbo → se borra esa cuenta y se crea una nueva (uid nuevo), se crea el `Usuario` y Firebase manda el mail. No da 409.
- [ ] Email que ya tiene un `Usuario` en Rumbo → sigue dando 409, sin tocar Firebase.
- [ ] Si falla el alta después de recrear la cuenta, se borra la cuenta nueva, porque la creó este pedido (igual que en T-027).
- [ ] Dos altas simultáneas con el mismo email no se pisan: la segunda no puede borrar la cuenta que acaba de crear la primera.

## Tests esperados
`tests/api/test_usuarios.py`: `test_rf146_cuenta_huerfana_se_reutiliza`, `test_rf146_email_con_usuario_sigue_409` y `test_rf144_falla_al_reutilizar_no_borra_la_cuenta`. Con el `GestorDeCuentasFalso`.

## Contexto (leer solo esto)
- [[CU-25 Gestionar usuarios y roles]] — paso 3 y A1
- [[DEC-0016 Autenticación con Firebase|DEC-0016]]
- Notas de implementación de T-027 (riesgo conocido)

## Archivos probables
- `src/backend/rumbo/negocio/servicios/seguridad.py`
- `src/backend/rumbo/core/seguridad.py`

## Fuera de alcance
- Commit explícito dentro del servicio.

## Notas de implementación
- **Cambio de decisión (24/10/26, Paloma):** el verde reutilizaba la cuenta huérfana, como decía CU-25 A1. La review de seguridad lo marcó como **bloqueante** (*pre-account hijacking*): la cuenta conservaba la contraseña, los proveedores y las sesiones de quien la hubiera creado. Ahora se **borra y se crea una nueva**. CU-25 A1 y los criterios ya están actualizados.
- **Cómo queda el alta** (`negocio/servicios/seguridad.py`):
  - Se toma `pg_advisory_xact_lock` por email normalizado antes del chequeo de `Usuario` y de llamar a Firebase. La segunda alta simultánea espera y da 409. Está en `RepositorioUsuarios.bloquear_email`.
  - Ante `CuentaYaExiste` se busca el uid. Si ese uid pertenece a un `Usuario` (porque el email cambió en Firebase), da 409 sin borrar nada. Si no, se borra y se recrea. Si la búsqueda da `None`, se reintenta crear una vez.
  - Si falla el alta, se borra solo la cuenta creada por el pedido, como en T-027.
- **Gestor:** método nuevo `GestorDeCuentas.buscar_uid_por_email`, que en `GestorFirebase` usa `get_user_by_email`. Si no encuentra la cuenta devuelve `None`, y un error de Firebase da 502.
- **Tests:**
  - Se borró `test_rf146_email_duplicado_en_firebase_409` de T-027, que contradecía CU-25 A1. Se hizo con autorización y `--tocar-tests`.
  - Los tests de la reutilización se ajustaron a «borrar y recrear» en el fix, con autorización.
  - Se agregaron dos tests: el del lock (determinista, consulta `pg_locks` en cada llamada al gestor) y el de la cuenta de otro `Usuario`.
- **Reviews (`reviewer-seguridad`, Sonnet):**
  - 1.ª ronda: el bloqueante del hijacking (arreglado en `2ef3378`) y 2 menores, que quedaron resueltos con el cambio a borrar y recrear.
  - 2.ª ronda: 1 importante (no borrar la cuenta de un `Usuario` existente) y 1 menor (el test del lock), los dos arreglados en `dca4505`.
  - Quedó un menor sin cambio: un atacante podría forzar 409 repetidos si el registro libre de Firebase estuviera abierto. Está cerrado desde T-005.
  - La primera review se colgó y se relanzó.
- **Modelos:** tests con Sonnet; implementación, refactor (sin cambios) y fixes con Opus; reviews con Sonnet. No hubo escalados.
