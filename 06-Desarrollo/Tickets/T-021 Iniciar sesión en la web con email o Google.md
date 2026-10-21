---
id: T-021
titulo: Iniciar sesión en la web con email o Google
modulo: M0 — Fundaciones
capa: web
estado: tomado
depende_de: [T-020, T-005]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-24, RF-140, RF-142, RF-143, DEC-0016]
origen: plan
asignado: FranLucianoo
tomado_el: 21/10/26 15:30
rama: feature/T-021-iniciar-sesion-en-la-web-con-email-o-goo
pr:
---
# T-021 Iniciar sesión en la web con email o Google

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Una persona dada de alta entra a la web con email y contraseña o con Google, puede pedir el mail de «olvidé mi contraseña» y cerrar la sesión. Quien no está habilitado en Rumbo no entra.

## Criterios de aceptación
- [ ] Login con email (`signInWithEmailAndPassword`) y con Google (popup); después se consulta `/auth/yo` y, si responde 401, se cierra la sesión de Firebase y se muestra «usuario no habilitado» (A1).
- [ ] «Olvidé mi contraseña» pide el mail a Firebase (`sendPasswordResetEmail`) y muestra un mensaje neutro (A4).
- [ ] Cerrar sesión hace `signOut` y limpia la caché de TanStack Query (A3).

## Tests esperados
`describe('RF-140 inicio de sesión')`, `describe('RF-142 credenciales inválidas')`, `describe('RF-143 cierre de sesión')`, con el módulo de Firebase simulado y MSW para `/auth/yo`.

## Contexto (leer solo esto)
- [[CU-24 Iniciar sesión]]
- [[Prototipo UI]] — pantallas 1, 2 (PNG en `07-Entregables/Prototipo/img/`)
- [[DEC-0016 Autenticación con Firebase|DEC-0016]]
- [[Spec de implementación]] §7 (Nunca: otros proveedores, registro abierto)

## Archivos probables
- `src/apps/web/src/features/seguridad/`
- `src/apps/web/src/lib/firebase.ts`

## Fuera de alcance
- Registro abierto y otros proveedores de login.

## Notas de implementación
- **Del plan:** En desarrollo, el SDK apunta al Auth Emulator (`connectAuthEmulator`) según una variable de entorno.
