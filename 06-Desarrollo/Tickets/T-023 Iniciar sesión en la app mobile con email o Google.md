---
id: T-023
titulo: Iniciar sesión en la app mobile con email o Google
modulo: M0 — Fundaciones
capa: mobile
estado: tomado
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
