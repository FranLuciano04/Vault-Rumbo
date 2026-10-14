---
id: T-005
titulo: Configurar el proyecto de Firebase con su emulador
modulo: M0 — Fundaciones
capa: infra
estado: libre
depende_de: []
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [DEC-0016, RNF-03, CU-24]
origen: plan
asignado:
tomado_el:
rama:
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
