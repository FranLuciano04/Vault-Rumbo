---
tipo: referencia
estado: formalizado
responsable: equipo
modulo: M3
actualizado: 26/10/26
---
# M3 — pedido de review

tags:: #tipo/referencia #estado/formalizado #pc/pc2

> Pedido de review del módulo **M3 — Alertas** para Codex, según [[Review de módulo — rol de Codex]] y [[DEC-0014 Flujo de implementación con agentes|DEC-0014]]. Los hallazgos van en `06-Desarrollo/Reviews/M3 — review Codex.md`. El tag de cierre es `mod-3`.

## Alcance
M3 arma la agenda de `Alerta`. En el backend incluye el servicio de alertas que usan los demás módulos (crear, resolver y reabrir por origen), la agenda según el rol, la atención de alertas (marcar vista, resolver, posponer) con el progreso del día y los recordatorios manuales con su edición. Todo eso tiene contrato en `@rumbo/shared`, la agenda web con totales, panel de detalle y alta de recordatorio, la agenda mobile con chips, detalle con posponer y alta de recordatorio, y un e2e.

Revisá **solo los diffs de los merges de abajo** (`git diff <merge>^1 <merge>`). `main` ya tiene código posterior encima, así que si un archivo cambió después, el código vigente puede no ser el del merge. Si algo de M3 ya se corrigió más adelante, no lo reportes. Los hallazgos de M1 y M2 se arreglan aparte (`fix/M1-…`, `fix/M2-…`): no entran en esta review.

## Tickets y merges

| Ticket | Capa | Riesgo | Trazabilidad | Merge |
|---|---|---|---|---|
| [[T-050 Publicar el contrato de alertas]] | contrato | normal | CU-14, CU-28 | `2442e4b` Merge pull request #79 from FranLuciano04/feature/T-050-publicar-el-contrato-de-alertas |
| [[T-051 Crear el servicio de alertas para los demás módulos]] | backend | normal | CU-14, RF-073, RF-079, DEC-0013 | `1f33a84` Merge pull request #78 from FranLuciano04/feature/T-051-crear-el-servicio-de-alertas-para-los-de |
| [[T-052 Listar la agenda de alertas según el rol]] | backend | normal | CU-14, RF-074, RF-075, RF-078, RF-154 | `69ac2f1` Merge pull request #80 from FranLuciano04/feature/T-052-listar-la-agenda-de-alertas-segun-el-rol |
| [[T-053 Atender las alertas con el progreso del día]] | backend | normal | CU-14, RF-076, RF-077, RF-155 | `528e500` Merge pull request #81 from FranLuciano04/feature/T-053-atender-las-alertas-con-el-progreso-del |
| [[T-054 Crear recordatorios manuales]] | backend | normal | CU-28, RF-080, RF-081, RF-082 | `b68c86d` Merge pull request #82 from FranLuciano04/feature/T-054-crear-recordatorios-manuales |
| [[T-055 Atender la agenda del día en la web]] | web | normal | CU-14, RF-074, RF-076, RF-077, RF-078, RF-154, RF-155 | `3b5b912` Merge pull request #83 from FranLuciano04/feature/T-055-atender-la-agenda-del-dia-en-la-web |
| [[T-056 Crear un recordatorio manual en la web]] | web | normal | CU-28, RF-080, RF-081, RF-082 | `fd18cb2` Merge pull request #84 from FranLuciano04/feature/T-056-crear-un-recordatorio-manual-en-la-web |
| [[T-057 Atender la agenda del día en la app mobile]] | mobile | normal | CU-14, RF-074, RF-076, RF-155, RNF-14 | `2b5e831` Merge pull request #85 from FranLuciano04/feature/T-057-atender-la-agenda-del-dia-en-la-app-mobi |
| [[T-058 Posponer una alerta desde su detalle en la app mobile]] | mobile | normal | CU-14, RF-075, RF-077 | `e09d45e` Merge pull request #88 from FranLuciano04/feature/T-058-posponer-una-alerta-desde-su-detalle-en |
| [[T-059 Crear un recordatorio manual desde la app mobile]] | mobile | normal | CU-28, RF-080 | `cd0f2c0` Merge pull request #98 from FranLuciano04/feature/T-059-crear-un-recordatorio-manual-desde-la-ap |
| [[T-060 Probar de punta a punta la agenda de alertas]] | e2e | normal | CU-14, CU-28 | `c0757e0` Merge pull request #102 from FranLuciano04/feature/T-060-probar-de-punta-a-punta-la-agenda-de-ale |
| [[T-164 Mostrar los totales de la agenda web como en el prototipo]] | web | normal | CU-14, RF-074, RF-154 | `8f3e08d` Merge pull request #86 from FranLuciano04/feature/T-164-mostrar-los-totales-de-la-agenda-web-com |
| [[T-165 Filtrar la agenda mobile con chips como en el prototipo]] | mobile | normal | CU-14, RF-074, RF-154, RNF-14 | `6d35f36` Merge pull request #101 from FranLuciano04/feature/T-165-filtrar-la-agenda-mobile-con-chips-como |
| [[T-166 Mostrar el detalle de la alerta en un panel lateral de la agenda web]] | web | normal | CU-14, RF-075, RF-076, RF-077 | `b69a009` Merge pull request #89 from FranLuciano04/feature/T-166-mostrar-el-detalle-de-la-alerta-en-un-pa |

Los 14 merges suman 93 archivos distintos (+14.468 / −563 líneas, con las notas de tickets incluidas). M3 no agrega migraciones: la tabla `alerta` viene del esquema inicial (`0001`).

## Archivos tocados por el módulo
Unión de `git diff --name-only <merge>^1 <merge>` de los 14 merges, sin las notas de tickets ni el grafo.

**Backend (`src/backend/`)**
- Núcleo: `rumbo/main.py`, `rumbo/core/fechas.py`.
- Datos: `rumbo/datos/repositorios/{alertas,clientes}.py`, `rumbo/datos/semillas/{__init__,alertas}.py`.
- Negocio: `rumbo/negocio/estados/{__init__,alerta}.py`, `rumbo/negocio/politicas.py`, `rumbo/negocio/servicios/alertas.py`.
- Presentación: `rumbo/presentacion/{contrato,openapi}.py`, `rumbo/presentacion/esquemas/{alertas,comunes}.py`, `rumbo/presentacion/routers/alertas.py`.
- Tests: `tests/api/test_{alertas,contrato_m3,recordatorios}.py`, `tests/negocio/test_{alertas,semilla_alertas}.py`.

**Contrato compartido (`src/packages/shared/`)**
- `openapi.json`, `src/tipos.gen.ts`, `src/index.ts`, `src/alertas.ts`, `src/errores.ts`, `src/etiquetas.ts`, `src/modelos.ts`.
- Esquemas: `src/esquemas/{index,alertas}.ts`.
- Hooks: `src/hooks/{index,alertas,useDebouncedValue,useResolverConDeshacer,useTotalesAgenda}.ts`.
- Mocks: `src/mocks/{index,alertas}.ts`.
- Tests: `src/hooks/{alertas,useDebouncedValue,useResolverConDeshacer}.test.ts`, `src/mocks/alertas.test.ts`.

**Web (`src/apps/web/`)**
- `src/app/{App,SeccionAgenda}.tsx` (test `App.agenda.test.tsx`).
- `src/features/alertas/`: `PaginaAgenda.tsx`, `FilaAlerta.tsx`, `FiltroResponsable.tsx`, `FormularioPosponer.tsx`, `FormularioRecordatorio.tsx`, `AsociarCliente.tsx`, `PanelDetalleAlerta.tsx`, `avisoRecordatorio.ts`, `fechas.ts`, `useResolverConDeshacer.ts`, `useTotalesAgenda.ts` (los dos últimos se movieron luego a shared) y sus tests (`PaginaAgenda`, `.detalle`, `.recordatorio`, `.totales`, `FormularioRecordatorio`, `useResolverConDeshacer`).
- Clientes: `src/features/clientes/{FichaCliente,PaginaClientes}.tsx` (recordatorio desde la ficha, test `FichaCliente.recordatorio.test.tsx`).
- Compartido: `src/lib/{errores,useVolverFoco}.ts`.
- e2e: `e2e/alertas.spec.ts`, `e2e/seguridad.spec.ts`.

**Mobile (`src/apps/mobile/`)**
- Rutas: `app/(pestanas)/agenda.tsx`, `app/(pestanas)/agenda/{_layout,index,[id],nuevo}.tsx`.
- `src/features/alertas/{AgendaMobile,ChipsAgenda,DetalleAlertaMobile,NuevoRecordatorioMobile}.tsx`, `src/features/clientes/NuevoClienteMobile.tsx`.
- Componentes: `src/componentes/{MensajeError,Opcion}.tsx`. `package.json` (selector de calendario nativo de T-059) y `src/pnpm-lock.yaml`.
- Tests: `__tests__/{agenda,agenda.chips,detalleAlerta,navegacion,recordatorio}.test.tsx`.

**Notas de diseño:** T-054 enmendó [[DEC-0005 Autenticación y modelo de roles|DEC-0005]] (25/10/26): `admin`/`dueño` atienden alertas ajenas, pero solo el propietario edita un recordatorio manual.

## Puntos que conviene mirar entre tickets
1. **Visibilidad y permisos (T-052, T-053, T-054, DEC-0005 enmendada).** `empleado` y `freelance` ven solo sus alertas; `admin`/`dueño`, todas. Revisá que el filtro de `visibilidad(actor)` se aplique en **cada** lectura y escritura: agenda, `GET /alertas/{id}`, marcar vista, resolver, posponer, editar y progreso del día. Una alerta ajena tiene que dar 404 a quien no la ve. Editar un recordatorio ajeno: 403 para `admin`/`dueño` (`exigir_escritura`), 404 para el resto. Que el filtro por responsable de la agenda (`FiltroResponsable`) no le permita a un empleado ver la agenda de otro pasando el parámetro a mano.
2. **Asociar un recordatorio (T-054, T-056, T-059).** `crear_recordatorio` busca el `Cliente`, la `Oportunidad` o el `Viaje` con la visibilidad del actor. Revisá qué pasa si llegan varios ids a la vez (hoy gana el primero sin avisar), si un id ajeno responde igual que uno inexistente, y que el contexto devuelto (nombre del cliente, etc.) no filtre datos de otro asesor.
3. **Estados de la alerta (T-051, T-053, `negocio/estados/alerta.py`).** Transiciones válidas: pendiente → vista → resuelta, posponer solo pendiente y a fecha futura (día de Argentina), reabrir. La alerta de pago no se resuelve a mano (409). Que el editar de un recordatorio respete «solo pendiente» y que posponer una vista se trate igual en backend, web y mobile.
4. **API para otros módulos (T-051, RF-079, DEC-0013).** `crear`, `resolver_de_origen` y `reabrir_de_origen` los van a usar M4 a M7. Revisá: `_con_id` (un origen sin id no tiene que alcanzar alertas ajenas), que sin `tipos` no se cierren los recordatorios manuales (RN-08), el flag `cerrada_por_cancelacion` y que `reabrir_de_origen(solo_por_cancelacion=True)` no reabra las resueltas a mano (CU-27 A3). Si hace falta idempotencia para el proceso diario (no duplicar la misma alerta del mismo origen y fecha), decir si hoy está o queda para M7.
5. **Fechas y zona horaria (T-053, `core/fechas.py`).** El día de negocio es el de Argentina. Revisá `hoy()` y `limites_del_dia` contra `resuelta_en` en UTC, el progreso del día cerca de la medianoche, y que web (`features/alertas/fechas.ts`) y mobile calculen «hoy», «vencidas» y la fecha mínima de posponer igual que el backend.
6. **Progreso y totales (T-053, T-164, T-165, RF-154, RF-155).** El total del día son las resueltas hoy más las pendientes y vistas con fecha `<= hoy`. Revisá que `useTotalesAgenda` (movido de web a shared en T-165) no recalcule distinto del backend, y que los chips mobile y los totales web cuenten lo mismo con el filtro por responsable activo.
7. **Resolver con deshacer (T-055, T-057, `useResolverConDeshacer`).** Se movió de web a shared en T-057. Revisá la carrera entre resolver y deshacer (deshacer antes de que llegue la respuesta, dos resoluciones seguidas, desmontar la pantalla con el temporizador vivo) y que la reapertura use un endpoint que el backend permita al mismo rol.
8. **Contrato backend ↔ shared ↔ web ↔ mobile (T-050 y los tickets de front).** Que `openapi.json` y `tipos.gen.ts` coincidan con `esquemas/alertas.py`. Que `mocks/alertas.ts` responda los mismos códigos y cuerpos que el backend real (404 por ajena, 403 al editar ajena, 409 por alerta de pago o automática, 422 por fecha pasada), porque web y mobile se desarrollaron contra los mocks. Que `hooks/alertas.ts` invalide agenda, detalle y progreso después de cada mutación. `src/errores.ts` en shared y `lib/errores.ts` en web cambiaron en T-056 y T-057: que el mapeo de errores siga igual para M1 y M2.
9. **Cambios fuera de alertas.** T-059 movió `useDebouncedValue` a shared y tocó `NuevoClienteMobile.tsx` y `PaginaClientes.tsx`; T-060 agregó `buscar_por_contacto` en el repositorio de clientes (sin filtro de visibilidad, «solo para semillas»): confirmá que no lo use ninguna ruta. T-052 agregó `es_direccion` en `politicas.py`, que reutiliza la visibilidad de redes.
10. **Mobile (T-057, T-058, T-059, T-165, RNF-14).** Mismas validaciones que la web en posponer y en el alta del recordatorio. El selector de calendario nativo nuevo (`package.json`): fecha mínima, zona horaria del dispositivo y accesibilidad. Los chips con VoiceOver/TalkBack (rol y estado seleccionado).
11. **Semilla (T-060, `semillas/alertas.py`).** Idempotente, sin datos inventados del negocio y que no cree alertas sobre clientes de otro asesor.
12. **Tests.** Permisos por rol de cada ruta de alertas sin test, sobre todo `empleado` y `freelance` contra alertas ajenas. Tests que pasarían con una implementación incorrecta (por ejemplo, de fechas que no fijan la hora). Que el e2e de T-060 recorra el backend real y no los mocks.

## Especificación de referencia
- [[CU-14 Ver y atender alertas del día]], [[CU-28 Crear recordatorio manual]]. Tocan de costado [[CU-27 Cancelar viaje]] y [[CU-09 Armar itinerario de hoteles]] (cierre automático de las alertas de pago).
- Requisitos: RF-073 a RF-082, RF-154, RF-155 en `02-Analisis/Requisitos funcionales.md`; RNF-14.
- Decisiones: DEC-0005 (con la enmienda del 25/10/26), DEC-0013, DEC-0019.
- Datos: `05-Diseño/Datos/rumbo.sql`. Contrato: `05-Diseño/API/openapi.json`.
