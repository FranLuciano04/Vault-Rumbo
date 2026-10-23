---
tipo: referencia
estado: formalizado
responsable: equipo
modulo: M0
actualizado: 23/10/26
---
# M0 — pedido de review

tags:: #tipo/referencia #estado/formalizado #pc/pc2

> Pedido de review del módulo **M0 — Fundaciones** para Codex, según [[Review de módulo — rol de Codex]] y [[DEC-0014 Flujo de implementación con agentes|DEC-0014]]. Los hallazgos van en `06-Desarrollo/Reviews/M0 — review Codex.md`. El tag de cierre es `mod-0`.

## Alcance
M0 arma la base del sistema: backend FastAPI con base PostgreSQL y migración inicial, autenticación con Firebase, usuario de la sesión, visibilidad por fila y auditoría, contrato compartido (`@rumbo/shared`), shells web y mobile con inicio de sesión, CI con análisis de seguridad, Compose de desarrollo, e2e y producción local. Todavía no hay módulos de negocio: las políticas de visibilidad y escritura ya existen, pero las usan los módulos siguientes.

Revisá **solo los diffs de los merges de abajo** (`git diff <merge>^1 <merge>`). `main` ya tiene código de M1 y M2 encima: si un archivo cambió después, el código vigente puede no ser el del merge. Si algo de M0 ya se corrigió más adelante, no lo reportes.

## Tickets y merges

| Ticket | Capa | Riesgo | Trazabilidad | Merge |
|---|---|---|---|---|
| [[T-001 Inicializar el backend con uv y FastAPI]] | infra | normal | DEC-0001, DEC-0015 | `7dc0615` Merge pull request #1 from FranLuciano04/feature/T-001-inicializar-el-backend-con-uv-y-fastapi |
| [[T-002 Crear el workspace pnpm con la app web]] | infra | normal | DEC-0001, DEC-0015 | `1fe9287` Merge pull request #7 from FranLuciano04/feature/T-002-crear-el-workspace-pnpm-con-la-app-web |
| [[T-003 Crear la app mobile con Expo development build]] | infra | normal | DEC-0001, DEC-0015, DEC-0016 | `ef5e74f` Merge pull request #17 from FranLuciano04/feature/T-003-crear-la-app-mobile-con-expo-development |
| [[T-004 Levantar PostgreSQL de desarrollo con Docker Compose]] | infra | normal | DEC-0015 | `5ad0d90` Merge pull request #3 from FranLuciano04/feature/T-004-levantar-postgresql-de-desarrollo-con-do |
| [[T-005 Configurar el proyecto de Firebase con su emulador]] | infra | alto | DEC-0016, RNF-03, CU-24 | `0cc2bf4` Merge pull request #14 from FranLuciano04/feature/T-005-configurar-el-proyecto-de-firebase-con-s |
| [[T-006 Configurar la sesión async de la base con su entorno]] | backend | normal | DEC-0015, RNF-05 | `605c86c` Merge pull request #4 from FranLuciano04/feature/T-006-configurar-la-sesion-async-de-la-base-co |
| [[T-007 Mapear las entidades del ER con SQLAlchemy]] | backend | normal | DEC-0013, DEC-0016, RNF-07 | `952e7de` Merge pull request #6 from FranLuciano04/feature/T-007-mapear-las-entidades-del-er-con-sqlalche |
| [[T-008 Crear la migración inicial de Alembic desde rumbo.sql]] | backend | normal | DEC-0015, DEC-0013 | `61e5486` Merge pull request #10 from FranLuciano04/feature/T-008-crear-la-migracion-inicial-de-alembic-de |
| [[T-009 Responder los errores con problem+json]] | backend | normal | RNF-06, RNF-12 | `c176046` Merge pull request #2 from FranLuciano04/feature/T-009-responder-los-errores-con-problem-json |
| [[T-010 Verificar el token de Firebase para resolver el usuario actual]] | backend | alto | CU-24, RF-140, RF-142, RNF-01, RNF-03, DEC-0016 | `671ab9e` Merge pull request #13 from FranLuciano04/feature/T-010-verificar-el-token-de-firebase-para-reso |
| [[T-011 Registrar el autor de cada cambio automáticamente]] | backend | normal | RF-152, RNF-04, DEC-0008 | `8708fea` Merge pull request #15 from FranLuciano04/feature/T-011-registrar-el-autor-de-cada-cambio-automa |
| [[T-012 Aplicar la visibilidad por fila según el rol]] | backend | alto | RF-151, RF-150, RNF-02, DEC-0005, DEC-0008 | `8796705` Merge pull request #12 from FranLuciano04/feature/T-012-aplicar-la-visibilidad-por-fila-segun-el |
| [[T-013 Configurar el cliente de IA con un modelo falso]] | backend | normal | DEC-0012, RNF-16 | `84c2202` Merge pull request #29 from FranLuciano04/feature/T-013-configurar-el-cliente-de-ia-con-un-model |
| [[T-014 Generar los tipos compartidos desde el OpenAPI]] | shared | normal | DEC-0001, DEC-0015 | `d6ffb25` Merge pull request #8 from FranLuciano04/feature/T-014-generar-los-tipos-compartidos-desde-el-o |
| [[T-015 Publicar el contrato base con el usuario de la sesión]] | contrato | normal | CU-24, RF-141, DEC-0016 | `ec16b40` Merge pull request #9 from FranLuciano04/feature/T-015-publicar-el-contrato-base-con-el-usuario |
| [[T-016 Devolver el usuario de la sesión con su rol]] | backend | alto | CU-24, RF-141, DEC-0005, DEC-0013 | `0f12c3d` Merge pull request #21 from FranLuciano04/feature/T-016-devolver-el-usuario-de-la-sesion-con-su |
| [[T-017 Crear la dueña inicial con la CLI de datos]] | backend | normal | DEC-0015, DEC-0016, CU-25 | `9df00b9` Merge pull request #16 from FranLuciano04/feature/T-017-crear-la-duena-inicial-con-la-cli-de-dat |
| [[T-018 Armar el CI con jobs filtrados por carpeta]] | infra | normal | DEC-0015, RNF-15 | `157c831` Merge pull request #19 from FranLuciano04/feature/T-018-armar-el-ci-con-jobs-filtrados-por-carpe |
| [[T-019 Sumar los análisis de seguridad al CI]] | infra | normal | DEC-0001, RNF-03 | `30cd80e` Merge pull request #30 from FranLuciano04/feature/T-019-sumar-los-analisis-de-seguridad-al-ci |
| [[T-020 Armar el shell web con la navegación por rol]] | web | normal | RNF-11, RNF-14, RNF-16, CU-24 | `7f2843f` Merge pull request #11 from FranLuciano04/feature/T-020-armar-el-shell-web-con-la-navegacion-por |
| [[T-021 Iniciar sesión en la web con email o Google]] | web | alto | CU-24, RF-140, RF-142, RF-143, DEC-0016 | `315dc07` Merge pull request #23 from FranLuciano04/feature/T-021-iniciar-sesion-en-la-web-con-email-o-goo |
| [[T-022 Armar el shell mobile con sus pestañas]] | mobile | normal | RNF-14, CU-24 | `686db00` Merge pull request #25 from FranLuciano04/feature/T-022-armar-el-shell-mobile-con-sus-pestanas |
| [[T-023 Iniciar sesión en la app mobile con email o Google]] | mobile | alto | CU-24, RF-140, RF-142, RF-143, DEC-0016 | `c7f9b1b` Merge pull request #40 from FranLuciano04/feature/T-023-iniciar-sesion-en-la-app-mobile-con-emai |
| [[T-024 Armar el Compose de producción local para las demos]] | infra | normal | DEC-0011, DEC-0015 | `d749f04` Merge pull request #18 from FranLuciano04/feature/T-024-armar-el-compose-de-produccion-local-par |
| [[T-025 Probar de punta a punta el inicio de sesión web]] | e2e | normal | CU-24, RF-140, RF-142, RF-143 | `d7db62a` Merge pull request #24 from FranLuciano04/feature/T-025-probar-de-punta-a-punta-el-inicio-de-ses |
| [[T-140 Aislar los tests de la variable SSLKEYLOGFILE]] | backend | normal | DEC-0015, RNF-15 | `8de2a1d` Merge pull request #5 from FranLuciano04/feature/T-140-aislar-los-tests-de-la-variable-sslkeylo |
| [[T-141 Mostrar los íconos de cada sección en la barra lateral]] | web | normal | RNF-11, CU-24 | `3c58187` Merge pull request #27 from FranLuciano04/feature/T-141-mostrar-los-iconos-de-cada-seccion-en-la |
| [[T-142 Adaptar la barra lateral de la web a pantallas angostas]] | web | normal | RNF-11, RNF-14 | `01ff0d4` Merge pull request #28 from FranLuciano04/feature/T-142-adaptar-la-barra-lateral-de-la-web-a-pan |
| [[T-143 Cubrir con tests el layout raíz de la app mobile]] | mobile | normal | DEC-0015, RNF-15 | `d78458b` Merge pull request #20 from FranLuciano04/feature/T-143-cubrir-con-tests-el-layout-raiz-de-la-ap |
| [[T-144 Exportar el OpenAPI con finales de línea LF]] | backend | normal | DEC-0001 | `fcd710a` Merge pull request #22 from FranLuciano04/feature/T-144-exportar-el-openapi-con-finales-de-linea |
| [[T-145 Responder un error controlado si falta el proyecto de Firebase]] | backend | alto | CU-24, RF-142, DEC-0016 | `403f7d1` Merge pull request #26 from FranLuciano04/feature/T-145-responder-un-error-controlado-si-falta-e |
| [[T-150 Correr las auditorías de dependencias cada semana]] | infra | normal | DEC-0001, RNF-03 | `a631efd` Merge pull request #36 from FranLuciano04/feature/T-150-correr-las-auditorias-de-dependencias-ca |
| [[T-152 Rechazar en el rojo un comando de tests que no se pudo ejecutar]] | infra | normal | DEC-0014 | `05c30da` Merge pull request #44 from FranLuciano04/feature/T-152-rechazar-en-el-rojo-un-comando-de-tests |
| [[T-154 Acelerar la suite de tests del backend]] | infra | normal | DEC-0014 | `dbd2e3d` Merge pull request #49 from FranLuciano04/feature/T-154-acelerar-la-suite-de-tests-del-backend |

Los 34 merges suman unos 220 archivos distintos (+28.133 / −493 líneas, con los lockfiles incluidos).

## Archivos tocados por el módulo
Unión de `git diff --name-only <merge>^1 <merge>` de los 34 merges, sin las notas de tickets, el grafo, los lockfiles (`src/pnpm-lock.yaml`, `src/backend/uv.lock`) ni la configuración de dependencias o de lint.

**Backend (`src/backend/`)**
- Núcleo: `rumbo/main.py`, `rumbo/core/config.py`, `rumbo/core/db.py` (sesión por pedido y auditoría `created_by`/`updated_by`), `rumbo/core/errores.py`, `rumbo/core/seguridad.py` (verificación de tokens, emulador, cuentas de Firebase), `rumbo/core/ia.py`.
- Datos: `rumbo/datos/modelos/{base,enums,catalogos,comercial,posventa}.py`, `rumbo/datos/repositorios/{base,seguridad}.py`, `rumbo/datos/semillas/__init__.py`, `alembic.ini`, `alembic/env.py`, `alembic/versions/0001_esquema_inicial.py`.
- Negocio: `rumbo/negocio/politicas.py` (visibilidad y escritura por rol), `rumbo/negocio/servicios/seguridad.py`, `rumbo/negocio/errores.py`.
- Presentación: `rumbo/presentacion/{dependencias,errores,openapi,paginacion,cli}.py`, `rumbo/presentacion/esquemas/{comunes,seguridad}.py`, `rumbo/presentacion/routers/seguridad.py` (`GET /api/auth/yo`).
- Tests: `tests/conftest.py`, `tests/fabricas.py`, `tests/api/*` (auditoría HTTP, contrato, errores, OpenAPI, seguridad), `tests/negocio/*` (auditoría, CLI, IA, políticas), `tests/test_{config,db,entorno,migracion,modelos,salud,seguridad,cli_openapi,url_de_tests}.py`.
- Imagen: `Dockerfile`, `.dockerignore`, `.env.example`, `pyproject.toml`.

**Contrato compartido (`src/packages/shared/`)**
- `openapi.json`, `src/tipos.gen.ts`, `src/cliente.ts`, `src/esquemas/{index,seguridad}.ts`, `src/hooks/useYo.ts`, `src/mocks/index.ts`, y sus tests (`cliente`, `generar`, `useYo`, `mocks`, `yo`).

**Web (`src/apps/web/`)**
- `src/main.tsx`, `src/app/{App,Shell,RutaProtegida,SeccionPendiente,navegacion}.tsx|ts`, `src/features/seguridad/{PaginaLogin,BotonCerrarSesion,mensajesInicioSesion}`, `src/lib/{firebase,formato,utils}.ts`, `src/components/ui/{button,input,label}.tsx`, `src/estilos/{index,tokens}.css`.
- Tests: `App*.test.tsx`, `navegacion.test.ts`, `PaginaLogin.test.tsx`, `formato.test.ts`, `tokens.test.ts`; e2e en `e2e/{compose,global-setup,global-teardown,seguridad.spec}.ts` y `playwright.config.ts`.
- `Dockerfile`, `vite.config.ts`, `.env.example`.

**Mobile (`src/apps/mobile/`)**
- `app/_layout.tsx`, `app/index.tsx`, `app/(auth)/login.tsx`, `app/(pestanas)/{_layout,agenda,clientes,mas}.tsx`, `src/cliente.ts`, `src/lib/{firebase,mensajesInicioSesion}.ts`, `src/componentes/BotonPestana.tsx`, `app.json`, `.env.example`.
- Tests: `__tests__/{firebase,inicio,layout,login,mas,navegacion,tema}.test.*`.

**Infraestructura y CI**
- `src/docker-compose.yml` (producción local), `src/docker-compose.dev.yml`, `src/docker-compose.e2e.yml`, `src/infra/nginx.conf`, `src/infra/auth-emulator/{Dockerfile,firebase.json}`, `src/infra/firebase.md`, `src/firebase.json`, `src/.firebaserc`, `src/.env.example`.
- `.github/workflows/{ci,secretos,auditoria-semanal}.yml`, `.gitleaks.toml`, `.gitignore`.
- Proceso: `06-Desarrollo/herramientas/tickets.mjs` (T-152).

## Puntos que conviene mirar entre tickets
1. **Contrato backend ↔ shared ↔ web/mobile (T-015, T-016, T-014, T-021, T-023).** Que `GET /api/auth/yo` devuelva lo que declaran `openapi.json` y `tipos.gen.ts`, y que los mocks MSW de `@rumbo/shared` respeten el mismo esquema que el backend real, incluidos los errores problem+json (401, 403, usuario inactivo o inexistente). Que web y mobile reaccionen igual ante cada error.
2. **Autenticación (T-005, T-010, T-145, T-021, T-023, T-025).** Que el emulador de Firebase no se pueda activar fuera de desarrollo (`EmuladorFueraDeDesarrollo`). Que un token vencido, revocado, de otro proyecto o de un `Usuario` dado de baja no pase. Que el cierre de sesión limpie el estado en web y mobile. Que el e2e pruebe el flujo real y no uno mockeado.
3. **Permisos y visibilidad por fila (T-012, T-016, T-020).** `negocio/politicas.py` contra DEC-0005 y DEC-0008: el `freelance` ve y escribe solo lo suyo (clientes, oportunidades, viajes, alertas), y `exigir_rol` / `exigir_escritura` no dejan huecos. La navegación por rol de la web (`navegacion.ts`, `RutaProtegida`) es solo cosmética: confirmá que no se la use como único control.
4. **Auditoría (T-011, T-006).** Que `created_by`/`updated_by` se completen en toda escritura que pase por la sesión por pedido, también en la CLI (T-017) y en las semillas, y que no se puedan falsear desde la entrada.
5. **Datos y migraciones (T-007, T-008, T-004).** Que `0001_esquema_inicial.py` y los modelos SQLAlchemy coincidan con `05-Diseño/Datos/rumbo.sql`: tipos, `CHECK`, índices, `ON DELETE`, enums, baja lógica, montos `NUMERIC` y fechas con zona horaria. Que `downgrade` funcione.
6. **Transacciones (T-006, T-017).** Commit y rollback de la sesión por pedido ante errores, y que `datos-iniciales` sea idempotente si se corta entre crear la cuenta de Firebase y crear el `Usuario`.
7. **Errores (T-009, T-145).** Que todas las excepciones, incluidas las de validación y las no controladas, salgan como problem+json sin filtrar trazas ni secretos.
8. **IA (T-013).** Que el modelo falso sea el valor por defecto en tests y CI, y que la clave nunca se loguee.
9. **Infra y CI (T-018, T-019, T-024, T-150, T-154).** Que los filtros por carpeta no dejen sin correr un job cuando cambia algo compartido (`packages/shared`, `openapi.json`). Que los análisis de secretos y dependencias fallen de verdad. Que el Compose de producción no exponga PostgreSQL ni el emulador, y que nginx pase bien los headers del proxy. Que la base por worker de pytest-xdist (T-154) no comparta estado entre tests.
10. **Tests.** Comportamientos de los tickets de riesgo alto (T-005, T-010, T-012, T-016, T-021, T-023, T-145) sin test, o tests que pasarían con una implementación incorrecta.

## Especificación de referencia
- [[CU-24 Iniciar sesión]], [[CU-25 Gestionar usuarios y roles]] (solo la dueña inicial).
- Requisitos: RF-140 a RF-143, RF-150 a RF-152 en `02-Analisis/Requisitos funcionales.md`; RNF-01 a RNF-07, RNF-11, RNF-12, RNF-14 a RNF-16.
- Decisiones: DEC-0001, DEC-0005, DEC-0008, DEC-0011, DEC-0012, DEC-0013, DEC-0014, DEC-0015, DEC-0016.
- Datos: `05-Diseño/Datos/rumbo.sql`. Contrato: `05-Diseño/API/openapi.json`.
