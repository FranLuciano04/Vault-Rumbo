---
id: T-134
titulo: Probar de punta a punta la planificación de redes
modulo: M9 — Redes e IA
capa: e2e
estado: hecho
depende_de: [T-131, T-133, T-025]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-19, CU-20]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 09/11/26 20:46
rama: feature/T-134-probar-de-punta-a-punta-la-planificacion
pr:
---
# T-134 Probar de punta a punta la planificación de redes

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Redes funciona contra el sistema real con la IA falsa del Compose de e2e, y la semilla de demo suma piezas ficticias.

## Criterios de aceptación
- [ ] Crear una pieza, moverla por el tablero y descartarla.
- [ ] Pedir una propuesta (modelo falso) y guardarla como pieza.
- [ ] Un usuario sin acceso a redes no ve la sección.

## Tests esperados
`e2e/redes.spec.ts`: `RF-113`, `RF-114`, `RF-119`, `RF-121`.

## Contexto (leer solo esto)
- [[CU-19 Planificar contenido en redes]]
- [[CU-20 Generar propuesta de contenido con IA]]

## Archivos probables
- `src/apps/web/e2e/redes.spec.ts`
- `src/backend/rumbo/datos/semillas/redes.py`

## Fuera de alcance
- La IA real (nunca en e2e ni en el CI).

## Notas de implementación
- **e2e** (`src/apps/web/e2e/redes.spec.ts`, 4 tests): tablero (alta en Idea, avanzar/retroceder, cancelar y confirmar el descarte, «Mostrar descartadas»), propuesta con el modelo falso (2 borradores, validaciones de canal y fecha, borrador editado y guardado; se verifica por la API), y acceso por rol (sin acceso: sin link, `/redes` → `/agenda`, API 403; con acceso: el tablero carga). No depende de la semilla: títulos, emails y fechas son únicos por intento (`SUFIJO`, `repeatEachIndex`, `retry`) para soportar reintentos.
- **Semilla de demo** (`datos/semillas/redes.py`): 7 piezas «Demo: …» a nombre de la dueña (por la review: la empleada de demo no tiene acceso a redes), repartidas en canales y estados, sin fechas de hoy; idempotente por usuario y título. Nuevo `RepositorioUsuarios.primera_duena_activa` (solo semillas).
- **Falla fuera del ticket (DEC-0019):** cortes intermitentes del e2e en Windows (`fetch failed / other side closed` y cuelgues del navegador) contra puertos de Docker Desktop. En `e2e/compose.ts`, el GET de `oobCodes` pasa por `reintentar` (solo errores de red; el POST de un solo uso no se reintenta) y `URL_BASE` usa `127.0.0.1`. Los otros specs que leen `oobCodes` con `fetch` directo (`alertas`, `clientes`, `cu01`, `hoteles`, `oportunidades`) podrían migrar a `elegirContrasena` si el corte reaparece.
- **Review (opus):** 0 bloqueantes, 0 importantes, 3 menores arreglados (aserción del test con acceso, responsable de la semilla, comentario).
- **Checks:** backend ruff, formato y mypy en verde; tests de semillas y CLI 34 passed; web eslint y tsc en verde; e2e completo 44 passed. Con `--repeat-each=3` en Windows apareció un cuelgue puntual del login (Docker Desktop), no reproducible y ajeno a redes.
- **Para levantar los e2e en local** hay que detener el stack de demo `rumbo`, que ocupa el puerto 9099 del Auth Emulator.
- **Modelos:** tests sonnet, semilla y depuración sonnet, review opus. Sin escalados.
