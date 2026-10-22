---
id: T-023
titulo: Iniciar sesión en la app mobile con email o Google
modulo: M0 — Fundaciones
capa: mobile
estado: hecho
depende_de: [T-022, T-005]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-24, RF-140, RF-142, RF-143, DEC-0016]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 22/10/26 18:38
rama: feature/T-023-iniciar-sesion-en-la-app-mobile-con-emai
pr:
---
# T-023 Iniciar sesión en la app mobile con email o Google

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Una persona dada de alta entra a la app con email y contraseña o con Google, puede pedir el mail de «olvidé mi contraseña» y cerrar la sesión desde la pestaña Más.

## Criterios de aceptación
- [ ] Login con email y con Google en el development build; tras el login se consulta `/auth/yo` y un 401 cierra la sesión con el mensaje de «usuario no habilitado».
- [ ] «Olvidé mi contraseña» pide el mail a Firebase y muestra un mensaje neutro.
- [ ] La pestaña Más muestra el perfil y cierra la sesión.

## Tests esperados
`describe('RF-140 inicio de sesión mobile')`, `describe('RF-142 …')`, `describe('RF-143 …')` con Firebase simulado y MSW.

## Contexto (leer solo esto)
- [[CU-24 Iniciar sesión]]
- [[Prototipo UI]] — pantallas 52, 59 (PNG en `07-Entregables/Prototipo/img/`)
- [[DEC-0016 Autenticación con Firebase|DEC-0016]]

## Archivos probables
- `src/apps/mobile/app/(auth)/`
- `src/apps/mobile/app/(pestanas)/mas.tsx`
- `src/apps/mobile/src/lib/firebase.ts`

## Fuera de alcance
- Otros proveedores de login.

## Notas de implementación
- **Del plan:** El login con Google en React Native necesita una dependencia nativa que no está en la spec §3: **preguntar a la persona** antes de agregarla y, si se aprueba, sumarla a §3.
- **Implementación (22/10/26, Nahuel):**
  - Dependencia aprobada por Nahuel: `@react-native-google-signin/google-signin` (sumada a la spec §3). También se agregaron `firebase` y `@react-native-async-storage/async-storage` (persistencia de la sesión).
  - `src/lib/firebase.ts` usa el SDK web con inicialización al primer uso; Google: `hasPlayServices` → `signIn` → `GoogleAuthProvider.credential(idToken)` → `signInWithCredential`. `cerrarSesion` sale de Firebase y de Google. `cliente.ts` manda el ID token de Firebase.
  - Login (pantalla 52) y Más (pantalla 59) siguen el flujo de la web: 401 en `/auth/yo` → «usuario no habilitado» y cierre de sesión; «olvidé mi contraseña» con mensaje neutro.
  - Bug previo de T-022 arreglado: había dos copias de React (`@rumbo/shared` resolvía su propia `@tanstack/react-query`), y `useYo` real daba «Invalid hook call». Se fuerza una sola copia en `jest.config.js` y `metro.config.js`; lo de Metro no se probó en un build real.
- **Desvíos:**
  - Los tests no usan MSW, porque no carga bajo `jest-expo` (ESM de `rettime`); simulan `/auth/yo` con un adapter falso sobre el cliente real de `@rumbo/shared`.
  - En RNTL 14 `fireEvent` es async: los tests del rojo no tenían `await` y se corrigieron en el verde con `--tocar-tests`, con autorización de Nahuel.
  - `testTimeout: 20000` en mobile: con caché fría, el primer `renderRouter` (expo-router + Firebase) tarda entre 6 y 10 s. En main ya estaba cerca de los 5 s.
  - `mensajesInicioSesion.ts` está duplicado con la web; conviene llevarlo a `@rumbo/shared`.
- **Review (Sonnet, seguridad):** 0 bloqueantes, 0 importantes y 2 menores. Se arregló el mensaje para `PLAY_SERVICES_NOT_AVAILABLE` (sin test que lo cubra). Queda fuera del ticket: `(pestanas)/_layout.tsx` (de T-022) no redirige al login si un refetch da 401 con el usuario en caché.
- **Pendiente manual:** probar en el development build; Android necesita `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` y el SHA-1 en Firebase; iOS, `GoogleService-Info.plist`. Confirmar que el registro abierto siga deshabilitado en Firebase.
- **Verificación:** 34/34 tests de mobile en frío (cobertura 97 %); eslint y tsc sin errores.
- **Modelos:** tests con Sonnet; verde, refactor y fix con Opus; review con Sonnet. Sin escalados.
