# Firebase Authentication: proyecto, emulador y variables

Firebase solo autentica; la autorización (rol, visibilidad, auditoría) sigue en Rumbo
(DEC-0016). Este archivo tiene tres partes: el emulador para desarrollar, el checklist para crear
el proyecto real en la consola y las variables de cada entorno.

## 1. Auth Emulator (desarrollo y e2e)

`src/firebase.json` y `src/.firebaserc` configuran el emulador con el proyecto `demo-rumbo`. Un
proyecto `demo-*` no toca nada real: funciona sin internet y sin credenciales.

```bash
# Desde la raíz del repo (solo Node; el emulador de Auth no necesita Java)
npx firebase-tools emulators:start --only auth --project demo-rumbo --config src/firebase.json
```

- Auth Emulator en `127.0.0.1:9099` y la interfaz en <http://127.0.0.1:4000/auth> (cuentas
  creadas, links de los mails de contraseña).
- Las cuentas viven en memoria: se pierden al cortar el emulador (`Ctrl+C`).
- Cuenta de prueba por la API REST (cualquier `key` sirve con el emulador):

```bash
curl -X POST "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key" \
  -H "Content-Type: application/json" \
  -d '{"email":"prueba@rumbo.test","password":"clave-de-prueba","returnSecureToken":true}'
```

Para que el backend y la web usen el emulador: `ENTORNO=desarrollo`,
`FIREBASE_PROJECT_ID=demo-rumbo` y `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099` en
`src/backend/.env`, y en `src/apps/web/.env` las `VITE_FIREBASE_*` de
`src/apps/web/.env.example`, **descomentando** `VITE_FIREBASE_AUTH_EMULATOR_URL` (viene comentada:
el emulador es opcional, como en el backend).

## 2. Checklist del proyecto real (lo hace una persona en la consola)

Se hace una vez, en <https://console.firebase.google.com>. Al terminar, marcarlo en las notas
del ticket T-005.

- [ ] **Crear el proyecto** de Rumbo (plan Spark, gratuito). Sin Google Analytics. Anotar el
      _Project ID_.
- [ ] Sumar al resto del equipo como miembros del proyecto (Configuración del proyecto →
      Usuarios y permisos).
- [ ] **Authentication → Método de acceso:** habilitar **Correo electrónico/contraseña** (sin
      el vínculo por correo) y **Google** (con el correo de asistencia del equipo). Ningún otro
      proveedor.
- [ ] **Authentication → Configuración → Acciones del usuario:** **desmarcar «Habilitar la
      creación (registro)»** (y también la eliminación). Así nadie se registra solo: las cuentas
      las crea el backend con el Admin SDK en CU-25, y el inicio con Google solo entra con
      cuentas ya dadas de alta (DEC-0016 §2 y §3). **Se marca solo después de comprobarlo**
      (paso «Verificar el registro deshabilitado», al final de la lista).
- [ ] **Authentication → Configuración → Acciones del usuario:** dejar activada la **protección
      contra la enumeración de correos electrónicos** (que el login no revele si un email tiene
      cuenta).
- [ ] **Authentication → Configuración → Política de contraseñas:** exigir al menos 8
      caracteres con mayúscula, minúscula y número, en modo **obligatorio** (_Require_).
- [ ] **Authentication → Configuración → Vinculación de cuentas:** dejar «Vincular las cuentas
      que usan el mismo correo electrónico» (una cuenta por email, DEC-0016 §3).
- [ ] **Authentication → Plantillas:** idioma de las plantillas **español**; en «Restablecimiento
      de contraseña», nombre del remitente «Rumbo».
- [ ] **Authentication → Configuración → Dominios autorizados:** dejar `localhost` y agregar el
      dominio público del servidor cuando exista (túnel de DEC-0011, módulo M10).
- [ ] **Registrar la app web** (Configuración del proyecto → Tus apps → `</>`), sin Hosting.
      Copiar `apiKey`, `authDomain`, `projectId` y `appId` a las `VITE_FIREBASE_*` de
      `src/apps/web/.env` (sin `VITE_FIREBASE_AUTH_EMULATOR_URL`). Son públicas, pero se pasan
      por el `.env` y no se pegan en el repo: el escáner de secretos (gitleaks) marca las
      claves `AIza…`.
- [ ] **Cuenta de servicio del backend** (Configuración del proyecto → Cuentas de servicio →
      Generar nueva clave privada). **Es secreta:** guardar el JSON **fuera del repo** (por
      ejemplo `C:\Users\<usuario>\.rumbo\firebase-cuenta-de-servicio.json`), nunca en `src/`
      ni en un chat. Compartirla con el equipo por un canal privado, no por Git.
- [ ] **Permisos mínimos de la cuenta de servicio** (Google Cloud → IAM y administración → IAM):
      la cuenta `firebase-adminsdk-…` viene con roles amplios. Dejarle **solo** el rol
      **«Administrador de Firebase Authentication»** (_Firebase Authentication Admin_), o crear
      una cuenta de servicio propia con ese único rol y generar la clave de esa. El backend solo
      verifica tokens y crea o desactiva cuentas.
- [ ] **Restringir la API key web** (Google Cloud → APIs y servicios → Credenciales → la clave
      «Browser key» del proyecto):
  - Restricción de aplicación: **referentes HTTP**, con `http://localhost:*/*` y el dominio
    público del servidor cuando exista (M10).
  - Restricción de API: solo **Identity Toolkit API** y **Token Service API**.
- [ ] **Verificar el registro deshabilitado** (con la `apiKey` real; es pública):

  ```bash
  curl -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=<apiKey>" \
    -H "Content-Type: application/json" -H "Referer: http://localhost:5173/" \
    -d '{"returnSecureToken":true}'
  ```

  Tiene que responder un error `400` con `"message": "ADMIN_ONLY_OPERATION"`. Si devuelve un
  `idToken`, el registro sigue abierto: volver al paso de «Acciones del usuario», y borrar la
  cuenta anónima que se creó (Authentication → Usuarios). Recién con `ADMIN_ONLY_OPERATION` se
  marcan este paso y el de «Acciones del usuario». El `Referer` hace falta porque la clave ya
  está restringida por referente; si responde `API_KEY_HTTP_REFERRER_BLOCKED`, revisar que
  `http://localhost:*/*` esté en la restricción.

Si la clave de la cuenta de servicio se filtra: borrarla en Google Cloud → IAM →
Cuentas de servicio → Claves, generar otra y actualizar los `.env`.

## 3. Variables por entorno

**Backend** (`src/backend/.env`; el detalle está en `src/backend/.env.example`):

| Variable                         | Tu PC con el emulador | Tu PC con el proyecto real   | Servidor (DEC-0011)                         |
| -------------------------------- | --------------------- | ---------------------------- | ------------------------------------------- |
| `ENTORNO`                        | `desarrollo`          | `desarrollo`                 | **se omite** (queda `produccion`)           |
| `FIREBASE_PROJECT_ID`            | `demo-rumbo`          | Project ID real              | Project ID real                             |
| `GOOGLE_APPLICATION_CREDENTIALS` | no va                 | ruta al JSON, fuera del repo | ruta al JSON montado en el contenedor (M10) |
| `FIREBASE_AUTH_EMULATOR_HOST`    | `localhost:9099`      | no va                        | **nunca**                                   |

- Con `FIREBASE_AUTH_EMULATOR_HOST` el Admin SDK **no verifica la firma** de los tokens. Por eso
  el backend **no arranca** si esa variable está definida y `ENTORNO` no es `desarrollo`
  (`rumbo/core/seguridad.py`). En el servidor, `ENTORNO` se omite para que valga `produccion`.
- Los tests del backend no usan Firebase: inyectan un verificador falso.

**Web** (`src/apps/web/.env`; en el servidor, al construir la imagen): las `VITE_FIREBASE_*` del
proyecto real y **sin** `VITE_FIREBASE_AUTH_EMULATOR_URL`.
