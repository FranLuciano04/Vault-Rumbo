---
id: T-038
titulo: Probar de punta a punta la configuración de la agencia
modulo: M1 — Usuarios y configuración
capa: e2e
estado: hecho
depende_de: [T-028, T-029, T-030, T-032, T-033, T-035, T-036, T-037, T-025]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-25, CU-26, CU-15, CU-31, CU-13]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 24/10/26 13:45
rama: feature/T-038-probar-de-punta-a-punta-la-configuracion
pr:
---
# T-038 Probar de punta a punta la configuración de la agencia

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Los flujos de configuración funcionan contra el sistema real y `datos-iniciales --demo` carga destinos, requisitos, operadores y usuarios de demo (ficticios) para los módulos siguientes.

## Criterios de aceptación
- [ ] La dueña da de alta a un empleado (en el emulador), el empleado inicia sesión y no ve Configuración.
- [ ] Alta de un destino con un requisito, baja y reactivación; operador duplicado rechazado.
- [ ] La semilla de demo de M1 queda registrada en la CLI.

## Tests esperados
`e2e/configuracion.spec.ts`: `RF-144 alta de empleado`, `RF-089 destino con requisito`, `RF-094 operador duplicado`, `RF-083 comisión por defecto`.

## Contexto (leer solo esto)
- [[CU-25 Gestionar usuarios y roles]]
- [[CU-26 Gestionar destinos]]
- [[CU-31 Gestionar operadores]]
- [[Spec de implementación]] §6

## Archivos probables
- `src/apps/web/e2e/configuracion.spec.ts`
- `src/backend/rumbo/datos/semillas/configuracion.py`

## Fuera de alcance
- Mobile (M1 no tiene pantallas mobile).

## Notas de implementación
- **Implementación (24/10/26, Nahuel):**
  - `e2e/configuracion.spec.ts` con RF-144 (el empleado elige contraseña con `oobCodes` + `accounts:resetPassword` del emulador, inicia sesión y no ve Configuración), RF-089, RF-094 y RF-083. Pasaron contra el sistema real sin destapar bugs.
  - Semilla `sembrar_configuracion` registrada en `SEMILLAS`: 3 destinos con 5 requisitos, 2 operadores y 2 usuarios de demo (empleado y freelance, `@rumbo.test`). Idempotente por nombre normalizado (como los índices únicos) y usuarios por `firebase_uid` o email.
  - **Decisiones de Nahuel:** los usuarios de demo llevan un `firebase_uid` ficticio y no pueden iniciar sesión; se autorizó actualizar `test_cli.py::test_dec0015…` (ahora `…_con_las_semillas_registradas_no_falla`), que exigía `SEMILLAS == []` (`--tocar-tests`).
  - **Intermitencia:** en la primera corrida RF-094 falló una vez porque el login de la dueña se quedó en `/login`; la review no encontró estado compartido en el spec. `ingresar` ahora espera `/api/auth/yo`, informa estado y alerta si falla y da 15 s a la URL. Si reaparece, pasar a un proyecto `setup` con `storageState({ indexedDB: true })` (sugerencia de la review, no aplicada).
  - Review Opus: 1 importante (idempotencia por nombre exacto) y 2 menores, todos arreglados en el fix.
  - Modelos: tests sonnet, semilla y fix sonnet, review opus. Sin refactor (e2e).
