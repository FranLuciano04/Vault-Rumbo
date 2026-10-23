---
tipo: referencia
estado: formalizado
responsable: Codex
modulo: M0
actualizado: 23/10/26
---
# M0 — review Codex

## Resumen
La revisión de los merges indicados de M0 deja tres hallazgos: dos bloqueantes en autenticación y uno importante en la integración del CI con mobile; los tres siguen presentes en `40f20f5`.
Se contrastaron los diffs con los tickets y su documentación, y se verificaron los cambios posteriores para excluir problemas ya corregidos. La validación incluyó una reproducción de la transformación de variables de Expo, lectura del SDK local de Firebase y evaluación de los filtros del CI; no se ejecutaron las suites completas ni el stack e2e.

## Hallazgos

### H-01 · Expo no incorpora la configuración de Firebase al bundle mobile
- **Severidad:** bloqueante
- **Ubicación:** `src/apps/mobile/src/lib/firebase.ts:21` (merge `c7f9b1b`; misma línea en el estado revisado).
- **Ticket relacionado:** T-023
- **Trazabilidad:** CU-24, RF-140, DEC-0016 §1 y §7.
- **Problema:** se asigna `process.env` a `entorno` y se leen las variables mediante `entorno.EXPO_PUBLIC_*`. El transformador de Expo sustituye los accesos directos `process.env.EXPO_PUBLIC_*`, pero no los accesos a través de ese alias. Por eso no incorpora la API key, el proyecto, el dominio, el app ID, la URL del emulador ni el cliente de Google. Se reprodujo con `expoInlineEnvVars` del `babel-preset-expo` instalado: el acceso mediante alias permanece literal y registra `publicEnvVars: []`; el acceso directo se sustituye por el valor configurado. Los tests mockean la inicialización de Firebase y no detectan el problema.
- **Escenario:** completar las variables de `.env.example` en el `.env` de mobile y abrir el development build → `initializeApp` recibe la API key sin definir y la inicialización de Auth falla, impidiendo iniciar sesión incluso con credenciales correctas. La configuración del emulador tampoco llega al bundle.
- **Arreglo sugerido:** leer cada variable mediante `process.env.EXPO_PUBLIC_NOMBRE`, sin alias de `process.env`. Agregar una comprobación de la transformación con Expo o del arranque en el development build que verifique las opciones reales de Firebase.

### H-02 · El verificador acepta ID tokens revocados en Firebase
- **Severidad:** bloqueante
- **Ubicación:** `src/backend/rumbo/core/seguridad.py:91` (merge `671ab9e`; línea 99 en el estado revisado).
- **Ticket relacionado:** T-010
- **Trazabilidad:** CU-24, RF-142, DEC-0016; punto 2 de «Puntos que conviene mirar entre tickets» del pedido de review de M0.
- **Problema:** `auth.verify_id_token` se llama sin `check_revoked=True`. El SDK instalado declara ese argumento con valor predeterminado `False` y solo consulta la revocación cuando es verdadero. Consultar `Usuario.activo` no detecta la revocación de una sesión en Firebase. El test que fuerza `RevokedIdTokenError` con un mock solo prueba la traducción de la excepción: pasa aunque nunca se habilite la comprobación. Las notas de T-010 reconocen expresamente la omisión para ahorrar una llamada por pedido; se consigna porque contradice el rechazo de tokens revocados exigido por el pedido de review, sin una DEC posterior que cambie ese criterio.
- **Escenario:** un usuario activo obtiene un ID token; se revocan sus sesiones en Firebase y se reutiliza ese token antes de su vencimiento → `GET /api/auth/yo` continúa autorizándolo mientras `Usuario.activo` siga siendo verdadero, potencialmente durante el resto de la hora de vigencia del token.
- **Arreglo sugerido:** habilitar la comprobación de revocación y probar que el adaptador la solicita, además de traducir el rechazo a 401. Al habilitarla, contemplar también `UserDisabledError` para que una cuenta deshabilitada en Firebase no termine en 500. Si el equipo decide mantener la ventana de aceptación, formalizar la excepción y reconciliar el criterio del pedido y los tests con esa decisión.

### H-03 · Cambiar shared no ejecuta los checks de mobile
- **Severidad:** importante
- **Ubicación:** `.github/workflows/ci.yml:72` (merge `157c831`; línea 77 en el estado revisado). La dependencia de mobile se incorpora en `src/apps/mobile/package.json:16` (merge `686db00`).
- **Ticket relacionado:** entre T-018 y T-022
- **Trazabilidad:** DEC-0015 §8 y §9, RNF-15; punto 9 del pedido de review de M0.
- **Problema:** el filtro de mobile solo contempla su carpeta y los archivos comunes de la raíz; conserva el comentario de que todavía no consume `@rumbo/shared`. T-022 agregó esa dependencia y su cliente HTTP, pero no actualizó el filtro. La evaluación de las expresiones actuales con `src/packages/shared/src/hooks/useYo.ts` devuelve `web=true` y `mobile=false`: se omiten lint, typecheck y tests de mobile aunque cambie código que importa. El e2e que sí corre solo prueba la web.
- **Escenario:** un PR modifica únicamente un hook, esquema o exportación de `src/packages/shared/` usado por mobile → el job mobile queda omitido y «CI ok» puede aprobar sin verificar si ese cambio rompe la compilación o las pruebas de la app.
- **Arreglo sugerido:** incluir `^src/packages/shared/` en el filtro de mobile y comprobar que un cambio aislado del paquete compartido active tanto web como mobile.

## Triage de Claude

> Triage del 23/10/26 (Nahuel, con Claude Opus 5.5) sobre `main` en `40f20f5`. Los tres hallazgos se verificaron en el código.

| Hallazgo | Resultado | Ticket |
|---|---|---|
| H-01 · Expo no incorpora la configuración de Firebase | ✅ Confirmado (bloqueante) | [[T-158 Leer la configuración de Firebase de mobile con accesos directos a process.env]] |
| H-02 · Se aceptan ID tokens revocados | ✅ Confirmado (bloqueante) | [[T-159 Rechazar los tokens revocados o de cuentas deshabilitadas en Firebase]] |
| H-03 · Cambiar shared no corre los checks de mobile | ✅ Confirmado (importante) | [[T-160 Correr los checks de mobile cuando cambia el paquete compartido]] |

- **H-01:** `src/apps/mobile/src/lib/firebase.ts:21` hace `const entorno = process.env` y lee `entorno.EXPO_PUBLIC_*`. El plugin `expoInlineEnvVars` de `babel-preset-expo` 58.0.18 (`build/plugins/inline-env-vars.js`) solo reemplaza expresiones cuyo objeto es literalmente `process.env`: `isProcessEnv` exige `process` como identificador y `env` como propiedad. El alias queda sin reemplazar y en runtime `process.env` no trae las `EXPO_PUBLIC_*`. Los tests de `__tests__/firebase.test.ts` mockean `initializeApp`, por eso no lo detectan.
- **H-02:** `src/backend/rumbo/core/seguridad.py:99` llama a `auth.verify_id_token(token, app=…)`. En el SDK instalado, `check_revoked` vale `False` por defecto (`firebase_admin/auth.py:200`). El propio ticket T-010 pide 401 para un token «inválido, vencido o revocado», y la nota de implementación que lo omite no tiene una `DEC-` que la respalde. El test parametrizado con `RevokedIdTokenError` (`tests/test_seguridad.py:152`) mockea la excepción y pasaría igual sin la comprobación. Codex también tiene razón en que `UserDisabledError` no hereda de `InvalidIdTokenError` (los dos heredan de `InvalidArgumentError`): con `check_revoked=True` terminaría en 500 si no se la captura. **Costo:** `check_revoked` suma una consulta a Firebase por pedido. T-159 lo deja como decisión abierta: si el equipo prefiere mantener la ventana de 1 h, se reemplaza por una `DEC-` que la formalice y por el ajuste del criterio de T-010.
- **H-03:** `.github/workflows/ci.yml:77` calcula `mobile` solo con `$raiz|^src/apps/mobile/` y conserva el comentario «Mobile todavía no consume @rumbo/shared». Ya lo consume: `src/apps/mobile/package.json:18` depende de `@rumbo/shared` desde T-022, y `src/cliente.ts` lo usa.
