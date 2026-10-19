---
id: T-005
titulo: Configurar el proyecto de Firebase con su emulador
modulo: M0 — Fundaciones
capa: infra
estado: hecho
depende_de: []
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [DEC-0016, RNF-03, CU-24]
origen: plan
asignado: palomap2003
tomado_el: 19/10/26 16:31
rama: feature/T-005-configurar-el-proyecto-de-firebase-con-s
pr:
---
# T-005 Configurar el proyecto de Firebase con su emulador

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existe el proyecto real de Firebase de Rumbo (email/contraseña y Google habilitados, **registro abierto deshabilitado**) y cada integrante puede correr el Firebase Auth Emulator localmente con el proyecto `demo-rumbo`. Las credenciales quedan solo en el `.env`.

## Criterios de aceptación
- [ ] La persona completa en la consola el checklist de `src/infra/firebase.md`: crear el proyecto, habilitar los dos proveedores, deshabilitar el alta de usuarios desde el cliente, plantilla de mails en español, dominios autorizados y cuenta de servicio guardada fuera del repo.
- [ ] `npx firebase-tools emulators:start --only auth --project demo-rumbo` arranca con `src/firebase.json` y `src/.firebaserc`.
- [ ] `.env.example` (backend y web) documenta las variables (`FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `FIREBASE_AUTH_EMULATOR_HOST`, `VITE_FIREBASE_*`) y `gitleaks` no encuentra credenciales.

## Tests esperados
No sigue TDD (`infra`). Se verifica arrancando el emulador, creando una cuenta de prueba en él y corriendo `gitleaks`.

## Contexto (leer solo esto)
- [[DEC-0016 Autenticación con Firebase|DEC-0016]]
- [[Spec de implementación]] §4 y §7 (Nunca)
- [[Skills compartidas]] — dependencias (firebase-tools + Java)

## Archivos probables
- `src/firebase.json`
- `src/.firebaserc`
- `src/infra/firebase.md`
- `src/backend/.env.example`
- `src/apps/web/.env.example`

## Fuera de alcance
- La verificación de tokens (`core.seguridad`) y las pantallas de login.

## Notas de implementación
- **Del plan:** Necesita a una persona: el agente no entra a la consola de Firebase. El agente prepara los archivos y el checklist; la persona lo ejecuta y lo marca en estas notas. La config pública del SDK web sí se versiona; la cuenta de servicio, nunca.
- **19/10 (Paloma):**
  - **Verificación.** El emulador arranca con `npx firebase-tools@15 emulators:start --only auth --project demo-rumbo --config src/firebase.json`. Se probó crear una cuenta por REST. gitleaks corrió con Docker sobre el historial Git y no encontró fugas; en modo `dir`, solo marcó archivos ignorados (`.venv` y el `.env` local).
  - **El emulador de Auth no necesita Java 17.** Anduvo con Java 8. Hay que corregir [[Skills compartidas]].
  - **Spec §4.** El comando lleva `--config src/firebase.json` para poder correrlo desde la raíz.
  - **Desvío del plan.** La config pública del SDK web **no se versiona**: va en `src/apps/web/.env` porque gitleaks marca las claves `AIza…`. Versionarla exige una allowlist de gitleaks, y eso lo decide el equipo. Los nombres `VITE_FIREBASE_*` quedan como contrato para el login web.
  - **Review de seguridad (Sonnet).** Sin bloqueantes. Se arreglaron los 2 importantes: endurecer el checklist (rol mínimo de la cuenta de servicio, API key restringida, protección contra enumeración y política de contraseñas) y verificar el registro cerrado con `ADMIN_ONLY_OPERATION`. También 2 menores: el emulador de la web pasa a ser opt-in y se amplió el `.gitignore` de la cuenta de servicio.
  - **Modelos.** Implementación y fix con Opus; review con Sonnet. Sin escalados.
  - **Checklist de consola (§2 de `src/infra/firebase.md`): ✅ completo (19/10, Paloma).** Proyecto `rumbo-9ff17` en plan Spark, con el equipo sumado como miembro. Se configuraron los proveedores, se cerró el registro, se activó la protección contra enumeración y se fijó la política de contraseñas. Las plantillas están en español y la app web quedó registrada. La cuenta de servicio `rumbo-backend` tiene solo «Administrador de Firebase Authentication» y su JSON quedó fuera del repo. La API key está restringida a `http://localhost:5173/*` y `http://127.0.0.1:5173/*`, y a Identity Toolkit y Token Service.
  - **Verificado.** `accounts:signUp` con la `apiKey` real responde `400 ADMIN_ONLY_OPERATION`; sin referer, la clave queda bloqueada. Con la cuenta de servicio, el Admin SDK lista usuarios (0).
  - **Corrección.** La consola rechaza `http://localhost:*/*` (no acepta comodín en el puerto), así que `firebase.md` ahora usa el puerto de Vite.
  - **Para M10.** Montar la cuenta de servicio en el contenedor, sumar el dominio del túnel a los autorizados y a los referentes de la API key, y dejar `ENTORNO` sin definir.
