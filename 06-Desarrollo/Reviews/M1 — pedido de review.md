---
tipo: referencia
estado: formalizado
responsable: equipo
modulo: M1
actualizado: 26/10/26
---
# M1 — pedido de review

tags:: #tipo/referencia #estado/formalizado #pc/pc2

> Pedido de review del módulo **M1 — Usuarios y configuración** para Codex, según [[Review de módulo — rol de Codex]] y [[DEC-0014 Flujo de implementación con agentes|DEC-0014]]. Los hallazgos van en `06-Desarrollo/Reviews/M1 — review Codex.md`. El tag de cierre es `mod-1`.

## Alcance
M1 arma la configuración de la agencia sobre las fundaciones de M0. Incluye el alta de `Usuario` con su cuenta de Firebase, el cambio de rol con la protección del último admin y la baja. También incluye los parámetros del negocio, la comisión por defecto de cada vendedor, el catálogo de destinos con sus requisitos y el catálogo de operadores. Todo eso tiene backend, contrato en `@rumbo/shared`, una pantalla de Configuración en la web y un e2e. Mobile no tiene pantallas en M1.

Revisá **solo los diffs de los merges de abajo** (`git diff <merge>^1 <merge>`). `main` ya tiene código de M2 a M4 encima, así que si un archivo cambió después, el código vigente puede no ser el del merge. Si algo de M1 ya se corrigió más adelante, no lo reportes. La migración `0003_cliente_instagram.py` es de M2: no entra en esta review.

## Tickets y merges

| Ticket | Capa | Riesgo | Trazabilidad | Merge |
|---|---|---|---|---|
| [[T-026 Publicar el contrato de usuarios y configuración]] | contrato | normal | CU-25, CU-13, CU-26, CU-15, CU-31, DEC-0013, DEC-0016 | `0a1bbbe` Merge pull request #32 from FranLuciano04/feature/T-026-publicar-el-contrato-de-usuarios-y-confi |
| [[T-027 Dar de alta usuarios con su cuenta de Firebase]] | backend | alto | CU-25, RF-144, RF-145, RF-146, RF-150, DEC-0016 | `d248b17` Merge pull request #45 from FranLuciano04/feature/T-027-dar-de-alta-usuarios-con-su-cuenta-de-fi |
| [[T-028 Editar el rol de un usuario protegiendo al último admin]] | backend | alto | CU-25, RF-147, RF-148, RF-149, RF-153, DEC-0016 | `116ff01` Merge pull request #59 from FranLuciano04/feature/T-028-editar-el-rol-de-un-usuario-protegiendo |
| [[T-029 Editar los parámetros del negocio]] | backend | normal | DEC-0013, CU-06, CU-07, CU-30 | `02a9eb0` Merge pull request #35 from FranLuciano04/feature/T-029-editar-los-parametros-del-negocio |
| [[T-030 Configurar la comisión por defecto de un vendedor]] | backend | alto | CU-13, RF-083, RF-084, RF-085, RN-01, DEC-0004, DEC-0007 | `aac3dfc` Merge pull request #33 from FranLuciano04/feature/T-030-configurar-la-comision-por-defecto-de-un (y `26b8644`, merge de `main` en la rama) |
| [[T-031 Gestionar el catálogo de destinos]] | backend | normal | CU-26, RF-089, RF-090, RF-091, RF-092, RF-153, DEC-0006 | `cf53cbc` Merge pull request #37 from FranLuciano04/feature/T-031-gestionar-el-catalogo-de-destinos |
| [[T-032 Configurar los requisitos de cada destino]] | backend | normal | CU-15, RF-086, RF-087, RF-088, RF-034 | `44c1f96` Merge pull request #39 from FranLuciano04/feature/T-032-configurar-los-requisitos-de-cada-destin |
| [[T-033 Gestionar el catálogo de operadores]] | backend | normal | CU-31, RF-093, RF-094, RF-095, RF-096, RF-153, DEC-0009 | `db80d47` Merge pull request #46 from FranLuciano04/feature/T-033-gestionar-el-catalogo-de-operadores |
| [[T-034 Configurar los parámetros del negocio en la web]] | web | normal | CU-13, DEC-0013, RF-083, RF-084 | `14ac574` Merge pull request #43 from FranLuciano04/feature/T-034-configurar-los-parametros-del-negocio-en |
| [[T-035 Gestionar usuarios y roles en la web]] | web | normal | CU-25, RF-144 a RF-149 | `b8966b6` Merge pull request #58 from FranLuciano04/feature/T-035-gestionar-usuarios-y-roles-en-la-web |
| [[T-036 Gestionar destinos con sus requisitos en la web]] | web | normal | CU-26, CU-15, RF-086, RF-089 a RF-092 | `98046f9` Merge pull request #50 from FranLuciano04/feature/T-036-gestionar-destinos-con-sus-requisitos-en |
| [[T-037 Gestionar operadores en la web]] | web | normal | CU-31, RF-093 a RF-096, CU-25, RF-147 | `1ba418a` Merge pull request #64 from FranLuciano04/feature/T-037-gestionar-operadores-en-la-web (y `ad37be1`, merge de `main` en la rama) |
| [[T-038 Probar de punta a punta la configuración de la agencia]] | e2e | normal | CU-25, CU-26, CU-15, CU-31, CU-13 | `d1503cd` Merge pull request #66 from FranLuciano04/feature/T-038-probar-de-punta-a-punta-la-configuracion |
| [[T-146 Alinear las referencias de RF del permiso por rol]] | backend | normal | RF-150, RF-151, DEC-0005, DEC-0008 | `9a288e6` Merge pull request #70 from FranLuciano04/feature/T-146-alinear-las-referencias-de-rf-del-permis |
| [[T-147 Fijar con un test la comisión de un usuario dado de baja]] | backend | normal | CU-13, RF-083, RF-153 | `cc81c7a` Merge pull request #68 from FranLuciano04/feature/T-147-fijar-con-un-test-la-comision-de-un-usua |
| [[T-148 Medir la cobertura del backend a través de los await]] | infra | normal | RNF-15, DEC-0001 | `9829b55` Merge pull request #41 from FranLuciano04/feature/T-148-medir-la-cobertura-del-backend-a-traves |
| [[T-151 Responder 422 ante un número fuera del rango de la base]] | backend | normal | CU-15, RF-086, RF-087, DEC-0001 | `2e1111f` Merge pull request #42 from FranLuciano04/feature/T-151-responder-422-ante-un-numero-fuera-del-r |
| [[T-153 Recuperar las cuentas de Firebase que quedaron sin usuario]] | backend | alto | CU-25, RF-144, RF-146, DEC-0016 | `db8995e` Merge pull request #73 from FranLuciano04/feature/T-153-recuperar-las-cuentas-de-firebase-que-qu |
| [[T-163 Forzar la versión con parche de undici]] | infra | normal | RNF-15 | `6bfe36c` Merge pull request #60 from FranLuciano04/feature/T-163-forzar-la-version-con-parche-de-undici |

Los 19 merges suman unos 100 archivos distintos (+16.885 / −1.126 líneas, con los lockfiles incluidos). En T-030 y T-037, el diff que importa es el del merge del PR, no el de `main` dentro de la rama.

## Archivos tocados por el módulo
Unión de `git diff --name-only <merge>^1 <merge>` de los 19 merges, sin las notas de tickets, el grafo ni los lockfiles.

**Backend (`src/backend/`)**
- Núcleo: `rumbo/main.py`, `rumbo/core/seguridad.py` (cuentas de Firebase: alta, borrado y recuperación de T-153), `rumbo/core/errores_de_base.py` (traducción de errores de PostgreSQL, T-151).
- Datos: `rumbo/datos/modelos/{base,catalogos}.py`, `rumbo/datos/repositorios/{base,seguridad,configuracion,destinos,requisitos,operadores,clientes}.py`, `rumbo/datos/semillas/{__init__,configuracion}.py`, `alembic/versions/0002_destino_nombre_unico.py`, `alembic/versions/0004_operador_nombre_unico.py`.
- Negocio: `rumbo/negocio/politicas.py`, `rumbo/negocio/servicios/{seguridad,configuracion,parametros}.py`.
- Presentación: `rumbo/presentacion/{contrato,dependencias,errores}.py`, `rumbo/presentacion/esquemas/{comunes,configuracion,usuarios}.py`, `rumbo/presentacion/routers/{usuarios,configuracion}.py`.
- Tests: `tests/api/test_{usuarios,comision,configuracion,contrato_m1,destinos,destinos_busqueda_y_unicidad,requisitos,operadores,clientes,errores}.py`, `tests/negocio/test_{cli,configuracion,destinos,parametros,politicas,semilla_configuracion}.py`, `tests/test_{errores_de_base,seguridad}.py`, `tests/conftest.py`.
- `pyproject.toml` (cobertura con `concurrency`, T-148), `.env.example`.

**Contrato compartido (`src/packages/shared/`)**
- `openapi.json`, `src/tipos.gen.ts`, `src/modelos.ts`, `src/index.ts`.
- Hooks: `src/hooks/{index,useAccion,useConfiguracion,useDestinos,useOperadores,useUsuarios}.ts`.
- Mocks: `src/mocks/{index,m1}.ts` y `src/mocks/m1.test.ts`.

**Web (`src/apps/web/`)**
- `src/app/{App,SeccionConfiguracion}.tsx`.
- `src/features/configuracion/`: `PaginaConfiguracion.tsx`, `FormularioParametros.tsx`, `FormularioComision.tsx`, `CampoFormulario.tsx`, `esquemas.ts`, `errores.ts`, `usuarios/{PestanaUsuarios,FormularioUsuario}.tsx`, `destinos/{PestanaDestinos,FormularioDestino,FormularioRequisito,RequisitosDestino}.tsx`, `operadores/{PestanaOperadores,FormularioOperador}.tsx`.
- Tests: `App.configuracion.test.tsx`, `PaginaConfiguracion.test.tsx`, `esquemas.test.ts`, `Pestana{Usuarios,Destinos,Operadores}.test.tsx`; e2e en `e2e/configuracion.spec.ts`.

**Infraestructura y especificación**
- `.github/workflows/ci.yml`, `src/pnpm-workspace.yaml` (override de `undici`, T-163).
- `02-Analisis/Casos de uso/CU-25 Gestionar usuarios y roles.md` (cambio de A1 en T-153).

## Puntos que conviene mirar entre tickets
1. **Alta de usuarios y cuentas de Firebase (T-027, T-153).** El alta crea dos cosas que no comparten transacción: la cuenta de Firebase y el `Usuario` en PostgreSQL. Revisá qué pasa si falla una de las dos. Por decisión de T-153, una cuenta de Firebase sin `Usuario` **se borra y se crea de nuevo**, no se reutiliza (*pre-account hijacking*). Confirmá también que nunca se borre una cuenta cuyo uid pertenece a un `Usuario`, y que el lock por email cubra dos altas simultáneas del mismo email. Que un email ya usado por otro `Usuario`, activo o dado de baja, responda el error del contrato.
2. **Rol, baja y último admin (T-028, T-035, T-037).** Revisá CU-25 A3 (baja lógica) y A4 (último admin): no puede quedar la agencia sin un admin activo, ni por cambio de rol ni por baja. Tampoco con dos pedidos concurrentes, así que fijate si hace falta un lock o un `SELECT … FOR UPDATE`. Por la ampliación de A2, un `admin` no puede quitarle el rol `dueño` a una dueña ni darla de baja (403). La protección de la última dueña (A5) se agregó después, en el PR #76 (`fix/ultima-duena`): no la reportes como faltante, aunque sí podés revisar si comparte la carrera con A4. Que un usuario no pueda subirse el rol a sí mismo. Que un `Usuario` dado de baja no pueda usar la API (enlace con el `GET /api/auth/yo` de M0), aunque su token de Firebase siga vigente.
3. **Permisos (T-146 y todos los routers).** Cada ruta de `routers/usuarios.py` y `routers/configuracion.py` debe pasar por `exigir_rol` / `exigir_escritura` de `negocio/politicas.py` según DEC-0005 y DEC-0008. El `freelance` y el `vendedor` no administran usuarios, parámetros ni catálogos, pero sí leen lo que necesitan (destinos y operadores activos). Que la pestaña Configuración de la web no sea el único control.
4. **Comisión (T-030, T-147, T-034).** Es plata (DEC-0004, DEC-0007, RN-01). Porcentaje dentro del rango, `NUMERIC` sin pérdida por `float` en el backend, los esquemas Pydantic ni el formulario web. Que cambiar la comisión por defecto no reescriba la de operaciones ya creadas. Que la de un usuario dado de baja se comporte como fija el test de T-147.
5. **Parámetros del negocio (T-029, T-034).** Validación de cada parámetro (rangos, días, porcentajes) igual en Pydantic, en el esquema zod de `esquemas.ts` y en la base. La semilla `semillas/configuracion.py` tiene que ser idempotente.
6. **Catálogos de destinos, requisitos y operadores (T-031, T-032, T-033, T-036, T-037).** Revisá la unicidad del nombre según lo que fijan T-031 y T-033: si distingue mayúsculas y espacios, y si coinciden la validación del servicio y el índice de la base. Mirá las migraciones `0002` y `0004` y su `downgrade`, y qué pasa con datos previos duplicados. La baja es lógica (RF-153): un destino u operador dado de baja no se ofrece para cosas nuevas, pero lo que ya lo usa lo sigue mostrando. Un requisito pertenece a su destino y no se puede editar a través de otro.
7. **Errores de la base (T-151).** `core/errores_de_base.py` y `presentacion/errores.py`: que un número fuera de rango, una unicidad violada o una FK inválida salgan como 422/409 problem+json sin filtrar el SQL ni el nombre de la restricción, y que no se traguen errores que deberían ser 500.
8. **Contrato backend ↔ shared ↔ web (T-026 y los tickets web).** Que `openapi.json` y `tipos.gen.ts` coincidan con los esquemas Pydantic. Que los mocks de `mocks/m1.ts` respeten los mismos códigos de error que el backend real (409 por duplicado, 422, 403), porque la web se desarrolló contra los mocks. Que `useAccion` y los hooks invaliden las queries correctas después de cada mutación.
9. **Repositorios base (T-031 y siguientes).** `datos/repositorios/base.py` cambió en M1 y lo heredan los módulos siguientes. Revisá la paginación, los filtros de búsqueda (sin inyección en `ILIKE`, con escape de `%` y `_`) y la auditoría `created_by`/`updated_by` en cada escritura.
10. **Tests.** Comportamientos de los tickets de riesgo alto (T-027, T-028, T-030, T-153) que no tengan test, o tests que pasarían con una implementación incorrecta. Que el e2e de T-038 recorra el backend real y no los mocks.

## Especificación de referencia
- [[CU-25 Gestionar usuarios y roles]], [[CU-13 Configurar porcentaje de comisión]], [[CU-26 Gestionar destinos]], [[CU-15 Configurar recordatorios por destino]], [[CU-31 Gestionar operadores]]. Los parámetros de T-029 los usan [[CU-06 Emitir cotización]], [[CU-07 Confirmar reserva]] y [[CU-30 Sugerir recontacto de clientes]].
- Requisitos: RF-034, RF-083 a RF-096, RF-144 a RF-153 en `02-Analisis/Requisitos funcionales.md`; RN-01; RNF-15.
- Decisiones: DEC-0004, DEC-0005, DEC-0006, DEC-0007, DEC-0008, DEC-0009, DEC-0013, DEC-0016, DEC-0019.
- Datos: `05-Diseño/Datos/rumbo.sql`. Contrato: `05-Diseño/API/openapi.json`.
