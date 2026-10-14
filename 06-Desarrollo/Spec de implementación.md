---
tipo: referencia
estado: formalizado
fecha_aprobacion: 13/10/26
responsable: equipo
actualizado: 13/10/26
---
# Spec de implementación

tags:: #tipo/referencia #estado/formalizado #pc/pc2

> ✅ **Aprobada por el equipo completo el 13/10/26.** El corte en tickets está en el [[Plan de implementación]].
>
> Qué se construye, con qué, dónde y cómo se sabe que está bien. **Enlaza** al diseño del PC1 en vez de copiarlo: los subagentes leen esta spec y solo las notas que enlaza su ticket. Proceso en [[Flujo de implementación]] ([[DEC-0014 Flujo de implementación con agentes|DEC-0014]]); decisiones técnicas del grill en [[DEC-0015 Decisiones de implementación|DEC-0015]], con la autenticación reemplazada por [[DEC-0016 Autenticación con Firebase|DEC-0016]].

## 1. Objetivo
Implementar **Rumbo completo**: los 31 casos de uso de [[MOC — Casos de uso]], con la web como back-office y la app mobile para agenda, alertas y clientes (RNF-14), sobre la arquitectura de [[ARQ — Vista general]].

- **Meta mínima para el PC2 (30/10/26, quizás una semana más):** el circuito de [[CU-01 De la consulta a la venta|CU-01]] andando de punta a punta. Es decir, los módulos M0 a M6 cerrados, con su e2e.
- **Meta real:** avanzar todo lo que se pueda, en el orden del [[#8. Mapa de módulos]].
- **Usuarios del sistema:** `admin`, `dueño`, `empleado` y `freelance` ([[Actores]]).
- **Usuarios de esta spec:** los orquestadores y subagentes de cada integrante.

## 2. Fuentes de verdad (no se copian, se enlazan)
| Qué | Dónde |
|---|---|
| Comportamiento | Cada `CU-xx` de `02-Analisis/Casos de uso/` (pasos y flujos alternativos) y [[Requisitos funcionales]] (155 RF + 16 RNF) |
| Reglas | `02-Analisis/Reglas de negocio/` ([[RN-01 Comisión automática]]) y las `DEC-` de [[MOC — Decisiones (ADR)]] |
| Estados | Los `EST-*` de `03-Dominio/Diagramas/Estados/`: cada transición es un endpoint de acción; las inválidas responden `409` |
| Datos | [[DGM-ER]] y `05-Diseño/Datos/rumbo.sql` (con `Usuario.firebase_uid` de [[DEC-0016 Autenticación con Firebase\|DEC-0016]]) |
| Autenticación | [[DEC-0016 Autenticación con Firebase\|DEC-0016]]: Firebase Authentication autentica; rol, visibilidad, permisos y auditoría quedan en Rumbo |
| Interfaz entre capas | [[Contrato de la API (OpenAPI)]]: rutas, roles, códigos de error, convenciones (problem+json, paginación, importes como texto decimal, acciones `POST` para transiciones). En el PC2 lo genera FastAPI (ver el ticket de contrato, §8) |
| Arquitectura del backend | [[ARQ — Vista general]]: tres capas + `core`, once módulos, visibilidad por fila como parámetro obligatorio del repositorio, auditoría automática en `core.db` y `jobs.diario` con los mismos servicios |
| Pantallas | [[Prototipo UI]] (Figma, 59 capturas en `07-Entregables/Prototipo/img/`) |
| Roles y visibilidad | [[DEC-0005 Autenticación y modelo de roles\|DEC-0005]] y [[DEC-0008 Autenticación propia y rol de vendedor freelance\|DEC-0008]] |
| Economía | [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor\|DEC-0007]] y [[DEC-0013 Datos que faltaban en el ER\|DEC-0013]] |
| Infraestructura | [[DEC-0011 Infraestructura de despliegue on-premise\|DEC-0011]] · IA del producto: [[DEC-0012 Modelo de IA del producto\|DEC-0012]] |

Si una fuente contradice a otra, se aplica el orden de autoridad de `CLAUDE.md`, y la contradicción se señala y se resuelve con una `DEC-`.

## 3. Stack y versiones
Lo fija [[DEC-0001 Stack tecnológico|DEC-0001]], con los ajustes de [[DEC-0015 Decisiones de implementación|DEC-0015]] y [[DEC-0016 Autenticación con Firebase|DEC-0016]]:
- **Backend:** Python 3.13 · uv · FastAPI · Pydantic v2 (+ `pydantic-settings` para la configuración) · SQLAlchemy 2.0 async (asyncpg) · Alembic · `firebase-admin` · LangChain + `langchain-anthropic` (`claude-sonnet-5-5`) · WeasyPrint · openpyxl.
- **Autenticación:** Firebase Authentication (email y contraseña + Google; registro abierto deshabilitado). Firebase Auth Emulator (`firebase-tools`, con Java) para el desarrollo local y los e2e.
- **Base:** PostgreSQL 18.
- **Front:** Node 22 LTS · pnpm (workspace en `src/`) · TypeScript estricto · TanStack Query · Axios · zod · openapi-typescript · MSW.
  - Web: React · Vite · React Router · Tailwind CSS · shadcn/ui · react-hook-form · SDK web de Firebase (`firebase/auth`).
  - Mobile: React Native · Expo con **development build** (no Expo Go, por el login con Google) · Expo Router · NativeWind · SDK de Firebase.
- **Calidad:**
  - Backend: ruff · mypy · pytest · pytest-asyncio · httpx `AsyncClient` · pytest-cov · factory-boy · faker.
  - Web: ESLint · Prettier · Vitest · Testing Library · Playwright.
  - Mobile: Jest · RN Testing Library.
  - Seguridad: pip-audit · pnpm audit · bandit · Semgrep · gitleaks.
- **Versiones exactas:** las fija el ticket de fundaciones (lockfiles `uv.lock` y `pnpm-lock.yaml`), verificadas contra la documentación oficial (`source-driven-development`). Agregar una dependencia nueva es «preguntar primero» (§7).

## 4. Comandos
> Los crea el módulo M0; hasta entonces son el **objetivo**. Si un ticket cambia un comando, actualiza esta sección. Todos se corren desde la raíz del repo.

```bash
# Infraestructura local (PostgreSQL de desarrollo en 5432 y de tests en 5433)
docker compose -f src/docker-compose.dev.yml up -d
npx firebase-tools emulators:start --only auth --project demo-rumbo   # Auth Emulator en 9099

# Backend (desde src/backend)
uv sync
uv run alembic upgrade head
uv run python -m rumbo.presentacion.cli datos-iniciales      # dueña inicial (también en Firebase) + datos de demo
uv run fastapi dev rumbo/main.py                              # API en http://localhost:8000/api
uv run ruff check . && uv run ruff format --check .
uv run mypy rumbo
uv run pytest --cov=rumbo --cov-report=term-missing           # umbrales en pyproject (§6)
uv run python -m rumbo.presentacion.jobs.diario               # proceso automático, a mano
uv run python -m rumbo.presentacion.cli exportar-openapi ../packages/shared/openapi.json

# Front (desde src)
pnpm install
pnpm --filter @rumbo/shared generar                           # tipos desde openapi.json
pnpm --filter @rumbo/web dev
pnpm --filter @rumbo/web lint && pnpm --filter @rumbo/web typecheck
pnpm --filter @rumbo/web test -- --coverage
pnpm --filter @rumbo/web e2e                                  # Playwright contra el Compose con datos de demo
pnpm --filter @rumbo/mobile start
pnpm --filter @rumbo/mobile test -- --coverage

# Producción local (demos) y tickets
docker compose -f src/docker-compose.yml up -d --build        # nginx, api, postgres, scheduler
node 06-Desarrollo/herramientas/tickets.mjs disponibles
```

## 5. Estructura del proyecto
```text
.github/workflows/          # CI con jobs filtrados por carpeta (DEC-0015)
src/
├── docker-compose.dev.yml  # postgres de desarrollo y de tests
├── docker-compose.yml      # producción: nginx, api, postgres, scheduler (+ cloudflared en M10)
├── infra/                  # nginx.conf, crontab del scheduler, scripts de respaldo
├── package.json · pnpm-workspace.yaml
├── backend/
│   ├── pyproject.toml · uv.lock · alembic.ini · alembic/
│   ├── rumbo/              # exactamente la estructura de carpetas de ARQ — Vista general
│   │   ├── core/ · presentacion/ · negocio/ · datos/
│   │   └── presentacion/cli.py   # datos-iniciales, exportar-openapi
│   └── tests/
│       ├── conftest.py     # base de tests, sesión que se revierte, cliente HTTP, usuarios por rol
│       ├── fabricas.py     # factory-boy por entidad
│       ├── negocio/        # estados, políticas, servicios (con base real)
│       └── api/            # integración por módulo: test_<modulo>.py
├── packages/shared/        # @rumbo/shared
│   ├── openapi.json        # exportado por el backend (no se edita a mano)
│   └── src/ tipos.gen.ts · cliente.ts (Axios + token) · hooks/<modulo>.ts · esquemas/<modulo>.ts (zod) · mocks/<modulo>.ts (MSW)
├── apps/web/               # @rumbo/web
│   ├── src/ app/ (rutas y layout) · features/<modulo>/ · components/ui/ (shadcn) · lib/ · estilos/tokens.css
│   └── e2e/                # Playwright
└── apps/mobile/            # @rumbo/mobile
    ├── app/                # Expo Router: (auth)/, (pestanas)/agenda, clientes, mas
    └── src/ features/<modulo>/ · components/
```
- Los **módulos** del código usan los nombres de ARQ: `clientes`, `oportunidades`, `viajes`, `economia`, `alertas`, `configuracion`, `hoteles`, `redes`, `dashboard`, `calendario` y `seguridad`.
- Los tests viven junto a cada app: los del backend en `tests/`; los del front, como `*.test.ts(x)` al lado del código.

## 6. Estilo y testing
**Estilo:**
- Identificadores en español sin tildes, como en el ER (`viaje`, `precio_venta`, `PagoServicio`); los términos técnicos, en inglés (`router`, `hook`).
- Python con tipos completos (mypy estricto en `negocio/` y `core/`); TypeScript estricto, sin `any`.
- Sin comentarios obvios. Un comentario explica un *porqué* y cita la regla (`# RN-01`, `# EST-Viaje T10`).
- Importes con `Decimal` en Python y como string en el JSON; nunca `float`.
- Fechas: `timestamptz` en UTC; la regla de «hoy» usa `America/Argentina/Buenos_Aires`; la UI muestra `dd/mm/aa`.

```python
# negocio/servicios/economia.py — un caso de uso = una transacción (ARQ)
async def registrar_cobro(sesion: AsyncSession, actor: Usuario, pago_id: UUID, datos: CobroEntrada) -> Pago:
    pago = await repos.pagos.obtener(sesion, pago_id, visibilidad=politicas.visibilidad(actor))  # 404 si no lo ve
    politicas.exigir_escritura(actor, pago.viaje)                                                # 403
    estados.pago.cobrar(pago, datos)                         # EST-Pago: 409 si la transición no vale
    estados.viaje.al_registrar_cobro(pago.viaje)             # primer cobro → vendido; saldado → confirmado
    await alertas.resolver_de_pago(sesion, pago)
    return pago
```

**Testing:**
| Nivel | Qué cubre | Dónde | Cómo |
|---|---|---|---|
| Negocio | Estados, políticas, cálculos (ganancia, margen, comisión, saldo) y servicios | `tests/negocio/` | pytest contra el PostgreSQL de tests, sesión que se revierte, fábricas |
| API | Cada endpoint: éxito, roles (`403`), visibilidad (`404` del `freelance`), validación (`422`), estado (`409`) | `tests/api/` | httpx `AsyncClient` con un usuario por rol |
| Front (lógica) | Hooks, esquemas zod y componentes con lógica | `*.test.ts(x)` | Vitest o Jest + Testing Library + MSW |
| E2e web | Los flujos clave del módulo, y CU-01 completo en M6 | `apps/web/e2e/` | Playwright contra el Compose con datos de demo |
| Mobile | Las pantallas del módulo | Barrera del módulo | Prueba manual guiada (checklist en el pedido de review) |

- **Nombres por requisito:** `test_rf070_cobrar_primer_pago_pasa_viaje_a_vendido`, `describe('RF-070 …')`.
- **Cobertura mínima (el CI falla por debajo):** `rumbo/negocio/` ≥ 80 % y backend total ≥ 70 %; la lógica del front ≥ 70 %.
- **IA:** los tests usan un modelo falso inyectado en `core.ia`. **Nunca** se llama a la API de Claude desde los tests ni desde el CI.
- **Autenticación:** los tests del backend inyectan un verificador falso de tokens en `core.seguridad` (un usuario por rol); los e2e usan el Firebase Auth Emulator. **Nunca** se usa el proyecto real de Firebase en tests ni en el CI.

## 7. Límites
**Siempre:**
- Escribir el test antes que el código ([[Flujo de implementación]]) y nombrarlo por RF.
- Pasar el filtro de visibilidad a todo repositorio de lectura; validar la escritura en el servicio.
- Rechazar las transiciones inválidas con `409` y las validaciones con `422` (problem+json).
- Usar los nombres del lenguaje ubicuo y los valores de los enums en ASCII, como en el ER.
- Hacer las operaciones compuestas en una sola transacción (RNF-05) y las bajas siempre lógicas (RNF-07).
- Correr lint, type-check y tests antes del PR.

**Preguntar primero (a la persona, y si corresponde, con una `DEC-`):**
- Cambiar el esquema de la base más allá de lo que fija el ER (columnas, tablas, enums).
- Agregar una dependencia que no esté en §3.
- Cambiar un endpoint del contrato ya publicado por el ticket de contrato del módulo.
- Cambiar el CI, el Compose o los umbrales de cobertura.
- Cualquier contradicción entre el código y un CU, un EST o una DEC.

**Nunca:**
- Commitear secretos, `.env` ni claves: la de Claude y la **cuenta de servicio de Firebase** van solo en el `.env` (la config pública del SDK web sí se versiona).
- Guardar o manejar contraseñas en Rumbo: las maneja Firebase ([[DEC-0016 Autenticación con Firebase|DEC-0016]]).
- Borrar o debilitar un test para que algo pase.
- Llamar a la API de Claude con datos de clientes (RNF-16).
- Implementar lo que está fuera de alcance: pagos online, publicación automática en redes, GDS o mayoristas, facturación, mails propios (los de contraseña los manda Firebase), registro abierto de usuarios y otros proveedores de login que no sean email o Google.
- Mergear código a `main` sin PR.

## 8. Mapa de módulos
Cada módulo es una **barrera de revisión** con Codex ([[DEC-0014 Flujo de implementación con agentes|DEC-0014]]). El bloqueo real lo dan las dependencias de cada ticket, así que los módulos se solapan.

| Módulo | Alcance | Depende de |
|---|---|---|
| **M0 Fundaciones** | Workspace en `src/`, Compose de desarrollo, **proyecto de Firebase** (crearlo, habilitar email y Google, deshabilitar el registro abierto, cuenta de servicio en el `.env`, emulador), `core` (config, db con auditoría, seguridad con `firebase-admin`, cliente de IA falso/real), migración inicial desde `rumbo.sql`, políticas de visibilidad, errores problem+json y paginación, CLI (`datos-iniciales`, `exportar-openapi`), CI con filtros, `@rumbo/shared` (cliente con el ID token, tipos, MSW), shells web y mobile (development build) con los tokens del Figma, **CU-24** (login con email y con Google, «olvidé mi contraseña», logout, `/auth/yo`) | — |
| **M1 Usuarios y configuración** | CU-25 (el alta crea la cuenta en Firebase y dispara el mail), CU-13, parámetros, CU-26, CU-15, CU-31 | M0 |
| **M2 Clientes** | CU-02, CU-03 (web y mobile) | M0 |
| **M3 Alertas** | CU-14, CU-28 y el servicio de alertas que usan los demás módulos (web y mobile) | M2 |
| **M4 Oportunidades y cotizaciones** | CU-04, CU-05, CU-06 (con el PDF) | M2, M3 |
| **M5 Hoteles y reseñas** | CU-16, CU-17, CU-18, CU-29 | M1 |
| **M6 Viajes y economía** ⚠️ | CU-07, CU-10, CU-11, CU-12, CU-08, CU-09, CU-27 + **e2e de CU-01** · meta mínima del PC2 | M4, M5 |
| **M7 Proceso diario y CRM proactivo** | `jobs.diario` (vencimientos, alertas `viaje` y `recontacto`, idempotente), CU-30 | M6 |
| **M8 Calendario, dashboard y reportes** | CU-23, CU-21, CU-22 (JSON, Excel y PDF) | M6 |
| **M9 Redes e IA** | CU-19, CU-20 | M1 |
| **M10 Despliegue on-premise** | Servidor de DEC-0011, Cloudflare Tunnel, runner, respaldo diario con copia externa (RNF-08), prueba de carga (RNF-09/10) | M7, M8 |

**Forma de cada módulo** (la usa `planning-and-task-breakdown`):
1. **Ticket de contrato:** esquemas Pydantic, routers con stubs que responden `501`, exportar el OpenAPI, tipos y mocks MSW. Lo revisa Opus.
2. **Tickets de backend:** uno por CU o flujo alternativo con lógica propia.
3. **Tickets de web y de mobile:** por pantalla o flujo, contra los mocks; dependen solo del ticket de contrato.
4. **Ticket e2e:** Playwright contra el backend real; depende de los anteriores.

## 9. Criterios de éxito
- **De un ticket:** sus criterios de aceptación cubiertos por tests nombrados por RF; el CI en verde; la review sin bloqueantes abiertos.
- **De un módulo:**
  - todos sus tickets hechos;
  - el e2e web pasando;
  - la prueba manual del mobile hecha (si tiene pantallas mobile);
  - la review de Codex procesada;
  - la aprobación humana y el tag `mod-N`.
- **De la meta del PC2:** desde una base con los datos iniciales, una persona hace en la web el circuito de CU-01 (cliente → consulta → cotización → reserva → plan de cuotas → cobros → viaje `confirmado`), con los permisos por rol, y el e2e de CU-01 pasa en el CI.
- **Del sistema:** los 31 CU implementados; cobertura dentro de los umbrales; RNF-09/10 medidos con la prueba de carga; desplegado en el servidor de la agencia con respaldo diario.

## 10. Preguntas abiertas (no bloquean el plan)
- La **fecha del PC2** se puede correr una semana: confirmar con la cátedra.
- **Protección de `main`:** exigir checks solo a los PR, sin bloquear los push de los claims (la configura el dueño del repo cuando exista el CI, en M0).
- **Clave de la API de Claude** con límite de gasto: quién la crea y cuándo (antes de la demo de M9).
- **Servidor de la agencia** para M10: cuándo y dónde está disponible.
