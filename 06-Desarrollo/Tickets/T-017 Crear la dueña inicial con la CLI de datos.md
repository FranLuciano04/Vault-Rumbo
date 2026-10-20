---
id: T-017
titulo: Crear la dueña inicial con la CLI de datos
modulo: M0 — Fundaciones
capa: backend
estado: hecho
depende_de: [T-010, T-011]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0015, DEC-0016, CU-25]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 19/10/26 19:36
rama: feature/T-017-crear-la-duena-inicial-con-la-cli-de-dat
pr:
---
# T-017 Crear la dueña inicial con la CLI de datos

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
`datos-iniciales` deja una instalación usable: crea la cuenta de la dueña en Firebase (o en el emulador) y su `Usuario`, y ofrece el punto donde cada módulo suma sus datos de demo.

## Criterios de aceptación
- [ ] Crea la cuenta en Firebase con el Admin SDK (`core.seguridad.crear_cuenta`) y el `Usuario` `dueno` con su `firebase_uid`; nombre y email llegan por argumento o entorno (nada inventado en el código).
- [ ] Es idempotente: correrla dos veces no duplica nada.
- [ ] Con `--demo` corre las semillas registradas por los módulos (en M0, ninguna).

## Tests esperados
`tests/negocio/test_cli.py`: con el Firebase falso, crea la dueña; segunda corrida sin duplicados; error claro sin configuración de Firebase.

## Contexto (leer solo esto)
- [[DEC-0015 Decisiones de implementación|DEC-0015]] — supuesto de `datos-iniciales`
- [[DEC-0016 Autenticación con Firebase|DEC-0016]]
- [[Spec de implementación]] §4

## Archivos probables
- `src/backend/rumbo/presentacion/cli.py`
- `src/backend/rumbo/core/seguridad.py`
- `src/backend/rumbo/datos/semillas/`

## Fuera de alcance
- Alta de usuarios desde la API (CU-25, M1).

## Notas de implementación
- Interfaz: `datos_iniciales(sesion, *, nombre, email, crear_cuenta, demo, informar)`; la CLI es `datos-iniciales --nombre --email [--demo]`, con `DUENA_NOMBRE` / `DUENA_EMAIL` como alternativa. Las semillas se registran en `rumbo.datos.semillas.SEMILLAS` (vacío en M0).
- `core.seguridad.crear_cuenta` es idempotente por email (`get_user_by_email` → `create_user` sin contraseña). `asegurar_duena` normaliza el email, busca por `firebase_uid` y luego por email, actualiza un uid desactualizado y corta con `Conflicto` si el email es de un usuario no `dueno` o dado de baja (no lo reactiva).
- Exige `FIREBASE_PROJECT_ID` también con el emulador (el Admin SDK lo necesita). No se probó contra el Auth Emulator real; `crear_cuenta` tiene tests con `auth` parcheado.
- Menores pendientes: la orquestación (dueña + semillas) vive en `presentacion/cli.py` y no en `negocio`; el `except ValueError` de `main` envuelve también la parte de la base, así que un `ValueError` de la DB se informaría como error de Firebase.
- Modelos usados: tests sonnet, implementación/refactor/fix sonnet, review opus. Sin escalados. En esta PC, pytest necesita `--basetemp` fuera de `AppData\Local\Temp\pytest-of-test123` (permisos rotos).
