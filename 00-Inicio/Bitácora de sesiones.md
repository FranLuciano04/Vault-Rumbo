---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 17/09/26
---
# Bitácora de sesiones

tags:: #tipo/referencia #estado/formalizado

> Registro cronológico **breve** de cada sesión de trabajo (una entrada por sesión, la más reciente arriba). Es la memoria compartida de "qué se hizo": el vault, no la memoria privada de cada Claude.
>
> **Cómo usarla:** al cerrar la sesión, agregar una entrada corta según [[CLAUDE|CLAUDE.md#Cómo cerrar cada sesión]]. No copiar contenido: enlazar a notas, `DEC-` y commits. Complementa a [[Estado del proyecto]] (que es la foto actual y se mantiene corta).

## Quién es quién (identidad Git)
La **persona** de cada sesión es quien la corre, identificada por su identidad Git (`git config user.name`). Al iniciar sesión, Claude la reconoce y saluda por nombre (ver [[CLAUDE|CLAUDE.md#Cómo entrar en contexto]]).

| Integrante | `user.name` de Git |
|---|---|
| Francisco | `FranLucianoo` |
| Paloma | `palomap2003` |
| Nahuel | `Nahuel Viniegra` |

## Avisos pendientes por persona
> Claude los lee al identificar a la persona (paso 1 de `CLAUDE.md`) y se los cuenta **apenas la saluda**, antes de cualquier otra tarea. Cuando la persona confirme que lo leyó o que lo hizo, **Claude borra su fila** en esa misma sesión, con un commit. Cuando no quede ninguna fila de alguien, se borra también su sección.

### Nahuel (`Nahuel Viniegra`) — cerrar M1 y M2 con la review de Codex
- **25/10, de Francisco: M1 y M2 tienen todos sus tickets hechos y mergeados** (`tickets.mjs modulo M1` y `modulo M2` dan ✅). Falta el cierre formal, que hacés vos porque te encargás de las reviews con Codex:
  - Correr `/cerrar-modulo M1` y `/cerrar-modulo M2`, que arman el pedido de review para Codex.
  - Arreglar los hallazgos confirmados en ramas `fix/…` (DEC-0019).
  - Con la aprobación del equipo, poner los tags `mod-1` y `mod-2`. Hoy solo existe `mod-0`.

### Nahuel (`Nahuel Viniegra`) — el repo es público
- **25/10, de Francisco: el repo [Vault-Rumbo](https://github.com/FranLuciano04/Vault-Rumbo) pasó a público.** GitHub Actions se había cortado porque se terminaron los minutos del plan Free; en los repos públicos los minutos son ilimitados.
  - Antes se escaneó todo el historial, incluidas las ramas de los PR, y no hay secretos.
  - Quedan visibles sus nombres y emails: los de los commits, y el de Paloma también en los metadatos de dos docx. Si quieren, activen *Keep my email addresses private* en GitHub y usen el email `noreply` en los commits nuevos.
  - Nunca subir un `.env` ni una clave: ahora cualquiera lo vería al instante.

### Nahuel (`Nahuel Viniegra`) — DEC-0019 y fallas de entorno local
- **24/10, de Paloma: [[DEC-0019 Las fallas se arreglan al encontrarlas|DEC-0019]]**, la decisión que tomamos en equipo. Una falla se arregla cuando se encuentra, sin crear un ticket:
  - si aparece durante un ticket, en su misma rama y PR;
  - si no, en una rama `fix/…`;
  - los hallazgos de Codex también se arreglan así.
  - Ya están actualizadas `/implementar-ticket` 1.4.0 y `/cerrar-modulo` 1.1.0.
- **24/10, de Paloma: el PR [#65](https://github.com/FranLuciano04/Vault-Rumbo/pull/65) ya está mergeado** (lo aprobó y mergeó Nahuel). Arregla las cuatro fallas para ver Rumbo en local. Después del pull:
  - `pnpm dev` ya llega a la API; el destino se cambia con `RUMBO_API_PROXY` en `apps/web/.env`.
  - Para el compose contra el Firebase real se usa `-f src/docker-compose.firebase.yml`, con `RUMBO_FIREBASE_CREDENCIALES` en `src/.env`, y se publica en el 5173 (`RUMBO_HTTP_PORT=5173`). No se amplía la restricción de la API key (ver `src/infra/firebase.md`).

### Nahuel (`Nahuel Viniegra`) — T-153
- **24/10, de Paloma: el PR [#73](https://github.com/FranLuciano04/Vault-Rumbo/pull/73) (T-153) ya está mergeado** (⚠️ riesgo alto, auth). Hay un **cambio de decisión**: el 23/10 Francisco había decidido que la cuenta de Firebase sin `Usuario` se reutilizaba. La review de seguridad lo marcó como bloqueante (*pre-account hijacking*: la cuenta conserva la contraseña, los proveedores o las sesiones de quien la haya creado). Paloma decidió que esa cuenta se **borra y se crea una nueva**. CU-25 A1 se actualiza en el mismo PR. Además, el alta toma un lock por email, y nunca se borra una cuenta cuyo uid es de un `Usuario`.

## Formato
Es **obligatorio** nombrar a la persona que hizo la sesión.
```
## dd/mm/aa — <persona> (<modelo>)
- **Hecho:** …
- **Commits:** <hash>, <hash>
- **Pendiente:** …
```

## 25/10/26 — Francisco (Claude Opus 5.5) — T-050 y T-052: contrato y agenda de alertas
- **T-050** (PR [#79](https://github.com/FranLuciano04/Vault-Rumbo/pull/79), mergeado con el CI en verde): el contrato de alertas.
  - Son 8 rutas stub (501) con tipos, hooks y mocks MSW. Los mocks respetan EST-Alerta e incluyen alertas de otro responsable.
  - Se agregó el filtro `propietario_id`.
  - `Alerta` compone `Auditoria` con `allOf`, como el PC1. Queda como convención para los esquemas nuevos.
  - Review (opus): 0 bloqueantes y 4 importantes, todos arreglados o pasados a T-052.
- **T-052** (PR [#80](https://github.com/FranLuciano04/Vault-Rumbo/pull/80), mergeado con el CI en verde): la agenda según el rol.
  - **Decisión:** admin y dueña ven toda la agencia por defecto. Lo piden CU-14 A1 y la pantalla 49, que tienen más autoridad que el texto que se había derivado del contrato. Por eso se quitó `todas`.
  - `Alerta` trae `responsable` y `contexto` (cliente, oportunidad, viaje y pago con su moneda), filtrados por la visibilidad de quien pide.
  - Review (opus) en dos rondas. La primera encontró 1 bloqueante: el contexto le mostraba al freelance datos ajenos. Está arreglado.
  - Backend: 1107 tests, con 96,88 % de cobertura.
- **PR #76** (la última dueña): **lo aprobó y mergeó Nahuel.**
- **Notas en tickets futuros:**
  - T-053: el endpoint bloquea la alerta.
  - T-099: cómo resolver y reabrir las alertas por cancelación.
  - T-110 y T-113: la descripción no lleva datos del origen.
- **Commits de T-050:** b7a25e0, 4f026c9, b8b27e7 y e342f41.
- **Commits de T-052:** 06ea836, a3a4c35, ab50639, 90b878c, 6af5a4f y 8167d2c.
- **T-053** (PR [#81](https://github.com/FranLuciano04/Vault-Rumbo/pull/81), mergeado con el CI en verde): atender las alertas.
  - `vista`, `resolver` y `posponer` leen la alerta con `FOR UPDATE`.
  - La alerta de pago no se resuelve a mano: da 409 con el motivo según el origen (cobro o pago al proveedor).
  - El progreso del día va en hora de Argentina: el de toda la agencia para admin y dueña, el propio para el resto.
  - Review (opus): 0 bloqueantes, 0 importantes y 6 menores, de los que se arreglaron 5.
  - Backend: 1134 tests, con 96,93 % de cobertura.
  - Commits: 1fdfaba, c7fbacd, eb5c56e, a599825 y 3131a11.
- **T-054** (PR [#82](https://github.com/FranLuciano04/Vault-Rumbo/pull/82), mergeado con el CI en verde): recordatorios manuales.
  - Un recordatorio se asocia a un registro que la persona puede ver; si no lo ve, da 404.
  - Solo se edita un recordatorio `manual` y `pendiente`, y solo lo edita su propietario.
  - **Decisión de Francisco, registrada como enmienda de DEC-0005:** admin y dueña *atienden* las alertas ajenas (vista, resolver, posponer), pero no *editan* el texto ni la fecha de un recordatorio ajeno (403).
  - `resolver_de_origen` ya no cierra los recordatorios `manual` (RN-08).
  - Review (opus): 0 bloqueantes, 2 importantes y 4 menores, todos arreglados.
  - Backend: 1160 tests, con 96,95 % de cobertura.
  - Commits: 87741a2, c4d5b1e, d7ace0b y 38e94cf.
- **El backend de M3 quedó completo:** ya no queda ninguna ruta de alertas en 501.
- **T-055** (PR [#83](https://github.com/FranLuciano04/Vault-Rumbo/pull/83), mergeado con el CI en verde): la agenda del día en la web.
  - Es la página de inicio y muestra el progreso del día.
  - Pestañas: Pendientes (dividida en Atrasadas y Hoy) y Próximas.
  - Tiene el switch «Mostrar vistas» y filtros por tipo y, para la dirección, por responsable.
  - Resolver tiene «Deshacer» (5 s). Posponer solo se ofrece en las pendientes.
  - Muestra el contexto con el pago y su moneda, y pagina de a 100.
  - Review (opus) en dos rondas. La primera encontró 1 bloqueante (la agenda cortaba en 20 alertas sin avisar) y tests que pasaban por casualidad. Todo quedó arreglado.
  - Web: 341 tests, con 94,84 % de cobertura.
  - Commits: 52eda3f, b6a9648, 207cbbe, 1840699 y 3ff96b1.
- **T-056** (PR [#84](https://github.com/FranLuciano04/Vault-Rumbo/pull/84), mergeado con el CI en verde): recordatorios en la web.
  - El formulario sirve para crear y para editar. Se abre desde la agenda, con el selector «Personal / Cliente» y buscador, o desde la ficha del cliente, con el cliente ya asociado.
  - «Editar» solo aparece en un recordatorio propio y pendiente.
  - El foco va al formulario al abrirlo y vuelve al botón al cerrarlo. Al guardar aparece un aviso.
  - Un 404 se muestra con un texto propio del front en todos los formularios.
  - Review (opus): 0 bloqueantes y 3 importantes, todos arreglados.
  - **Falla arreglada (DEC-0019):** el e2e de login era frágil (`getByText` del nombre en toda la página) y falló por el filtro «Responsable» de T-055. Ahora busca dentro del `banner`.
  - Web: 368 tests.
  - Commits: 6494872, 8867bca, 76db10c, aae5226, el del e2e y e2d8ca9.
- **T-057** (PR [#85](https://github.com/FranLuciano04/Vault-Rumbo/pull/85), mergeado con el CI en verde): la agenda en mobile.
  - Muestra las secciones Atrasadas y Hoy con el contexto de cada alerta, y el progreso del día.
  - La lista se carga de a páginas (`useAlertasPorPaginas`, con «Ver más»).
  - Resolver tiene «Deshacer», y la resolución se envía igual si la app pasa a segundo plano.
  - Admin y dueña ven toda la agencia, con el responsable de cada alerta. Tiene accesibilidad en Android e iOS.
  - La lógica que comparte con la web pasó a `@rumbo/shared`.
  - Review (opus) en dos rondas. La primera encontró 1 bloqueante: la lista se cortaba a las 100 alertas, como en la web. La segunda encontró 1 importante: una carrera de «Ver más» con la recarga. Las dos quedaron arregladas.
  - Mobile: 125 tests, con 97,71 % de cobertura.
  - Commits: d6f4a64, edb11b9, b303b81, 835ad2e, 8681deb y 6f3dba0.
- **Pendiente:** T-058 (posponer desde el detalle en mobile), T-059 (recordatorio en mobile) y el e2e T-060. Después, `/cerrar-modulo M3`.

## 25/10/26 — Francisco (Claude Opus 5.5) — tres decisiones abiertas cerradas y dos arreglos
- **Decisiones** (commit 15abf2d):
  1. **CU-25 A5:** se protege a la última `dueño` activa.
  2. **[[DEC-0020 Cliente traído por dos asesores|DEC-0020]]** (formalizada): si dos asesores traen al mismo cliente, cada uno conserva su registro y la dueña o un admin reasigna el asesor. No cambia el código.
  3. **CU-02 A1:** si se edita el formulario después del aviso de duplicado, hay que volver a chequear.
- **`fix/ultima-duena`** (PR [#76](https://github.com/FranLuciano04/Vault-Rumbo/pull/76), ⚠️ riesgo alto, **espera la aprobación de Paloma o Nahuel**): el 409 cubre al último admin y a la última dueña. Admins y dueñas activos se bloquean en una sola consulta ordenada por id.
  - La review de seguridad (sonnet) no encontró bloqueantes ni importantes.
  - Backend: 961 tests en verde, con 96,47 % de cobertura. El CI está en verde.
  - Commits: d98af10, 241e8b5 y 59332e6.
- **`fix/duplicado-tras-editar`** (PR [#77](https://github.com/FranLuciano04/Vault-Rumbo/pull/77), mergeado con el CI en verde): en la web y en mobile, cualquier edición después del aviso lo oculta.
  - La review (opus) encontró un hallazgo importante: un 409 que llegaba después de editar con el alta en vuelo mostraba el aviso viejo. Se arregló con un contador de ediciones.
  - Web: 303 tests, con 95,37 % de cobertura. Mobile: 95 tests, con 97,14 %.
  - Commits: 0912f48, 3f4a103, d1b63b1 y 48b0b58 (merge).
- **T-051** (PR [#78](https://github.com/FranLuciano04/Vault-Rumbo/pull/78), mergeado con el CI en verde): el servicio de alertas para los demás módulos.
  - Los estados siguen EST-Alerta.
  - Ofrece `crear`, `resolver_de_origen(…, tipos=, por_cancelacion=)` y `reabrir_de_origen(…, solo_por_cancelacion=)`. Bloquea las filas con `FOR UPDATE`.
  - Posponer se compara contra la fecha más tardía entre la de la alerta y hoy, en hora de Argentina.
  - Review (opus) en dos rondas. La primera encontró 1 bloqueante: un origen sin `id` resolvía alertas de toda la empresa. También 4 importantes, todos arreglados.
  - Notas en T-053 y T-099 para los tickets que siguen.
  - Backend: 997 tests y 96,54 % de cobertura.
  - Commits: da54b4b, d4faf0a, 832d299, a31b35c, c4a90d6 y c26d93c.
- **Pendiente:** mergear el #76 cuando lo aprueben y seguir con M3. T-051 destrabó 26 tickets.

## 25/10/26 — Francisco (Claude Opus 5.5) — T-048: alta de clientes en mobile; repo público
- **Hecho:** T-048 (PR [#75](https://github.com/FranLuciano04/Vault-Rumbo/pull/75), mergeado con el CI en verde). **M2 queda completo y listo para `/cerrar-modulo`.**
  - Desde la pestaña Clientes, «Nuevo cliente» abre `/clientes/nuevo`. Valida los datos mínimos, muestra el aviso de duplicado con «Ir al cliente existente» o «Confirmar alta», y el `freelance` no ve el selector de asesor. Tras el alta se abre la ficha.
  - Desvío del prototipo (pantalla 58): un solo campo `contacto`, como en la web.
  - Review Opus: 0 bloqueantes, 1 importante y 3 menores. Se arreglaron todos menos uno, anotado en el ticket: «Confirmar alta» después de editar no vuelve a pasar por el chequeo de duplicados (la web hace lo mismo).
- **Checks:** mobile tiene 89 tests y 96,99 % de cobertura; lint y typecheck en verde. El CI del PR dio verde, con los e2e.
- **CI cortado por facturación:** GitHub Actions dejó de correr («recent account payments have failed or your spending limit needs to be increased»), porque se gastaron los minutos del plan Free.
  - Francisco **pasó el repo a público** para tener minutos ilimitados.
  - Antes se escaneó todo: gitleaks y trufflehog sobre todos los commits y las ramas de los 75 PR, el texto de los 114 docx, pptx y pdf de la historia, los PR y los workflows. **No hay secretos.** El único hallazgo fue un falso positivo en `uv.lock`.
  - Quedan públicos los nombres y emails del equipo (en los commits y los metadatos de los docx) y los links a la carpeta de Drive del PC1 y al Figma.
- **Commits:** 71f7eeb (aviso), 7b67402, 00e4150, b1c821a, fda7c5f, 53e2e83, 6efeb38, 1c18854 (merge del PR), d7c6417 (grafo) y el de esta entrada.
- **Pendiente:**
  - `/cerrar-modulo M2`.
  - Revisar los permisos de la carpeta de Drive y del archivo de Figma.
  - Avisarle a la agencia que el repo es público.

## 24/10/26 — Nahuel (Claude Opus 5.5) — T-047: clientes en la app mobile
- **Hecho:** T-047 (PR [#72](https://github.com/FranLuciano04/Vault-Rumbo/pull/72), mergeado con el CI en verde). Se tomó T-047 porque T-153 ya lo tenía Paloma.
  - **Lista:** la pestaña Clientes tiene búsqueda, scroll paginado y botón «Reintentar».
  - **Ficha:** `/clientes/[id]` muestra datos, historial y las acciones Llamar, WhatsApp y Enviar email.
  - **`no_recontactar`:** solo muestra la etiqueta «No incluir en recontactos» y no bloquea el contacto (Glosario, CU-30).
  - **Movido a `@rumbo/shared`:** `formatearFecha`, `formatearImporte` y las etiquetas de segmento y estado, que salieron de la web. También se agregaron `normalizarTelefonoAR` y `enlaceLlamada`.
  - **Review Opus:** dos rondas. 1 bloqueante, 5 importantes y 5 menores, todos arreglados. El chip «Mis clientes / Toda la agencia» quedó fuera de alcance.
- **Checks:** shared, web (304 tests, 94,2 %) y mobile (65 tests, 97,2 %), con lint y typecheck en verde. CI del PR en verde.
- **Commits:** d476ebc, c21fc59, 9cad9bb, 59e6404, 2dbb2dd, 49e00dd, 2ea4856 (merge de main), b20818b (merge del PR), b84c8f4 (grafo) y el de esta entrada.
- **Arreglo posterior (DEC-0019):** el PR [#74](https://github.com/FranLuciano04/Vault-Rumbo/pull/74), de la rama `fix/mobile-reintento-4xx`, ya está mergeado con el CI en verde.
  - Mobile dejó de reintentar los 4xx, así que una ficha 404 ahora se muestra enseguida.
  - `crearQueryClient()` pasó de la web a `@rumbo/shared/query`, un subpath propio para no chocar con el mock de `./hooks`. Lo usan las dos apps.
  - La review de Opus encontró 2 hallazgos menores y se arreglaron. `consultaYo` conserva su propio `retry` porque cambiarlo toca auth y lo volvería de riesgo alto.
  - Commits: 77bcfa8, 9cc5210, 83da2b8 y 3b2b43f (el merge).
- **Pendiente:**
  - Contrastar los textos con las pantallas 57 y 36 del prototipo.
  - Para cerrar M2 falta T-048.

## 24/10/26 — Francisco (Claude Opus 5.5) — T-049: e2e de clientes y semilla de demo
- **Hecho:** T-049 (PR [#71](https://github.com/FranLuciano04/Vault-Rumbo/pull/71), mergeado con el CI en verde).
  - **e2e:** `e2e/clientes.spec.ts` prueba contra el sistema real tres casos. El alta con duplicado y «Confirmar alta» (RF-003). Que el freelance vea los suyos y reciba 404 por un cliente ajeno (RF-151). Y que no se guarde un contacto inválido (RF-007).
  - **Semilla:** `datos-iniciales --demo` ahora también carga 4 clientes ficticios, asignados a los usuarios de demo de M1.
  - `elegirContrasena` pasó a `e2e/compose.ts`.
  - **Falla arreglada en la rama (DEC-0019):** la web reintentaba 3 veces los 4xx, así que una ficha 404 tardaba unos 7 s. Ahora `crearQueryClient()` (`apps/web/src/lib/queryClient.ts`) no los reintenta.
  - **Review Opus:** 0 bloqueantes, 0 importantes y 3 menores, anotados en el ticket. El de mobile, que tiene el mismo bug, se sumó a las notas de T-047.
- **Checks:** backend 945 tests (96,9 %), web 315 (94,4 %), ruff, mypy, lint, typecheck, build y e2e en verde.
- **Commits:** dbe88bb, 92a2947, fa77092, 09c775c, 338021d, fbb968c, cc1d187 (merge del PR), 1fc5277 (grafo) y el de esta entrada.
- **Pendiente:** para cerrar M2 faltan T-047 y T-048 (mobile). Para cargar los clientes de demo en la base local, volver a correr `datos-iniciales --demo`, que es idempotente.

## 24/10/26 — Francisco (Claude Opus 5.5) — T-045: alta de clientes en la web
- **Hecho:** T-045 (PR [#69](https://github.com/FranLuciano04/Vault-Rumbo/pull/69), mergeado con el CI en verde).
  - En el listado de Clientes hay un botón «Registrar cliente» que abre `/clientes/nuevo`.
  - El alta valida los datos mínimos y el Instagram es opcional.
  - Hay selector de asesor, salvo para el `freelance`.
  - Ante un posible duplicado se ven los candidatos, con «Ir al cliente existente» o «Confirmar alta». El `freelance` ve el aviso de CU-02 A1 sin datos ajenos.
  - Tras el alta se abre la ficha.
  - **Review Opus:** 2 importantes y 1 menor, arreglados:
    - «Confirmar alta» reenviaba los datos viejos.
    - El 422 del asesor no se mostraba; también pasaba en la ficha.
    - El aviso pasó a un texto neutro.
  - Se aceptan desvíos del prototipo: página en vez de panel, un solo campo de contacto y sin etiquetas en el alta.
  - Se borró a Francisco de los avisos de DEC-0019 y del PR #65 (`ee512b7`).
  - **Para ver la app en local con el Auth Emulator, sin tocar los `.env`:**
    - el emulador (`src/infra/firebase.md`);
    - la API, con `ENTORNO=desarrollo FIREBASE_PROJECT_ID=demo-rumbo FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`;
    - la web, con las `VITE_FIREBASE_*` de `.env.example` y `VITE_FIREBASE_AUTH_EMULATOR_URL`;
    - la cuenta `duena@rumbo.test` / `Clave-de-prueba-1`, creada con `signUp` y `datos-iniciales --demo`.
- **Checks:** web 308 tests (94,3 %), lint, typecheck, build y e2e en verde.
- **Commits:** 4a165d8, e9145f7, 08a013a, 0a19f7f, afd595c, 34261fd (merge del PR), 9da471e (grafo) y el de esta entrada.
- **Pendiente:** en M2 quedan T-047 (mobile) y los tickets que destraba T-045.

## 24/10/26 — Nahuel (Claude Opus 5.5) — T-147: comisión de un usuario dado de baja
- **Hecho:** T-147 (PR [#68](https://github.com/FranLuciano04/Vault-Rumbo/pull/68), mergeado con el CI en verde). Tres tests de caracterización de RF-083 en `tests/api/test_comision.py` fijan la decisión del 22/10/26 de CU-13: usuario inactivo, el propio admin y la dueña pueden tener comisión por defecto. Validados con tres mutaciones temporales del servicio. Review Opus sin hallazgos.
  - Se iba a hacer también T-146, pero lo tomó Paloma (14:40).
- **Checks:** backend 937 tests (96,9 %), ruff y mypy.
- **Commits:** 307fffe, 00fa3e2, cc81c7a (merge del PR), 63c4c2c (grafo) y el de esta entrada.
- **Pendiente:** en M1 quedan T-146 (Paloma) y T-153 (riesgo alto); después, `/cerrar-modulo`.

## 24/10/26 — Nahuel (Claude Opus 5.5) — T-038: e2e de la configuración y semilla de demo de M1
- **Hecho:** T-038 (PR [#66](https://github.com/FranLuciano04/Vault-Rumbo/pull/66), mergeado con el CI en verde). `e2e/configuracion.spec.ts` prueba contra el sistema real el alta de un empleado que inicia sesión y no ve Configuración (RF-144), destino con requisito, baja y reactivación (RF-089), operador duplicado (RF-094) y comisión (RF-083). `datos-iniciales --demo` carga la semilla de M1: 3 destinos con requisitos, 2 operadores y 2 usuarios de demo.
  - **Decisiones de Nahuel:** usuarios de demo con `firebase_uid` ficticio (no inician sesión); se actualizó el test de M0 que exigía `SEMILLAS == []`.
  - **Review Opus:** 1 importante (idempotencia por nombre exacto, contra índices normalizados) y 2 menores, arreglados.
  - RF-094 falló una vez en el login de la dueña en la primera corrida local; `ingresar` ahora deja diagnóstico. La alternativa con `storageState` está anotada en el ticket.
- **Checks:** backend 934 tests (96,9 %), ruff, mypy, lint y typecheck web, e2e 4/4.
- **Commits:** ef03b1a, 005e69c, 1b7e680, 989e51b, d1503cd (merge del PR), aa6e164 (grafo) y el de esta entrada.
- **Pendiente:** quedan T-146, T-147 y T-153 en M1; cuando estén hechos, M1 puede pasar por `/cerrar-modulo` (review de Codex).

## 24/10/26 — Nahuel (Claude Opus 5.5) — T-037: operadores en la web
- **Hecho:** T-037 (PR [#64](https://github.com/FranLuciano04/Vault-Rumbo/pull/64), mergeado con el CI en verde). La pestaña Operadores de Configuración tiene listado con inactivos, alta, edición, baja con confirmación y reactivación, y muestra el 409 en el formulario (CU-31, RF-093/094). También se sumó la nota de T-035: el nombre de un usuario se puede corregir al editarlo (RF-147).
  - Sin la columna «Viajes» ni el campo «Ejecutivo de cuentas» del prototipo, porque no están en el contrato.
  - **Review Opus:** 1 importante (la confirmación de baja no quedaba fijada en los tests), arreglado; 1 menor anotado en el ticket (`darDeBaja.error ?? reactivar.error`, mismo patrón que destinos).
  - El primer CI falló porque T-046 movió `errores` y `CampoFormulario`: se trajo `main` y se corrigieron los imports.
- **Checks:** web 285 tests, cobertura 94,3 %, lint, typecheck y build en verde.
- **Commits:** a82610f, a508b30, 10367df, e7a1148, ad37be1 (merge de main), 7b09780, 1ba418a (merge del PR), e1e8b29 (grafo) y el de esta entrada.
- **Pendiente:** nada del ticket. Nahuel confirmó el aviso de T-046; queda solo para Paloma.

## 24/10/26 — Francisco (Claude Opus 5.5) — T-046: ficha editable del cliente en la web
- **Hecho:** T-046 (PR #63, mergeado). La ficha en `/clientes/:id` muestra:
  - los datos, el perfil y el historial, con un estado vacío por sección;
  - la edición en línea con PATCH parcial, 422 en el campo, etiquetas editables y el aviso «Ficha actualizada»;
  - el 404 de un cliente inexistente.
- **Decisiones de Francisco:**
  - Las etiquetas se editan en la ficha.
  - El empleado reasigna el asesor (RF-007), resuelto dentro del ticket: `Cliente.asesor` con nombre y `GET /usuarios/asesores` (el freelance recibe 403).
  - Un asesor de baja figura como «(de baja)».
- **Review Opus, en dos rondas:**
  - Primera ronda: 4 importantes y 6 menores, arreglados.
  - Segunda ronda, sobre el fix: 2 menores, que quedan anotados en el ticket.
- **Checks:** backend 927 tests (96,8 %), web 255, shared 110 y mobile en verde. Se integró `main` (T-043) resolviendo un conflicto en `test_clientes.py`: se conservaron los tests de los dos.
- **Commits:** 4ec0370, 41ddcb2, 9593781, d84393d, 35e55c1, 8ba3f52, 56f34ef (merge de main), bf6b493 (merge del PR), 4715c49 (grafo) y el de esta entrada.
- **Pendiente:** las cuatro fallas para levantar Rumbo en local. Hay avisos de T-046 para Nahuel y Paloma.

## 24/10/26 — Paloma (Claude Opus 5.5) — T-153 cuentas de Firebase sin usuario
- **Hecho:**
  - **T-153** quedó implementado. El PR [#73](https://github.com/FranLuciano04/Vault-Rumbo/pull/73) espera la aprobación de otro integrante (riesgo alto).
  - La review de seguridad marcó como **bloqueante** reutilizar la cuenta huérfana (*pre-account hijacking*). **Decisión de Paloma:** se borra y se crea una nueva. Así se cambió la decisión de Francisco del 23/10 y CU-25 A1 se actualiza en el PR.
  - Se sumaron un lock por email contra altas simultáneas y la regla de no borrar nunca la cuenta de un `Usuario` existente (2.ª review).
  - La suite completa da 946 pasados y 6 skipped. Cobertura: 99 % en `negocio/`.
- **Commits:** 788f82e (rojo), 42b5bd9 (verde), 2ef3378 y dca4505 (fixes), c1f6c79 (hecho) y el de esta entrada.
- **Pendiente:** aprobación del PR #73 y después el merge.

## 24/10/26 — Paloma (Claude Opus 5.5) — T-146 referencias de RF del permiso por rol
- **Hecho:** **T-146**, mergeado en el PR [#70](https://github.com/FranLuciano04/Vault-Rumbo/pull/70) con el CI en verde.
  - El permiso por rol y la visibilidad por fila citan RF-151. RF-150 queda para la asignación del `freelance`.
  - Se renombraron 20 tests, sin cambiar aserciones. Sin rojo, porque es solo de renombres.
  - Review (Opus): 3 menores, todos arreglados.
  - También se mergeó el PR [#67](https://github.com/FranLuciano04/Vault-Rumbo/pull/67), con la salida del 5173 para la API key, que había quedado afuera del #65.
- **Commits:** b52bb03, 8c5a916, 9a006bb, 9a288e6 (merge), 327f1da (grafo) y el de esta entrada.
- **Pendiente:** nada de T-146.

## 24/10/26 — Paloma (Claude Opus 5.5) — DEC-0019 y las cuatro fallas de entorno local
- **Hecho:**
  - Se registró la decisión del equipo **[[DEC-0019 Las fallas se arreglan al encontrarlas|DEC-0019]]**: las fallas se arreglan al encontrarlas, sin crear tickets, incluidos los hallazgos de Codex. Reemplaza en parte a DEC-0014. Se actualizaron `/implementar-ticket` (1.4.0), `/cerrar-modulo` (1.1.0), [[Flujo de implementación]] y el catálogo de skills.
  - Se arreglaron, sin ticket, las **cuatro fallas para ver Rumbo en local**. Rama `fix/levantar-rumbo-en-local`, PR [#65](https://github.com/FranLuciano04/Vault-Rumbo/pull/65), CI en verde:
    - el cliente HTTP rechaza un 2xx que no es JSON;
    - el proxy de `/api` en `pnpm dev`;
    - el override `docker-compose.firebase.yml`;
    - las salidas para la API key, documentadas.
  - La review de seguridad (Opus) dejó 3 menores, todos arreglados.
  - Al correr la suite completa apareció una regresión en el login mobile. La causa era un adaptador falso sin `content-type`, y se corrigió afinando la regla.
- **Commits:** d15c24a (DEC-0019, en `main`); en la rama: 58857f5, 5c5e970, b20879c, 6f25290 y 3cbaefc; y el de esta entrada.
- **Pendiente:**
  - ✅ PR #65 aprobado y mergeado por Nahuel (6564d67).
  - ✅ Decidido por Paloma: no se amplía la restricción de la API key. Con el Firebase real, el compose se publica en el 5173 (`RUMBO_HTTP_PORT=5173`).

## 24/10/26 — Paloma (Claude Opus 5.5) — T-043 historial del cliente
- **Hecho:** se tomó y se implementó **T-043** con TDD. Por error se había tomado antes T-037, que se liberó enseguida. `GET /clientes/{id}/historial` ya no es un stub. Mergeado en el PR [#62](https://github.com/FranLuciano04/Vault-Rumbo/pull/62), con el CI en verde.
  - **Decisiones de Paloma:** las oportunidades se ordenan por fecha de alta, porque no tienen una fecha de negocio propia. Las reseñas ocultas del historial solo las ven `admin` y `dueno` (CU-29). Las dos están anotadas en el ticket.
  - **Review (Opus):** marcó como importante que faltaba un test del filtro de visibilidad; se sumó. Quedó como menor un `# type: ignore` en el helper `traer`.
  - **Conflictos con T-042:** se resolvieron conservando los dos aportes y se quitó el import `no_implementado`, que quedó sin uso en el router de clientes.
- **Commits:** ee53918 (rojo), cd0574d (verde), 9783b81 (fix), 59ca0c4 (hecho), c8b3c35 (merge de main), d44d085 (merge del PR), e195e4c (grafo) y el de esta entrada.
- **Pendiente:** siguen sin decidir las cuatro fallas para levantar Rumbo en local (Estado, *Pendientes técnicos*).

## 24/10/26 — Francisco (Claude Opus 5.5) — pendientes del 23/10 y dos decisiones
- **Hecho:** repaso de los pendientes de la sesión del 23/10, que había quedado registrada aunque no se cerró. Se borró el aviso de T-027 (ya resuelto) y T-028 figura mergeado (PR #59).
- **Decisiones de Francisco** (las había planteado Paloma, de T-040 y T-032):
  - Al `freelance` se le avisa que ya hay un cliente con ese contacto en la agencia, sin mostrarle datos del otro cliente (CU-02 A1). ⚠️ Quién se queda con el cliente se confirma con la agencia.
  - Un requisito de destino dado de baja no se edita: 404 (CU-15 A3).
  - Las dos se implementan dentro de T-042, sin subtickets. El mensaje de la web va en T-045.
  - La edición del nombre del usuario en la web (pendiente de T-035) se suma a T-037.
  - Se descartan los checks obligatorios en `main`: no se paga GitHub Pro.
- **T-042** (PR #61, mergeado): `PATCH /clientes/{id}` con las validaciones del alta. Además:
  - el aviso de duplicado ajeno al `freelance` (solo por contacto, `duplicados: []`, sin cargar filas);
  - el requisito de baja no editable (404);
  - `DELETE` de clientes da 405.
  - Review Opus: 0 bloqueantes, 1 importante y 3 menores, todos arreglados. Backend: 901 tests, 96,8 % de cobertura.
  - Decidido por Francisco: si un freelance manda otro asesor al editar, se ignora sin error, como en el alta. En T-045 y T-046 quedó anotado que la web no le muestre el selector.
- **Commits:** 9bfb34d, a70f155, e101f54, 7c4ec83; T-042 5e5afd3, aef3f21, bebbc66, fb23eed y el merge 3b974b6; 6c4ff91 (notas de T-045 y T-046) y el de esta entrada.
- **Pendiente:** las cuatro fallas para levantar Rumbo en local siguen sin decidir (Estado, *Pendientes técnicos*).

## 23/10/26 — Paloma (Claude Opus 5.5) — T-027 probado con el Auth Emulator
- **Hecho:** prueba de punta a punta de T-027 con el compose más `docker-compose.e2e.yml`, en un proyecto de Docker aparte (`-p rumbo-emu`) para no tocar el Rumbo con login real. Pasaron los 8 pasos: la dueña entra, `POST /usuarios` da 201, la cuenta aparece en el emulador, Firebase emite el código `PASSWORD_RESET`, la empleada elige la contraseña con el link y entra (`/auth/yo` con rol `empleado`), email repetido en mayúsculas → 409, empleada listando usuarios → 403 y la dueña lista los 2 usuarios. Después se bajó el proyecto y se borró su base. Resultado anotado en las notas del ticket.
- **Commits:** el de esta entrada.
- **Pendiente:** nada de T-027. Sigue abierto que el equipo decida si las cuatro fallas del Estado pasan a ticket.

## 23/10/26 — Paloma (Claude Opus 5.5) — Rumbo completo andando en local con login real
- **Hecho:** se levantó Rumbo con Docker y se entró con la cuenta de Google de Paloma (dueña ya cargada en la base; `--demo` todavía no carga nada porque ningún módulo registró semillas). Para que funcionara: nginx publicado en el 5173 (`RUMBO_HTTP_PORT=5173`, cortando `pnpm dev`) y la API recreada con `FIREBASE_PROJECT_ID` y un override local, fuera del repo, que monta la cuenta de servicio. Esas dos trabas quedaron como fallas 3 y 4 en [[Estado del proyecto#Pendientes técnicos]].
- **Commits:** el de esta entrada.
- **Verificado por Paloma:** entra como dueña y cargan Clientes y Configuración. Con eso se cerró su aviso de T-027.
- **Pendiente:** que el equipo decida si las cuatro fallas pasan a ticket.

## 23/10/26 — Paloma (Claude Opus 5.5) — web local: Clientes en blanco
- **Hecho:** se investigó por qué, con `pnpm dev`, Clientes quedaba en blanco. La API no estaba levantada y Vite devolvía `index.html` para `/api/...`. Se levantó Rumbo completo con Docker para comprobarlo: salud OK y `/auth/yo` en 401 sin token. Después se bajó, porque falta crear la dueña en la base nueva. Las dos fallas quedaron en [[Estado del proyecto#Pendientes técnicos]].
- **Commits:** el de esta entrada.
- **Pendiente:** que el equipo decida si las dos fallas pasan a ticket. Para ver la app con datos: compose completo y `datos-iniciales --demo`, igual que en el aviso de T-027.

## 23/10/26 — Francisco (Claude Opus 5.5) — T-156, T-155, T-157 y T-162: listado de clientes completo
- **Hecho:**
  - **T-156** (#52): `GET /clientes/etiquetas`.
    - Las etiquetas salen sin duplicados y en el menú se muestra la variante más usada.
    - El filtro de etiquetas ya no distingue mayúsculas, tildes ni espacios.
  - **T-162** (#54): se ignora GHSA-mrhx-c7xc-m3w5, la vulnerabilidad de zod en `@expo/cli`. La 3.x no tiene parche y el riesgo lo aceptó Francisco.
  - **T-155** (#56): el listado devuelve `ClienteListado` con el resumen, en 3 consultas por página.
  - **T-157** (#57):
    - Menú de etiquetas con chips, columnas como en el prototipo y «Mis clientes» fija para el freelance.
    - Topes de etiquetas en el alta y la edición. Antes eran T-161, que se absorbió acá.
    - Se retiró el alias `etiqueta`.
  - Todos tuvieron review y el CI en verde, salvo el #52: se mergeó con solo el audit en rojo, por la falla de zod que resolvió T-162. Lo decidió Francisco.
- **Decisiones de Francisco:**
  - El freelance ve el resumen completo de sus clientes, según `politicas`.
  - `ClienteListado` va aparte de `Cliente`.
  - El «último viaje» es el último que ya salió, en hora de Argentina; el helper es `core/fechas.hoy` y `tzdata` quedó declarada.
  - **No abrir subtickets:** los hallazgos chicos se resuelven dentro del ticket en curso.
- **Commits:** los merges de #52, #54, #56 y #57; ef1f09c y el que absorbe T-161 en `main`.
- **Pendiente:**
  - Cuando se implemente el PATCH de clientes, `test_rf031_edicion_acepta_20_etiquetas_de_80_caracteres` tiene que esperar el éxito.
  - `ClienteEditar` no recorta espacios.
  - El ignore de zod se revisa cuando Expo pase a zod 4.

## 23/10/26 — Nahuel con el equipo (Claude Opus 5.5) — cierre de M0 (`mod-0`)
- **Hecho:** con la aprobación del equipo, `/cerrar-modulo M0` fase B, cierre. Se puso el tag `mod-0` sobre `d57e8f2`, se publicó el grafo y se cargó el resumen del módulo en [[Bitácora técnica]] (38 tickets y 3 hallazgos de Codex resueltos).
- **Commits:** el de este cierre.
- **Pendiente:** probar el login mobile en el development build con un `.env` real. Seguir con M1 y los siguientes según el [[Plan de implementación]].

## 23/10/26 — Nahuel (Claude Opus 5.5) — T-160: CI de mobile al cambiar shared
- **Hecho:** tomó e implementó **T-160** (M0, infra, XS; hallazgo H-03 de Codex). PR [#55](https://github.com/FranLuciano04/Vault-Rumbo/pull/55) mergeado con los 8 checks en verde, incluido Mobile.
  - En `ci.yml`, la salida `mobile` también se activa con `^src/packages/shared/`. Se verificó evaluando las expresiones sacadas del propio workflow.
  - Review (Sonnet): un menor que ya existía y queda fuera de alcance: si se edita `openapi.json` a mano sin tocar el backend, no corre el job `backend`. Está anotado en el ticket.
- **Commits:** 2321709, 7b171f6; merge 8859ecc.
- **Pendiente:** con T-162 (Francisco, PR #54) también mergeado, **todos los tickets de M0 están hechos**. Falta la aprobación del equipo para el tag `mod-0` (`/cerrar-modulo M0`).

## 23/10/26 — Nahuel (Claude Opus 5.5) — T-159: verificación del token alineada con DEC-0018
- **Hecho:** tomó e implementó **T-159** (M0, backend, XS). PR [#53](https://github.com/FranLuciano04/Vault-Rumbo/pull/53) mergeado con el CI en verde.
  - Test de caracterización `test_rf142_verificador_no_pide_check_revoked_dec0018`: impide activar `check_revoked` sin una `DEC-` nueva. Que detecta el cambio se comprobó con mutaciones. Los comentarios de `core/seguridad.py` citan DEC-0018.
  - Desvío de TDD anotado en el ticket: el rojo no podía fallar porque el comportamiento no cambia.
  - Review (Opus): 2 menores de redacción, arreglados. Backend: 819 tests, cobertura 97 %.
- **Commits:** 8d09a0f, 2b05a0e, dd98472, cdf6eb0; merge 5a8506e.
- **Pendiente:** en esta máquina, `tmp_path` de pytest da `PermissionError` sobre `%TEMP%\pytest-of-test123`; se evita con `--basetemp`. Para cerrar M0 faltan T-160 (libre) y T-162 (de Francisco, hallazgo de T-156).

## 23/10/26 — Nahuel con el equipo (Claude Opus 5.5) — DEC-0018: revocación de sesiones de Firebase
- **Hecho:** el equipo (Francisco, Nahuel y Paloma) eligió la opción B para el hallazgo H-02 de Codex. Se formalizó [[DEC-0018 Revocación de sesiones de Firebase|DEC-0018]]: no se usa `check_revoked`, el acceso se corta con `Usuario.activo` y un corte hecho solo en Firebase tarda hasta 1 h. Se reescribió **T-159** (ahora: alinear los comentarios y los tests con la decisión, XS, riesgo normal), se aclaró T-010, se actualizaron el triage de Codex y el MOC de decisiones, y se cerró el `#accion/decidir` del estado.
- **Commits:** el de esta decisión.
- **Pendiente:** T-159 y T-160 para cerrar M0.

## 23/10/26 — Nahuel (Claude Opus 5.5) — T-158: config de Firebase en el bundle mobile
- **Hecho:** tomó e implementó **T-158** (M0, mobile, S, ⚠️ riesgo alto; hallazgo H-01 de Codex). Paloma aprobó el PR [#51](https://github.com/FranLuciano04/Vault-Rumbo/pull/51), que se mergeó con el CI en verde (8/8).
  - `src/lib/firebase.ts` lee las seis `EXPO_PUBLIC_*` como `process.env.X` literales. `"expo/types"` en el `tsconfig` tipa `process.env`, que era la razón del alias.
  - Test nuevo que pasa el módulo por `babel-preset-expo` y comprueba que Expo incorpore las variables. Mobile: 43 tests, cobertura 96,6 %.
  - Review (Sonnet, seguridad): sin fallas de seguridad. 2 importantes de lint y 2 menores, todos arreglados.
- **Commits:** b5b8a15, c3d91d6, cd1cf16, 0498036; merge 7b5ac69.
- **Pendiente:** probar el inicio de sesión en el development build con un `.env` real. Quedan T-159 (decidir antes `check_revoked`) y T-160 para cerrar M0.

## 23/10/26 — Nahuel (Claude Opus 5.5) — M0: triage de la review de Codex
- **Hecho:** `/cerrar-modulo M0`, fase B. Codex dejó 3 hallazgos en [[M0 — review Codex]] y los 3 se confirmaron en el código: la config de Firebase de mobile no llega al bundle por leerse con un alias de `process.env`, el backend acepta tokens revocados y el CI no corre mobile cuando cambia `shared`. Se crearon **T-158**, **T-159** y **T-160** (M0, `origen: review-codex M0`).
- **Commits:** el de este triage (`review: hallazgos de Codex en M0 → T-158, T-159, T-160`).
- **Pendiente:** decidir en equipo T-159 (`check_revoked` en cada pedido o una `DEC-` que acepte la ventana de 1 h). Implementar los tres tickets. Después, la aprobación del equipo y el tag `mod-0`.

## 23/10/26 — Nahuel (Claude Opus 5.5) — M0: pedido de review para Codex
- **Hecho:** `/cerrar-modulo M0`, fase A. Los 34 tickets de M0 están `hecho`. Se escribió [[M0 — pedido de review]] con los tickets, su trazabilidad, los 34 merges, los archivos tocados y 10 puntos a mirar entre tickets.
  - Ojo: con un clon *shallow*, `tickets.mjs modulo` no encuentra los merges viejos (PR #1 a #15). Hay que correr antes `git fetch --unshallow origin`.
- **Commits:** el de este pedido (`review: pedido de review de M0`).
- **Pendiente:** que Codex escriba `06-Desarrollo/Reviews/M0 — review Codex.md`. Después, `/cerrar-modulo M0` fase B (triage y tickets de arreglo) y la aprobación del equipo para el tag `mod-0`.

## 23/10/26 — Nahuel (Claude Opus 5.5) — T-028 (PR abierto) y T-163: undici
- **T-028** (M1, backend, ⚠️ alto): implementado en el PR #59, con el CI en verde. ✅ Aprobado y mergeado el 24/10.
  - PATCH de nombre, rol y acceso a redes. La baja es lógica: deshabilita Firebase y el pedido siguiente da 401. Si la operación deja al sistema sin admin, da 409.
  - Regla de la dueña ampliada por Nahuel y anotada en CU-25: un admin no asigna, no quita ni da de baja a una dueña (403).
  - Para la concurrencia se usa `FOR UPDATE`, siempre en orden: primero los admins y después el objetivo. El SDK de Firebase tiene timeout de 10 s.
  - Review de seguridad: 0 bloqueantes, 1 importante y 2 menores, todos arreglados. Backend: 875 tests, 96,8 % de cobertura.
- **T-163** (hallazgo de T-028, pasado a M1 porque M0 está cerrado): override `undici ^8.12.2` por GHSA-xjj6-f33q-929c, que hacía fallar la auditoría del CI web en todos los PR. PR #60 mergeado. Para tomarlo se liberó T-028 y se retomó después.
- **Commits:** T-028 0f624ef, 1723129, b794642, 45e69bc, 7c27e3d, 574379b, 480f595, dcabe39; T-163 8c10efb, 406c52c, 54f9320.
- **Pendiente:**
  - ~~Aprobación del PR #59.~~ ✅ Mergeado el 24/10 (`116ff01`).
  - `#accion/decidir` en CU-25: si se protege a la última dueña activa.
  - Habilitar la edición del nombre en la web (T-035). ✅ 24/10: va en T-037.
  - En esta PC, pytest necesita `--basetemp` porque el tmp de Windows da `PermissionError`.

## 23/10/26 — Nahuel (Claude Opus 5.5) — T-035: usuarios y roles en la web
- **Hecho:** tomó e implementó **T-035** (M1, web, M). PR #58 mergeado con CI en verde.
  - Pestaña «Usuarios y roles»: listado, alta con aviso del mail de Firebase, edición de rol y accesos (PATCH solo con lo que cambió), baja con confirmación; 409 y 403 con mensaje claro. Admin y dueño muestran redes «Por su rol» (DEC-0013).
  - `errores.ts` (compartido) también muestra el `detail` de un 403; `CLASE_SELECT` pasó a `CampoFormulario.tsx`.
  - Review (Opus): 0 bloqueantes, 2 importantes y 7 menores; arreglados todos menos uno. Web: 195 tests, cobertura 93,4 %.
- **Commits:** fdf093e, fdb358d, 3072623, 491fb55, 32d65fc.
- **Pendiente:** contra el backend real solo andan el listado y el alta; edición, baja, último admin y 403 del dueño dependen de **T-028**. Después de T-028, habilitar la edición del nombre en la web (CU-25 A2). Menor sin hacer: ocultar «Dueño» en el select si quien edita no es dueño.

## 23/10/26 — Nahuel (Claude Opus 5.5) — T-036: destinos y requisitos en la web
- **Hecho:** tomó e implementó **T-036** (M1, web, M). PR #50 mergeado con CI en verde.
  - Pestaña «Destinos y requisitos» en Configuración: ABM de destinos con filtro de inactivos, baja y reactivación; requisitos con alta, edición y baja lógica con confirmación; 409 y 422 en el formulario.
  - `errores.ts` es compartido: un 409 ahora muestra su `detail` en todos los formularios de Configuración.
  - Review (Opus): 0 bloqueantes, 3 importantes y 5 menores, todos arreglados. Web: 168 tests, cobertura 92,5 %.
- **Commits:** c7a9677, 3eae8fe, baeb45f, 1dbeec3.
- **Pendiente:** decidir en equipo si la pantalla de destinos pasa a maestro-detalle, como el prototipo (pantalla 32). Si se crea un paginador web, adoptarlo en estos listados, que hoy avisan «Mostramos N de M».

## 23/10/26 — Nahuel (Claude Opus 5.5) — T-154: suite del backend más rápida
- **Hecho:** tomó e implementó **T-154** (M0, infra, M; hallazgo de T-033). PR #49 mergeado con CI en verde (el backend ya corre con `-n auto` en GitHub).
  - `tests/conftest.py` normaliza `localhost` → `127.0.0.1` y da una base `rumbo_gwN_test` por worker de `pytest-xdist`; la guarda `_test` se valida sobre el nombre original (hallazgo de review).
  - Suite completa: de 24 min 26 s a ~3 min en serie y ~2-3 min con `-n auto`; `test_contrato_m1.py` de 4 min 22 s a ~30 s.
- **Commits:** dcef818, 99ba521, 0b45fad.
- **Pendiente:** ninguno. La solución 2 se descartó por estimación. La solución 4 se aplicó después vía `/gestionar-skills`: `implementar-ticket` 1.3.0, donde las fases corren solo los tests del ticket y sus vecinos y la suite completa va una vez en los checks.

## 23/10/26 — Francisco (Claude Opus 5.5) — T-041: buscar clientes según la visibilidad del rol
- **Hecho:** T-041 (capa backend, riesgo alto).
  - `GET /clientes` permite buscar por texto, etiquetas combinables (el cliente tiene que tener todas), segmento y «lo mío», con paginación. `GET /clientes/{id}` devuelve la ficha.
  - La visibilidad sale de `politicas`: el freelance solo ve los suyos y un cliente ajeno le da 404.
  - Francisco autorizó cambiar `test_contrato_m2.py` (501 → 200).
  - La review de seguridad (Sonnet) no encontró bloqueantes; los 2 menores se arreglaron.
  - PR [#48](https://github.com/FranLuciano04/Vault-Rumbo/pull/48), con el CI en verde, aprobado y mergeado por Nahuel.
- **Commits:** cf0b236, 2ac9266, 706b48c y 700da22; merge 5143433.
- **Pendiente:**
  - La web sigue mandando el alias deprecado `etiqueta`; pasarla a `etiquetas` y retirar el alias queda en T-157.
  - Las etiquetas del alta de clientes (`ClienteCrear`) siguen sin tope de largo; no hay ticket.

## 23/10/26 — Francisco (Claude Opus 5.5) — T-044: listado de clientes en la web, y decisiones de CU-25
- **Hecho:** T-044 (capa web, riesgo normal). Es la **primera pantalla de clientes de la web**.
  - Incluye tabla, búsqueda con debounce, filtros por segmento y etiqueta, la vista «Mis clientes / Toda la agencia», paginación sin parpadeo (`keepPreviousData` en `useClientes`) y estados de carga, vacío y error.
  - El layout sigue las pantallas 8 y 39.
  - El freelance no ve el selector y ve el aviso con el texto del prototipo.
  - La review (Opus) tuvo dos rondas. La primera pidió cambios, con 5 importantes y 4 menores, y la segunda dejó 2 menores. Todo quedó arreglado.
  - El PR [#47](https://github.com/FranLuciano04/Vault-Rumbo/pull/47) se mergeó con el CI en verde. Pasan 146 tests de web.
- **Decisiones de Francisco sobre CU-25:**
  - Solo la dueña crea o asigna el rol `dueño`. Queda en T-028.
  - Una cuenta de Firebase sin `Usuario` se reutiliza al reintentar el alta. Queda en T-153, que ya se puede tomar.
  - El PR #45 (T-027) lo **mergeó Francisco**.
  - La prueba del mail real le queda a Paloma, que tiene un aviso con los pasos.
- **Commits:** c0ae9f1, 1a39860, d776d79, a96e64b y 27772a5.
- **Decidido por Francisco (23/10):**
  - El freelance ve «Mis clientes» como etiqueta fija y no clickeable, como en la pantalla 39.
  - Se amplía el contrato del listado con el asesor, el último viaje y las oportunidades abiertas (**T-155**).
  - Las etiquetas pasan a un menú con las que están en uso, con selección múltiple combinable (todas a la vez, RF-031): **T-156** (backend) y **T-157** (web). T-041 ya pide varias etiquetas combinables.

## 23/10/26 — Francisco (Claude Opus 5.5) — T-149: Instagram opcional del cliente
- **Hecho:** T-149 (backend, contrato y shared; riesgo normal; DEC-0017).
  - Columna `cliente.instagram` (migración 0003) y tipo `Instagram`: quita el `@` inicial y los espacios ASCII, pasa a minúsculas, deja en `null` lo que queda vacío y valida con `^[a-z0-9._]{1,30}$`.
  - Instagram **no** cuenta como contacto mínimo.
  - En shared, `normalizarInstagram` aplica la misma regla en el zod del alta y en los mocks.
  - Un PATCH sin `instagram` no lo borra (`exclude_unset`): queda listo para T-042.
  - La review (Opus) lo dio aprobable con 4 menores; se arreglaron 3. Pasan 668 tests de backend y 107 de shared.
  - El PR [#38](https://github.com/FranLuciano04/Vault-Rumbo/pull/38) lo **mergeó Paloma** con el CI en verde.
- **Tests:** con autorización de Francisco, `tests/test_modelos.py` suma `instagram` a las columnas de `cliente`. Las columnas posteriores a `rumbo.sql` vienen de migraciones nuevas, y el criterio vale para las próximas.
- **Commits:** 9254522, 57bcc50, 11eebd6 y 28e82db.
- **Para el equipo:** corran `uv run alembic upgrade head` (0003; con T-033 la cabeza ya es 0004).
- **Pendiente:** nada.

## 23/10/26 — Nahuel (Claude Opus 5.5) — T-033: catálogo de operadores
- **Hecho:** tomó e implementó **T-033** (M1, backend, S, riesgo normal) con TDD: rojo sonnet, verde/refactor/fix haiku, review opus. PR #46 mergeado con CI en verde.
  - Operadores siguen el patrón de destinos; búsqueda y paginación quedan en `RepositorioCatalogo[T]` compartido. Migración `0004` con índice único normalizado; corregido el `'\s+'` de `0002`.
  - Fix de review: `activo: bool = True` en el listado de operadores y contrato regenerado.
- **Commits:** 10d4e52, 70ea28d, d2cc6da, 2775ce3, 584049b (merge db80d47).
- **Pendiente:** menor anotado en T-033 (`etiqueta` del 409 en la capa de datos, a decidir). `listar_usuarios` también publica `activo: boolean | null` (sin ticket todavía).

## 22/10/26 — Nahuel (Claude Opus 5.5) — T-152: falso rojo de `fase`
- **Hecho:** creó e implementó **T-152** (M0, infra, XS; hallazgo de T-034, DEC-0014).
  - `tickets.mjs fase` sale con **5** y no commitea cuando el comando de `--test` no arrancó (código 126, 127 o 9009) o no terminó (una señal o ENOBUFS).
  - `maxBuffer` del comando de tests sube a 64 MB.
  - Los códigos 2 a 5 y la regla de encadenar con `&&` quedan documentados en [[Flujo de implementación]].
  - **Review (Opus):** 0 bloqueantes y 1 importante, la corrida trunca, que se arregló.
  - **CI:** en verde. PR [#44](https://github.com/FranLuciano04/Vault-Rumbo/pull/44) mergeado (05c30da).
- **Commits:** 39650a7, 2701006, 5f4cf68, 39a6fdc.
- **Pendiente:**
  - Probar el 9009 en una PC sin el bash de Git.
  - ~~Sumar el código 5 a la skill `/implementar-ticket`~~: hecho, `implementar-ticket` 1.2.0 (por `/gestionar-skills`).
  - Un binario que falta dentro de pnpm o uv sigue pasando como rojo. Queda fuera del alcance de T-152.

## 22/10/26 — Nahuel (Claude Opus 5.5) — T-034: parámetros del negocio en la web
- **Hecho:** tomó e implementó **T-034** (M1, web, riesgo normal; CU-13, RF-083/084, DEC-0013).
  - Sección Configuración solo para admin y dueña, con las cuatro pestañas del prototipo. Las otras tres quedan deshabilitadas, porque tienen tickets propios.
  - Formulario de parámetros y comisión por defecto por vendedor, incluidos los dados de baja. Tienen validación zod con los rangos del backend y muestran los errores 422 en sus campos. Los errores de nivel modelo (`campo: "body"`) van al aviso general.
  - **Tests tocados con autorización de Nahuel:** el setup de MSW (`manejadoresM1`) y un tipo en el verde, y casos agregados en el fix. No cambió ninguna aserción.
  - **Review (Opus):** 0 bloqueantes, 2 importantes y 4 menores, todos arreglados.
  - **CI:** en verde. PR [#43](https://github.com/FranLuciano04/Vault-Rumbo/pull/43) mergeado (14ac574).
- **Commits:** d50de2f, 06c91ba, b8d9c09, 2b07dc8, fb36df2.
- **Pendiente:**
  - Comparar labels y botones con las pantallas 30 y 51 del prototipo, porque se tomaron de CU-13.
  - Hallazgo de herramienta: `tickets.mjs fase … rojo --test` aceptó como rojo un `pnpm: command not found`. En el bash de esta PC hay que usar `corepack pnpm`. Queda como **T-152** (M0, infra, XS).

## 22/10/26 — Nahuel (Claude Opus 5.5) — T-023: login mobile con email o Google
- **Hecho:** tomó e implementó **T-023** (M0, mobile, riesgo alto; CU-24, RF-140/142/143, DEC-0016). Es el último ticket de M0.
  - **Dependencia aprobada por Nahuel:** `@react-native-google-signin/google-signin`, sumada a la spec §3. También se agregaron `firebase` y AsyncStorage.
  - Pantallas de login (52) y Más (59): email, Google, «olvidé mi contraseña» con mensaje neutro, `/auth/yo` con 401 → «usuario no habilitado» y cierre de sesión que vacía la caché.
  - Se arregló un bug de T-022: había dos copias de React entre la app y `@rumbo/shared`, y por eso `useYo` real daba «Invalid hook call».
  - **Desvíos:** los tests corrigieron la falta de `await` en `fireEvent` (RNTL 14), con autorización de Nahuel. No usan MSW, porque no carga bajo jest-expo. Mobile pasa a tener `testTimeout` de 20 s por la caché fría.
  - **Review (Sonnet, seguridad):** 0 bloqueantes, 0 importantes y 2 menores. Uno se arregló; el otro era un falso positivo y se descartó (el redirect por 401 en `(pestanas)/_layout.tsx` ya funciona con el usuario en caché).
  - **CI:** en verde. El PR [#40](https://github.com/FranLuciano04/Vault-Rumbo/pull/40) lo aprobó Paloma y quedó mergeado (c7f9b1b).
- **Commits:** f74a33b, 15a3db1, 4c148a5, c8d35f8, f9b4dfe, 5955b0d.
- **Pendiente:**
  - Probar en el development build. Falta configurar `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` y el SHA-1 (Android) y `GoogleService-Info.plist` (iOS).

## 22/10/26 — Nahuel (Claude Opus 5.5) — T-150: auditorías de dependencias semanales
- **Hecho:** tomó e implementó **T-150** (M0, infra, riesgo normal, DEC-0001, RNF-03; hallazgo de T-019).
  - Workflow nuevo `.github/workflows/auditoria-semanal.yml`: corre `pip-audit` y `pnpm audit --audit-level=high` los lunes a las 06:00 (hora de Buenos Aires), y también a mano con `workflow_dispatch`. Solo audita.
  - **Responsable del aviso:** Nahuel, por decisión propia. Está escrito en [[Flujo de implementación#Auditoría semanal de dependencias (T-150)]], junto con qué hacer ante una falla.
  - **Review (Sonnet):** 0 bloqueantes, 1 importante (el responsable del aviso, arreglado) y 2 menores.
  - **CI:** en verde. El PR [#36](https://github.com/FranLuciano04/Vault-Rumbo/pull/36) quedó mergeado. La primera corrida manual en `main` pasó los dos jobs, y con eso `pip-audit` quedó verificado en el runner.
- **Commits:** 80b5f90, ee17786, 4db8d9e (merge a631efd).
- **Pendiente:**
  - M0 queda con un solo ticket: T-023, el login mobile, de riesgo alto. Después vienen la review de Codex y el tag `mod-0`.
  - Fijar Semgrep y las acciones por digest o SHA (menor de T-019).

## 22/10/26 — Paloma (Claude Opus 5.5) — T-040: registrar clientes detectando duplicados
- **Hecho:** aprobó el PR [#33](https://github.com/FranLuciano04/Vault-Rumbo/pull/33) (T-030). Tomó e implementó **T-040** (M2, backend, riesgo normal; CU-02, RF-001/002/003/150).
  - `POST /api/clientes`: 422 si faltan los datos mínimos, 409 con hasta 10 candidatos ante un posible duplicado (mismo contacto, o mismo nombre sin distinguir mayúsculas, tildes ni espacios de más) y alta con `confirmar_duplicado: true`. El `freelance` siempre queda como asesor.
  - `ErrorDeDominio` ahora lleva un `extra` genérico para el problem+json, y se sumó `DatosInvalidos` (422 sobre un campo).
  - `tests/api/test_contrato_m2.py` suma `IMPLEMENTADAS`, con la autorización de Paloma.
  - **Review (Opus):** 0 bloqueantes, 4 importantes y 2 menores. Se arreglaron los 4 importantes y el tope de candidatos.
  - **CI:** todo en verde. El PR [#34](https://github.com/FranLuciano04/Vault-Rumbo/pull/34) quedó mergeado. Con eso se destraban 11 tickets.
- **Commits:** ced7d99, cbcc7a7, e2f774c, daebb28, ac1f359 (merge 5b2ddc8).
- **Pendiente:**
  - Decidir en la sync si al `freelance` hay que avisarle de duplicados de otros asesores. Hoy no los ve, por visibilidad.
  - Validar el formato del contacto, normalizar teléfonos y aplicar similitud difusa de nombres. Dependen de [[DEC-0017 Contacto mínimo del cliente]].
  - ⚠️ `main` no tiene checks obligatorios. `gh pr merge --auto` mergea al instante, sin esperar el CI. Esta vez el CI pasó después del merge.
- **Hecho (2):** **T-032** (M1, backend, riesgo normal; CU-15, RF-086/087/088/034). Requisitos por destino: listar los activos, agregar, editar y dar de baja de forma lógica. Solo `admin` y `dueno` escriben; leen todos los roles. Editar o dar de baja no toca las alertas emitidas.
  - **Review (Opus):** 0 bloqueantes, 1 importante y 2 menores. El importante (500 con un entero fuera de rango) pasó a **T-151**, nuevo, por decisión de Paloma.
  - **Desvío autorizado:** `concurrency = ["greenlet", "thread"]` en la cobertura. Adelanta **T-148**: sin eso, `negocio/` daba 79,93 % y fallaba el CI; ahora da 99 %.
  - **CI:** todo en verde antes del merge. El PR [#39](https://github.com/FranLuciano04/Vault-Rumbo/pull/39) quedó mergeado y destraba 7 tickets.
- **Commits (2):** 194ab4f, 8fa63f9, 5e4b10d, 483ff3b, 6833514.
- **Hecho (3):** **T-148** cerrado verificando. Se confirmó que la cobertura ya sigue los `await`: `negocio/` da 99 % y el backend 99 %. El PR [#41](https://github.com/FranLuciano04/Vault-Rumbo/pull/41) quedó mergeado; solo trae las notas del ticket.
- **Hecho (4):** **T-151** (M1, backend, hallazgo T-032). Un entero fuera del rango de la base ahora da 422 problem+json, y no 500, en todos los módulos.
  - El error se detecta por tipos en `rumbo/core/errores_de_base.py`: asyncpg `DataError` causado por un `OverflowError`, o el SQLSTATE 22003.
  - Cualquier otro error sigue en 500.
  - Con autorización de Paloma, el savepoint quedó en las `_sesion_de_test` de `tests/conftest.py` y no en producción.
  - **Review (Opus):** 0 bloqueantes, 2 importantes y 2 menores; se arreglaron los 4.
  - **CI:** todo en verde y el PR [#42](https://github.com/FranLuciano04/Vault-Rumbo/pull/42) quedó mergeado.
  - **Aviso al equipo:** desde ahora, cada test de API corre dentro de un savepoint. Así, después de un error en el flush se puede seguir leyendo la base.
- **Commits (4):** 1f5ef4b, 0585cf4, 4e4a5de, 1a2f0c8, 6068e22.
- **Hecho (5):** **T-027** (M1, backend, ⚠️ riesgo alto; CU-25, RF-144/145/146/150). Listar, ver y dar de alta usuarios.
  - El alta crea la cuenta de Firebase, guarda el `Usuario` y Firebase manda el mail con `accounts:sendOobCode`.
  - Si falla la base, el mail o hay una cancelación, la cuenta se borra.
  - Decisión de Paloma: un mail fallido da 502 y deshace todo.
  - **Review de seguridad (Sonnet):** 0 bloqueantes, 2 importantes y 4 menores.
  - Se creó **T-153** (cuentas huérfanas) y se sumaron 3 decisiones abiertas a la agenda de la sync.
  - El PR [#45](https://github.com/FranLuciano04/Vault-Rumbo/pull/45) lo mergeó Francisco el 23/10, sin una aprobación formal en GitHub. Ramas borradas y grafo al día.
- **Commits (5):** 5e2838b, 8a901be, 36dcf31, 6091eb3, 40dd750.
- **Pendiente (2):**
  - Un 22003 que no viene del usuario (por ejemplo, un SUM que desborda) también responde 422. Queda registrado en el log.
  - Decidir si se puede editar un requisito dado de baja: hoy responde 200.

## 22/10/26 — Nahuel (Claude Opus 5.5) — T-019: análisis de seguridad en el CI
- **Hecho:** T-019 (capa infra, riesgo normal, DEC-0001, RNF-03).
  - **Jobs nuevos:**
    - `secretos`: gitleaks, en `secretos.yml`. Corre en cada PR y en cada push a `main`, y recorre `HEAD`, no todas las ramas.
    - `sast`: Semgrep.
    - pip-audit y bandit en el job backend, y `pnpm audit` en el job web.
  - **Hallazgos reales resueltos:**
    - Se actualizó `certifi`.
    - Override de `@grpc/grpc-js`.
    - El emulador ya no corre como root.
  - **Riesgo aceptado** de 2 altas sin parche que vienen de herramientas de build: node-forge y braces.
  - **Review (Opus):** 1 importante y 4 menores. Se arreglaron el importante y 2 menores.
  - **CI en GitHub:** todo en verde. gitleaks recorrió 424 commits sin encontrar secretos. El PR [#30](https://github.com/FranLuciano04/Vault-Rumbo/pull/30) quedó mergeado, y `Secretos` también pasó en el push a `main`.
- **Commits:** 81708b0, 5769ccc, más el cierre del ticket.
- **Para el equipo:** ver los avisos de arriba. Los 5 `PermissionError` de los tests que lanzan subprocesos en la PC de Nahuel se resuelven con `pytest --basetemp=.pytest_tmp`.
- **Pendiente:**
  - M0 queda con un solo ticket: T-023, el login mobile, de riesgo alto.
  - Posible ticket nuevo: un `schedule` semanal para las auditorías.
  - Fijar Semgrep y las acciones por digest o SHA.

## 21/10/26 — Nahuel (Claude Opus 5.5) — T-013: cliente de IA con modelo falso
- **Hecho:** T-013 (capa backend, riesgo normal, DEC-0012, RNF-16).
  - `core.ia` ofrece `ModeloIA.generar`, con un modelo falso determinista y el cliente real de `claude-sonnet-5-5`. La implementación se elige con `IA_MODELO=falso|claude`, que por defecto es `falso`.
  - Sin `ANTHROPIC_API_KEY`, o si la API falla, se lanza `ServicioExterno`.
  - Una guardia autouse en `tests/conftest.py` impide construir el cliente real en los tests.
  - La review (Opus) dejó 0 bloqueantes, 2 importantes y 3 menores, todos arreglados.
  - El PR [#29](https://github.com/FranLuciano04/Vault-Rumbo/pull/29) quedó mergeado.
- **Commits:** 006fede, 83ac2cb, e446fd3, ce06f40.
- **Para el equipo:**
  - Hay una dependencia nueva, `langchain-anthropic`: corran `uv sync` en `src/backend`.
  - `src/backend/.env.example` suma `IA_MODELO` y `ANTHROPIC_API_KEY`, que son opcionales: sin ellas se usa el modelo falso.
- **Pendiente:**
  - En la PC de Nahuel, 5 tests que lanzan subprocesos (`test_cli_openapi`, `test_config` y `test_seguridad`) dan `PermissionError` en el setup de `pytest_asyncio`. Los 3 de `test_config` y `test_seguridad` fallan igual sin los cambios del ticket; los 2 de `test_cli_openapi`, no lo comprobé. Es un tema de entorno, a revisar.
  - Para M9: la guardia solo intercepta `_construir_cliente_claude`.

## 21-22/10/26 — Paloma (Claude Opus 5.5) — T-039: contrato de clientes
- **Hecho:** T-039 (capa contrato, riesgo normal).
  - Cinco rutas `/api/clientes` con stubs `501`, con filtros, el 409 de duplicado de CU-02 A1 (`duplicados` y `confirmar_duplicado`), la auditoría readOnly y el PATCH sin null en los campos obligatorios (CU-03 A2).
  - En `@rumbo/shared`: tipos, zod del alta, cinco hooks y mocks MSW. `ErrorApi` expone `duplicados`.
  - La review (Opus) dejó 0 bloqueantes y 5 importantes. Se arreglaron 4, y el quinto lo decidió Paloma: Instagram no vale como contacto.
  - Pasan 340 tests de backend (97 % de cobertura), 60 de shared y 72 de web. El PR [#31](https://github.com/FranLuciano04/Vault-Rumbo/pull/31) se mergeó con el CI en verde.
- **Commits:** af80fca, 62e9a7d, 2e294dc, 634690f (merge 7c0e5bb).
- **Decisión:** [[DEC-0017 Contacto mínimo del cliente]] queda en revisión, porque alinear las cinco notas formalizadas que nombran Instagram necesita la ratificación del equipo.
- **Incidente de entorno:** la suite de backend tardaba 31 min y una vez cortó por timeout. La causa era `localhost` en la URL de la base, que en Windows suma 2 s por conexión. Se resolvió con `127.0.0.1` en el `.env` local de Paloma, y hay un aviso para el equipo.
- **Pendiente:**
  - Ratificar DEC-0017.
  - Resolver el choque de DEC-0008 con CU-02 y DEC-0005 sobre si el freelance ve todos los clientes. Le toca al ticket de backend de clientes.
  - Ciclo de imports en `mocks/clientes.ts`.

## 21/10/26 — Paloma (Claude Opus 5.5) — T-142: barra lateral web en pantallas angostas
- **Hecho:** T-142 (capa web, riesgo normal, `origen: hallazgo T-020`).
  - Debajo de `md`, la barra lateral se colapsa y se abre con un botón «Menú» que tiene `aria-expanded` y `aria-controls`. Elegir una sección o apretar Escape la cierra. Desde `md` se ve como antes.
  - Con aprobación de Paloma, se sumó el foco visible en los enlaces y en el botón. Era el menor que había quedado de T-141.
  - Se corrigió con autorización una aserción del rojo que decía que el empleado no ve Dashboard. En realidad sí lo ve, como fija T-020.
  - La review (Opus) dejó 0 bloqueantes, 0 importantes y 4 menores, de los que se arreglaron 2. Pasan los 72 tests de web, con 84 % de cobertura. El PR [#28](https://github.com/FranLuciano04/Vault-Rumbo/pull/28) se mergeó con el CI en verde.
- **Commits:** 97ec1a9, d642b0e, 6b4af38, 694eb98, 86fe4e4, 24a0b55.
- **Pendiente:** dos menores anotados en el ticket.
  - El menú abierto reaparece si se agranda la ventana y se vuelve a achicar.
  - El ancho y el borde desde `md` se verifican a mano.

## 21/10/26 — Paloma (Claude Opus 5.5) — T-141: íconos de la barra lateral web
- **Hecho:** T-141 (capa web, riesgo normal, `origen: hallazgo T-020`).
  - Cada sección de la barra lateral muestra su ícono de `lucide-react`, tomado de las pantallas 3 y 28 del prototipo. Los íconos son decorativos (`aria-hidden`), así que el nombre accesible sigue siendo la etiqueta.
  - El ítem activo suma `font-semibold` como señal no cromática (WCAG AA).
  - La review (Opus) dejó 0 bloqueantes, 0 importantes y 3 menores. Además, el orquestador corrigió 5 íconos que no coincidían con el prototipo.
  - Pasan los 62 tests de web, con 80,8 % de cobertura. El PR [#27](https://github.com/FranLuciano04/Vault-Rumbo/pull/27) se mergeó con el CI en verde.
- **Commits:** 21825d0, e463b9f, 9add5e1, 7285a76 (merge 3c58187).
- **Para el equipo:** si `pnpm` no está en el PATH, se usa `npx pnpm …`, que respeta la versión fijada en `src/package.json`.
- **Pendiente:** dos menores anotados en el ticket.
  - Los enlaces de la barra no tienen un estilo de foco propio. Conviene hacerlo con T-142.
  - El test de `aria-hidden` depende del valor por defecto de `lucide-react`.

## 21/10/26 — Francisco (Claude Opus 5.5) — T-021: login web con email o Google
- **Hecho:** T-021 (capa web, riesgo alto).
  - El login funciona con email y con Google, con `/auth/yo` y el aviso «usuario no habilitado» (A1). Están «olvidé mi contraseña», con un mensaje neutro (A4), y el cierre de sesión, que limpia la caché (A3).
  - La review de seguridad (Sonnet) dejó 0 bloqueantes y 2 menores, los dos arreglados. Pasan los 46 tests de web y los 24 de shared. La cobertura de la web es del 80,8 %.
  - Se sumaron las dependencias `firebase`, `react-hook-form`, `@hookform/resolvers` y `zod`. Después del pull hay que correr `pnpm install` en `src/`.
  - El PR [#23](https://github.com/FranLuciano04/Vault-Rumbo/pull/23) **espera la aprobación de Nahuel o Paloma**.
- **Commits:** 1fc29b5, e031caf, a99f480, 940c517.
- **Pendiente:**
  - ✅ Arreglado en la misma sesión: en Windows con WSL, `tickets.mjs fase --test` usaba el `bash` de WSL, que falla sin correr nada, y así un rojo pasaba sin tests. Ahora usa el bash de Git (lo deduce de `git --exec-path`) y, si bash no arranca, cae a la shell del sistema.
  - En la consola de `rumbo-9ff17`, confirmar que el registro de cuentas esté deshabilitado.
  - La protección de `main` no se puede configurar: GitHub la pide con Pro para los repos privados.

## 22/10/26 — Francisco (Claude Opus 5.5) — T-031: catálogo de destinos y control del contrato en el CI
- **Hecho:** T-031 (capa backend, riesgo normal). Es el ABM de destinos y el **patrón que copian T-032 y T-033**:
  - un repositorio, un servicio y un router con `ActorDep`;
  - nombre duplicado → 409, controlado por el servicio y por un **índice único funcional** (migración 0002);
  - búsqueda sin tildes ni mayúsculas, con orden por nombre normalizado;
  - baja y reactivación idempotentes.
  - La normalización de nombres ahora la comparten clientes y destinos.
  - La review (Opus) dejó 0 bloqueantes, 2 importantes y 4 menores, todos arreglados. Pasan 643 tests.
  - El PR [#37](https://github.com/FranLuciano04/Vault-Rumbo/pull/37) se mergeó con el CI en verde.
- **CI nuevo (pedido por Francisco):** el job Backend regenera `openapi.json` y falla si difiere del commiteado, y el job Web hace lo mismo con `tipos.gen.ts`. Salió de un hallazgo de la review: el contrato había quedado desfasado sin que nada avisara.
- **Convención de tests autorizada por Francisco:** las rutas implementadas pasan a `IMPLEMENTADAS` en `test_contrato_m1.py`. Eso las saca de `CASOS_501` y de `NULOS_EN_ANULABLES`.
- **Para el equipo:**
  - Corran `uv run alembic upgrade head` en sus bases de desarrollo, por la migración 0002.
  - Si cambian el contrato, regeneren `openapi.json` y los tipos; si no, el CI ahora falla.
- **Pendiente:** la migración 0002 da un `SyntaxWarning` por `'\s+'` escrito sin string crudo. No rompe nada y se corrige en T-033, que ya lo tiene anotado.
- **Commits:** dc410e4, 8be6f09, a0748e7, b9ca8bc, b77e572, d28e16d y cb6c56d.

## 22/10/26 — Francisco (Claude Opus 5.5) — T-029: parámetros del negocio
- **Hecho:** T-029 (capa backend, riesgo normal). `GET` y `PUT /api/configuracion` ya funcionan, solo para admin y dueña.
  - Los parámetros son la vigencia de la cotización, la anticipación de la alerta de salida y los meses para el recontacto.
  - `negocio/servicios/parametros.py` tiene tres funciones:
    - `obtener(sesion)`: de uso interno y sin rol. **Es la que deben usar los demás módulos.**
    - `ver(sesion, actor)` y `editar(sesion, actor, …)`: exigen rol.
  - Las tres pasan por `RepositorioConfiguracion`, que lee la fila única sembrada por la migración 0001.
  - La review (Opus) dejó 0 bloqueantes, 2 importantes y 3 menores, todos arreglados. Se salteó el paso de refactor porque el diff era chico.
  - Pasan 598 tests y el PR [#35](https://github.com/FranLuciano04/Vault-Rumbo/pull/35) se mergeó con el CI en verde, con el procedimiento nuevo de `/implementar-ticket` 1.1.0.
- **Commits:** 6dbf3cf, 5aaca35, d80c82d y 1228077.
- **Pendiente:** nada.

## 22/10/26 — Francisco (Claude Opus 5.5) — Cierre de pendientes
- **Decisiones de Francisco:**
  - **Comisión de usuarios dados de baja:** se permite, y también al propio admin y a la dueña. Queda anotado en la Revisión de CU-13 y se fija con tests en T-147.
  - **Editar usuarios:** se puede corregir el nombre (CU-25 A2), pero no el email, que identifica la cuenta de Firebase. Se sumó a T-028.
  - **[[DEC-0017 Contacto mínimo del cliente]]:** quedó formalizada. El contacto mínimo es teléfono/WhatsApp o email, y el **Instagram es opcional**. Se alinearon CU-02, CU-03, `Cliente`, RF-001, DGM-ER y el diagrama de clases, y se regeneraron los PNG. También se actualizó el MOC de decisiones.
- **Tickets nuevos:**
  - **T-146:** RF-150 y RF-151 en el código.
  - **T-147:** tests de la comisión de un usuario dado de baja.
  - **T-148:** cobertura a través de los `await`.
  - **T-149:** Instagram del cliente. Ahora T-042, T-045, T-046 y T-048 dependen de él.
  - `tickets.mjs validar` da 149 tickets válidos.
- **Skill:** `/implementar-ticket` pasó a 1.1.0 por `/gestionar-skills`, y se actualizó el catálogo. Cambia el cierre del ticket:
  - se espera el CI sin `--auto`;
  - si hay conflictos, se trae `main` con un merge;
  - se mergea sin `--delete-branch`;
  - la rama se borra recién con el PR en `MERGED`.
- **Avisos:** les quedaron a Nahuel y Paloma.
- **Pendiente:** nada.

## 22/10/26 — Francisco (Claude Opus 5.5) — T-030: comisión por defecto del vendedor
- **Hecho:** T-030 (capa backend, ⚠️ riesgo alto). `PUT /api/usuarios/{id}/comision-por-defecto` ya guarda la comisión o la quita.
  - Solo admin y dueña.
  - El valor se guarda como `Decimal` exacto.
  - Un usuario inexistente da 404.
  - `updated_by` queda con el autor del cambio.
  - No toca los viajes existentes (RF-085).
- **Tests de T-026:** con autorización de Francisco, `test_contrato_m1.py` pasa esa ruta a `IMPLEMENTADAS`, fuera de los casos que esperan 501. Los próximos tickets de M1 suman su ruta ahí.
- **Review de seguridad (Sonnet): aprobable,** con 0 bloqueantes y 0 importantes. De los 2 menores, uno se arregló: el test del rol exigido por el servicio. El otro queda a decidir (ver abajo).
- **Verificación:** 564 tests en verde, con 97,4 % de cobertura total y 94 % en `negocio/`.
- **Commits:** 5e4ea83, 487b5fe, d28cd1e, 6357ee8 y el merge de main 26b8644, que trajo T-040 sin conflictos (582 tests en verde). Paloma aprobó el PR [#33](https://github.com/FranLuciano04/Vault-Rumbo/pull/33) y está **mergeado**.
- **Incidente:** el primer `gh pr merge --merge --delete-branch` falló porque `main` había cambiado (merge de T-040), pero borró igual la rama remota y eso cerró el PR. Se recreó la rama, se reabrió el PR (la aprobación siguió en pie) y se mergeó sin `--delete-branch`; la rama se borró después.
- **Pendiente:** ✅ cerrado el 22/10. La comisión de un usuario dado de baja se permite (se fija con tests en T-147), y la alineación de RF-150 y RF-151 quedó como T-146.

## 22/10/26 — Francisco (Claude Opus 5.5) — T-026: contrato de usuarios y configuración
- **Hecho:** T-026 (capa contrato, riesgo normal). Abre M1 y destraba 36 tickets.
  - Son 24 operaciones de usuarios, parámetros, comisión por defecto, destinos, requisitos y operadores. Responden 501, exigen token y rol, y sus `x-roles` coinciden con el PC1. En shared quedaron los tipos, 24 hooks y 24 mocks (`manejadoresM1`).
  - Bases comunes nuevas en `esquemas/comunes.py`:
    - `Entrada` recorta los espacios;
    - `Edicion` y `omitible()` hacen que un `null` en un campo obligatorio de un PATCH dé 422;
    - `Auditoria` reúne las columnas de auditoría.
  - La review (Opus) dejó 0 bloqueantes, 3 importantes y 6 menores, todos arreglados.
  - El PR [#32](https://github.com/FranLuciano04/Vault-Rumbo/pull/32) tuvo conflictos de unión con T-039 y T-019. Se resolvieron con un merge de `main` (`a15900c`) que conserva los dos aportes, y `openapi.json` y los tipos se regeneraron. Se mergeó con el CI en verde, incluidos Semgrep y gitleaks.
- **Commits:** f3e996d, 710dcda, 8446885, 0421720 y a15900c.
- **Para el equipo:**
  - **Pasen `localhost` a `127.0.0.1` en su `src/backend/.env`** (`DATABASE_URL` y `TEST_DATABASE_URL`). En Windows, `localhost` prueba primero IPv6 y pierde unos 2 s por conexión: la suite de backend baja de unos 14 min a unos 80 s. Ya está en `.env.example`.
  - Corran una sola corrida de pytest a la vez. Dos en paralelo se pisan la base de tests, y una de esas corridas se colgó 15 h.
  - Hay que decidir si `UsuarioEditar` permite corregir el nombre. Hoy solo cambia el rol y `acceso_redes`, según CU-25 A2.
- **Pendiente:** esa decisión sobre `UsuarioEditar`.

## 21/10/26 — Francisco (Claude Opus 5.5) — T-022: shell mobile con pestañas
- **Hecho:** T-022 (capa mobile, riesgo normal).
  - Expo Router con login y las pestañas Agenda, Clientes y Más, con placeholders.
  - Guarda de sesión con `useYo`: muestra «Cargando…»; con un 401 va al login; con otro error muestra un aviso y no entra.
  - El tema usa los tokens de la web y Plus Jakarta Sans.
  - `EXPO_PUBLIC_API_URL` está documentada en `src/apps/mobile/README.md` y en `.env.example`. En el emulador de Android es `10.0.2.2`.
  - La review (Opus) dejó 0 bloqueantes, 2 importantes y 5 menores, todos arreglados. Pasan los 13 tests, con 82,6 % de cobertura. El bundle de Android se genera con `expo export`.
  - El PR [#25](https://github.com/FranLuciano04/Vault-Rumbo/pull/25) se mergeó con el CI en verde.
- **Commits:** 7c66f7a, 615c290, efc7604, 9991159, eb130b1 y el de `tickets: T-022 hecho`.
- **Para el equipo:**
  - Después del pull hay que correr `pnpm install` en `src/`, porque mobile suma `@rumbo/shared` y `@tanstack/react-query`.
  - Se borró `inicio.test.tsx` (humo de T-003), que quedó obsoleto: el caso lo cubre `navegacion.test.tsx`.
- **Incidente:** `tickets.mjs fase` hace `git add -A` y se coló un cambio local de `.obsidian/app.json`, que había hecho Obsidian. Se restauró en la rama con `eb130b1`.
- **Pendiente:** ✅ resuelto en `aad4d42`: `fase` ya no agrega `.obsidian/` a los commits.

## 21/10/26 — Francisco (Claude Opus 5.5) — Limpieza de pendientes viejos
- **Hecho:** a pedido de Francisco se cerraron todos los pendientes que ya no aplicaban:
  - [[Elección del proyecto]] pasó a `formalizado` sin cambios, porque ya se había entregado en el documento general.
  - En [[Estado del proyecto]] se tildaron H3, H4, D1 y D2 del PC1, entregado el 02/10.
  - Quedaron sin efecto la duración de la exposición y la elección de demo en vivo o capturas.
  - Se marcaron como resueltos dos pendientes técnicos: la infraestructura (DEC-0011) y los enums (ratificados el 29/09).
  - Las etiquetas de acciones a decidir que quedaban en notas viejas, ya resueltas, pasaron a «a decidir» (ya resuelto), así que una búsqueda de pendientes da cero. Afecta a la bitácora, el estado, DGM-ER, DEC-0003, DEC-0005 y DEC-0008. `CLAUDE.md` y la Guía del Vault siguen definiendo la convención.
  - La pregunta del 08/10 sobre la IA del producto en el documento general queda cerrada como se entregó.
- **Pendiente:** nada.

## 21/10/26 — Francisco (Claude Opus 5.5) — T-025: e2e del inicio de sesión web
- **Hecho:** T-025 (capa e2e, riesgo normal).
  - Playwright corre 4 e2e contra el Compose real con el Auth Emulator: login de la dueña, credenciales inválidas, usuario no habilitado y cierre de sesión.
  - Los e2e usan su propio proyecto Compose (`rumbo-e2e`, puerto 8081, `down -v` al terminar), así que no tocan la demo local.
  - Se sumó al CI el job «E2e web», que entra en «CI ok». En el PR [#24](https://github.com/FranLuciano04/Vault-Rumbo/pull/24) pasó en 2 min 47 s.
  - La review (Opus) dejó 0 bloqueantes, 2 importantes y 2 menores, todos arreglados. El PR se mergeó con el CI en verde.
- **Commits:** 99a7828, 692941d y el de `tickets: T-025 hecho`.
- **Para el equipo:** los e2e se corren con `npx pnpm e2e` en `src/apps/web` y necesitan Docker. Con `E2E_MANTENER=1` el stack queda levantado para depurar.
- **Pendiente:** nada.

## 21/10/26 — Francisco (Claude Opus 5.5) — C1 a C3: reglas, trazabilidad y glosario
- **Hecho:** los tres recomendados que quedaron del PC1, todos en `borrador` y derivados de notas formalizadas:
  - **C1:** RN-02 a RN-10 (plan de pagos, pago indivisible, baja lógica, ciclo del viaje, cancelación, vigencia de la cotización, alertas automáticas, último administrador y visibilidad).
  - **C2:** [[Matriz de trazabilidad]], con objetivo → CU y CU → entidades y reglas. La parte CU → entidad sale de cruzar los 155 RF.
  - **C3:** [[Glosario]].
  - Se sumaron al [[MOC — Casos de uso]].
  - El cuerpo de las 11 notas queda escrito como documentación, sin referencias internas. Lo interno (origen, `DEC-`, tickets y pendientes) va en `## 🔎 Revisión`, que el `filtrar()` de los entregables recorta. Se verificó pasándolas por ese filtro.
- **Sync del 21/10:** el equipo aprobó los tres y quedaron `formalizado`.
  - En la matriz, los CU de redes (CU-19 y CU-20) van con **O2. Fidelizar clientes**.
  - CU-24 y CU-25 quedan como **soporte transversal**.
- **Pendiente:** nada.

## 21/10/26 — Nahuel (Claude Opus 5.5) — T-145: error controlado sin proyecto de Firebase
- **Hecho:** T-145 (capa backend, riesgo alto, `origen: hallazgo T-016`). Si falta `FIREBASE_PROJECT_ID`, un pedido autenticado ahora responde un 502 `ServicioExterno` en `problem+json` (antes era un 500 sin formato) y deja un log de error, sin traza, que nombra la variable. El código 502 lo confirmó Nahuel antes del rojo.
  - La review de seguridad (Sonnet) dio aprobable: confirmó que ningún caso que debe dar 401 pasa a dar 502. Se arregló 1 menor (sacar la traza del log, que podía llevar el token).
  - Pasan los 266 tests de backend; la cobertura es del 97 %.
  - Francisco mergeó el PR [#26](https://github.com/FranLuciano04/Vault-Rumbo/pull/26) con el CI en verde, aunque en GitHub no quedó registrada una review formal.
- **Commits:** 159b492, 3d79306, a3cd3f9, 1534123 (merge 403f7d1).
- **Pendiente:**
  - Dos menores anotados en el ticket: el log se repite en cada pedido mientras falte la variable, y falta un test de que `Bearer ` vacío da 401.
  - Con `projectId` configurado pero sin credenciales, `DefaultCredentialsError` daría 500. Todavía no tiene ticket.

## 20/10/26 — Nahuel (Claude Opus 5.5) — T-144: OpenAPI exportado con LF
- **Hecho:** T-144 (capa backend, riesgo normal, `origen: hallazgo T-016`). `exportar_openapi` escribe con `newline="
"`, así que en Windows ya no sale CRLF.
  - Los tests nuevos están en `tests/test_cli_openapi.py`. La review con Opus no dejó hallazgos.
  - Pasan los 262 tests de backend; la cobertura es del 97 %.
  - El PR [#22](https://github.com/FranLuciano04/Vault-Rumbo/pull/22) se mergeó con `--auto` en el momento, **sin esperar al CI**, porque `main` todavía no exige el check «CI ok». Es el aviso pendiente de Francisco.
- **Commits:** 4c4c2bb, c01440f, 9c916f4 (merge fcd710a).
- **Pendiente:** T-145 (error controlado sin proyecto de Firebase).

## 20/10/26 — Nahuel (Claude Opus 5.5) — T-016: usuario de la sesión con su rol
- **Hecho:** T-016 (capa backend, riesgo alto). Ahora `GET /api/auth/yo` devuelve id, nombre, email, rol y `acceso_redes`, y responde 401 si el usuario está inactivo o el token falta o no es válido.
  - La regla de `acceso_redes` quedó en `negocio/politicas.py` (`tiene_acceso_redes`): da verdadero siempre para admin y dueño, y para los demás roles sale de la columna (DEC-0013).
  - Con autorización de Nahuel se adaptó el test de contrato que afirmaba el 501: ahora afirma un 401 con token inválido.
  - Se regeneraron `openapi.json` y `tipos.gen.ts`.
  - La review de seguridad (Sonnet) dio aprobable, con 1 menor anotado en el ticket. Pasan los 260 tests de backend. La cobertura es del 97 % en todo el backend y del 95,65 % en `negocio/`.
  - Paloma mergeó el PR [#21](https://github.com/FranLuciano04/Vault-Rumbo/pull/21), aunque en GitHub no quedó registrada una review formal.
- **Commits:** afd1a76, 174cda8, f67a59e, 1ae2724 (merge 0f12c3d).
- **Pendiente:**
  - Hallazgos fuera de alcance, ya cargados como tickets:
    - T-144: en Windows, el CLI `exportar-openapi` escribe los archivos con CRLF.
    - T-145 (riesgo alto): si Firebase no tiene project ID, `VerificadorFirebase` responde 500 en vez de un error controlado. El código propuesto es 502 y hay que confirmarlo al tomar el ticket.
  - Destraba T-021, el login web.

## 20/10/26 — Nahuel (Claude Opus 5.5) — T-143: tests del layout raíz mobile
- **Hecho:** T-143 (capa mobile, riesgo normal, `origen: hallazgo T-018`).
  - Son tests de caracterización de `_layout.tsx` en `__tests__/layout.test.tsx`. No hubo rojo ni verde, porque el código ya existía; en su lugar se hizo una prueba de mutación: con `headerShown: true`, fallan 2 de los 4 tests.
  - La cobertura de mobile pasó de 50 % a 100 %.
  - La review con Opus dejó 0 bloqueantes y 2 menores; se arregló uno.
  - En el PR [#20](https://github.com/FranLuciano04/Vault-Rumbo/pull/20), el CI corrió solo Mobile y se saltó Backend y Web. Eso confirma en un PR real el filtro por carpeta de T-018. El PR está mergeado.
- **Commits:** 25445c9, 524a544, a63d6c7 (merge d78458b).
- **Pendiente:** el test depende del host component `RNSScreenStackHeaderConfig`. Ante un upgrade de react-native-screens hay que revisarlo.

## 20/10/26 — Nahuel (Claude Opus 5.5) — T-018: CI con jobs filtrados por carpeta
- **Hecho:** T-018 implementado (capa infra, riesgo normal, verificado en GitHub con el propio PR).
  - `.github/workflows/ci.yml` tiene los jobs `cambios` → Backend, Web y Mobile, y el agregador «CI ok».
  - Los push de claims no disparan builds.
  - En el PR #19, Backend, Web y la detección de cambios pasaron. Mobile falló solo por cobertura.
  - Decidido con Nahuel:
    - Mobile mantiene el 70 %; el test faltante va en **T-143** (creado, `origen: hallazgo T-018`).
    - `allowBuilds` en `src/pnpm-workspace.yaml`.
    - El PR se mergeó con Mobile en rojo, a sabiendas.
  - La review con Opus dejó 0 bloqueantes, 1 importante y 3 menores; todos se arreglaron.
  - PR [#19](https://github.com/FranLuciano04/Vault-Rumbo/pull/19) mergeado.
- **Commits:** 85fd960, 3233b82, 31f76a6 (merge 157c831); ticket 2ff04bc.
- **Pendiente:**
  - Francisco configura la protección de `main` con «CI ok» (aviso arriba).
  - T-143.
  - `@rumbo/shared` sin umbral de cobertura y sin `format:check` del front en el CI.

## 19/10/26 — Nahuel (Claude Opus 5.5) — T-024: Compose de producción local
- **Hecho:** T-024 implementado (capa infra, riesgo normal, sin TDD: se verificó levantando el stack).
  - `docker compose -f src/docker-compose.yml up -d --build` levanta postgres, la API (corre las migraciones al arrancar), el scheduler y nginx con la web. El puerto se cambia con `RUMBO_HTTP_PORT`.
  - `src/docker-compose.e2e.yml` suma el Auth Emulator y fija `IA_MODELO=falso`.
  - Al volver de e2e a producción local, usar `--remove-orphans`.
  - Cada integrante necesita un `src/.env` con `RUMBO_DB_PASSWORD` alfanumérica.
  - La review con Opus dejó 0 bloqueantes y 5 menores; los 5 se arreglaron.
  - PR [#18](https://github.com/FranLuciano04/Vault-Rumbo/pull/18) mergeado (sin CI todavía).
- **Commits:** af54015, 8fe8f2c, 1455b07 (merge d749f04).
- **Pendiente:**
  - `auth-emulator` no tiene healthcheck.
  - El crontab del scheduler es de M7.
  - La cuenta de servicio de Firebase y el servidor real son de M10.

## 19/10/26 — Nahuel (Claude Opus 5.5) — T-017: dueña inicial con la CLI de datos
- **Hecho:** T-017 implementado con TDD (capa backend, riesgo normal).
  - `datos-iniciales --nombre --email [--demo]` (o `DUENA_NOMBRE` / `DUENA_EMAIL`) crea la cuenta de Firebase y el `Usuario` `dueno` de forma idempotente. Normaliza el email, actualiza un `firebase_uid` desactualizado y rechaza emails de no dueños o dados de baja.
  - Las semillas de demo se registran en `rumbo.datos.semillas.SEMILLAS`; en M0 está vacío.
  - La review con Opus dejó 0 bloqueantes, 2 importantes y 3 menores. Se arreglaron los importantes y 2 menores; los otros quedaron anotados en el ticket.
  - Hay 248 tests en verde, con 96,7 % de cobertura. PR [#16](https://github.com/FranLuciano04/Vault-Rumbo/pull/16) mergeado (sin CI todavía).
  - En esta PC, pytest falla con `PermissionError` en `AppData\Local\Temp\pytest-of-test123`; se corre con `--basetemp=C:/Users/test123/rumbo-pytest-tmp`.
- **Commits:** e2bd19e, efe547d, 4b21c06, fd13405, d2d4e8d (merge 9df00b9).
- **Pendiente:** `crear_cuenta` no se probó contra el Auth Emulator real. Mover la orquestación de `datos-iniciales` a `negocio` (menor de la review).

## 19/10/26 — Nahuel (Claude Opus 5.5) — T-011: auditoría automática del autor
- **Hecho:** T-011 implementado con TDD (capa backend, riesgo normal).
  - Un listener `before_flush` en `core/db.py` completa `created_by`/`updated_by` desde la ContextVar `usuario_auditoria`. Detecta las filas por columnas, así `core` no importa la capa de datos.
  - Una modificación sin usuario deja `updated_by = None` (decidido en la sesión).
  - Restricción documentada en el docstring: un `update()` masivo no completa `updated_by`, así que los repositorios modifican vía ORM.
  - La review con Opus dejó 0 bloqueantes, 2 importantes y 3 menores; se arreglaron todos.
  - Hay 233 tests en verde, con 96 % de cobertura. PR [#15](https://github.com/FranLuciano04/Vault-Rumbo/pull/15) mergeado (sin CI todavía).
  - Docker Desktop no arrancaba: había sockets AF_UNIX trabados en `%LOCALAPPDATA%\Docker\run` y en `%LOCALAPPDATA%\docker-secrets-engine`. Se resolvió renombrando esas carpetas a `*.viejo-…`. Pasa cuando Docker se cierra a la fuerza.
- **Commits:** 3c4fa8a, 04d05b0, 8e2af7c, 77a8d59 (merge 8708fea).
- **Pendiente:** si un repositorio necesita `update()` masivo, sumar un listener `do_orm_execute` (hallazgo de la review de T-011).

## 20/10/26 — Paloma (Claude Opus 5.5) — T-003: app mobile con Expo development build
- **Hecho:** T-003 implementado y mergeado (PR [#17](https://github.com/FranLuciano04/Vault-Rumbo/pull/17), capa infra, riesgo normal).
  - `src/apps/mobile` (`@rumbo/mobile`): Expo SDK 58, RN 0.88, React 19.3.0, Expo Router, NativeWind 4 y Jest.
  - El development build quedó verificado en el emulador Pixel_7: muestra «Rumbo» con NativeWind aplicado.
  - Review (Opus): 5 menores, todos arreglados.
  - Bug encontrado al generar el build: la pantalla salía negra porque faltaba `expo-splash-screen`.
- ⚠️ **Para compilar mobile en Windows** hay que activar `LongPathsEnabled=1` (como admin) e instalar CMake 3.31.6 con `cmake.dir` en `android/local.properties`, porque las rutas de pnpm superan los 260 caracteres. Está en `src/apps/mobile/README.md`. En la PC de Paloma ya está hecho.
- **Commits:** 680eb4f, 4a6887e, 2b9a149, ce28359 (merge ef5e74f).
- **Pendiente:**
  - Equipo: cuando se arme el CI, decidir `approve-builds` o `allowBuilds` para `ERR_PNPM_IGNORED_BUILDS` (`msw`, `@parcel/watcher` y `unrs-resolver`).
  - Paloma: tomar el siguiente ticket.

## 19/10/26 — Paloma (Claude Opus 5.5) — T-005: proyecto de Firebase y emulador
- **Hecho:** T-005 implementado (capa infra, ⚠️ riesgo alto).
  - Archivos: `src/firebase.json`, `src/.firebaserc` (`demo-rumbo`), `src/infra/firebase.md` (uso del emulador, checklist de consola endurecido y variables por entorno), `src/apps/web/.env.example` (`VITE_FIREBASE_*`) y `.gitignore` de la cuenta de servicio.
  - Verificado: el emulador arranca y crea una cuenta por REST; gitleaks no encuentra fugas en el historial.
  - Review de seguridad (Sonnet): 0 bloqueantes; 2 importantes y 2 menores arreglados.
  - Desvío del plan: la config pública del SDK web va en `.env` y no se versiona (gitleaks marca `AIza…`). Si el equipo quiere versionarla, hace falta una allowlist de gitleaks.
  - PR [#14](https://github.com/FranLuciano04/Vault-Rumbo/pull/14) abierto, **sin mergear**.
- **Commits:** e20c8b4, c82676d, b83efc7 (en la rama `feature/T-005-…`).
- **Pendiente:**
  - ✅ Checklist de consola hecho por Paloma: proyecto **`rumbo-9ff17`**. `accounts:signUp` responde `ADMIN_ONLY_OPERATION`. La cuenta de servicio `rumbo-backend` tiene solo el rol de Auth y verifica bien (`4f98195`).
  - Nahuel o Francisco: aprobar el PR #14. Después, Paloma corre `/implementar-ticket T-005` para mergearlo.
  - ✅ [[Skills compartidas]] corregida: el emulador de Auth no necesita Java 17. Siguen diciendo «con Java» la [[Spec de implementación]] §Stack y [[DEC-0016 Autenticación con Firebase|DEC-0016]] §8, que son notas formalizadas: el equipo decide si se ajustan.

## 19/10/26 — Paloma (Claude Opus 5.5) — entorno local para implementar
- **Hecho:** Paloma instaló y autenticó el GitHub CLI (`gh`) y armó sus `src/.env` y `src/backend/.env` desde los ejemplos (base de desarrollo en el puerto 5434 porque el 5432 lo ocupa un PostgreSQL de Windows). Leyó los avisos del 18/10 sobre `ENTORNO` y el `.env`; se borraron sus filas.
- **Commits:** este.
- **Hecho (continuación):** Docker Desktop abierto y bases levantadas (`rumbo-postgres-dev` en 5434 y `rumbo-postgres-test` en 5433). La suite del backend da 227 tests en verde en su PC.
- **Pendiente:** tomar su primer ticket.

## 18/10/26 — Francisco (Claude Opus 5.5) — T-010: verificar el token de Firebase
- **Hecho:** T-010 implementado con TDD (capa backend, ⚠️ riesgo alto).
  - `usuario_actual` verifica el ID token con firebase-admin 7.7.0 sin bloquear el servidor. Carga al `Usuario` activo por `firebase_uid` y lo deja en la contextvar de auditoría, que se limpia al terminar cada pedido.
  - Sin token, con un token inválido, vencido o revocado, con un uid desconocido o con un usuario inactivo responde 401 problem+json. Una falla de Firebase da 502 o 500 sin detalles.
  - La review de seguridad (Sonnet, en dos rondas) encontró **1 bloqueante**: el emulador de Firebase venía activo en `.env.example` y, si llegaba al servidor, permitía entrar como cualquier usuario con un token sin firma.
  - Se cerró con la variable `ENTORNO` (decidida por Francisco): el backend no arranca si hay emulador fuera de `desarrollo`.
  - Hay 227 tests en verde. PR [#13](https://github.com/FranLuciano04/Vault-Rumbo/pull/13) abierto, **sin mergear: espera la aprobación de Nahuel o Paloma antes del merge**.
- ⚠️ **Variable nueva para el equipo** (ver [[Trabajo en equipo — Git y memoria#Entorno local para probar el código (`.env`)|avisos del `.env`]]): `ENTORNO` (`desarrollo` | `produccion`, `produccion` por defecto). **Solo quien use el emulador de Firebase** tiene que agregar `ENTORNO=desarrollo` a su `src/backend/.env`; los tests no la necesitan. En el servidor se omite. Además se suman `FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS` y `FIREBASE_AUTH_EMULATOR_HOST`, documentadas en `src/backend/.env.example`.
- **Commits:** 65499df, 252a6eb, 394fe52, 895eb5c, 75cb779 (en la rama `feature/T-010-…`).
- **Pendiente:**
  - Aprobar el PR #13 (Nahuel o Paloma). Después, Francisco corre `/implementar-ticket T-010` para mergearlo.
  - T-005 tiene que documentar estas variables para el servidor.

## 18/10/26 — Francisco (Claude Opus 5.5) — T-012: visibilidad por fila según el rol
- **Hecho:** T-012 implementado con TDD (capa backend, ⚠️ riesgo alto).
  - `negocio/politicas.py` decide qué ve y qué escribe cada rol.
  - `RepositorioBase` exige la visibilidad como parámetro obligatorio y responde 404 tanto si la fila no existe como si no se puede ver.
  - Para el `freelance` todo está cerrado por defecto. Ve sus clientes, las operaciones donde el cliente es suyo o él es el responsable (DEC-0008 §3), y lo que cuelga de ellas.
  - Las reseñas `oculta` las ven solo `admin` y `dueño` (CU-29). Lo decidió Francisco.
  - Los errores de dominio pasaron a `core/errores.py`, y `negocio/` los reexporta.
  - La review de seguridad (Sonnet) dejó 0 bloqueantes y 3 importantes, todos arreglados.
  - Hay 191 tests en verde y 97 % de cobertura.
  - PR [#12](https://github.com/FranLuciano04/Vault-Rumbo/pull/12) **mergeado por Francisco el 18/10 sin la aprobación de otro integrante**, que es lo que pide DEC-0014 para riesgo alto (merge 8796705, grafo 8d2973d). La review se hace después del merge: ver *Pendiente*.
- **Entorno:** se armaron los `.env` locales. La base de desarrollo usa el puerto 5434, porque esta PC tiene un PostgreSQL instalado en Windows. También se sumó a [[Trabajo en equipo — Git y memoria]] la sección de avisos sobre el `.env` (commit `44f5cc2`).
- **Commits:** d6c9cce, 839302c, d1898c5, e4f1ea0, 6f71d15 (en la rama `feature/T-012-…`).
- **Pendiente:**
  - ✅ **Review posterior del PR #12:** Nahuel lo aprobó en GitHub el 18/10 a las 21:15 (APPROVED, con el comentario «Its ok.»). No pidió cambios.
  - Confirmar en equipo el criterio del responsable cuando se reasigna un cliente.
  - La paginación de `listar` queda para el primer módulo que lo use.

## 18/10/26 — Francisco (Claude Opus 5.5) — T-020: shell web con la navegación por rol
- **Hecho:** T-020 implementado con TDD (capa web).
  - Shell del prototipo: barra lateral y encabezado con nombre y rol.
  - Rutas protegidas con `/auth/yo`: con 401 van a `/login` y con otro error muestran un alerta.
  - Navegación según «Vistas por rol», en `app/navegacion.ts`.
  - Tokens del Figma, y `lib/formato.ts` para importes ARS/USD (sin floats, half-up) y fechas `dd/mm/aa`.
  - La fuente Plus Jakarta Sans se sirve desde la app con `@fontsource/plus-jakarta-sans`, sin pedidos a Google (RNF-16, DEC-0011). Es una dependencia nueva, aprobada por Francisco.
  - Con autorización se reemplazó el `App.test.tsx` placeholder de T-002 y se corrigió el lint de dos tests del rojo.
  - La review con Opus dejó 0 bloqueantes, 2 importantes y 4 menores, y se arreglaron todos.
  - Hay 35 tests en verde en la web y 24 en shared, con 87 % de cobertura. PR [#11](https://github.com/FranLuciano04/Vault-Rumbo/pull/11) mergeado (sin CI todavía).
- **Commits:** e424e71, 75c248e, edec81b, a6b61a3, 782c1ca (merge 7f2843f), grafo b9cde4d.
- **Pendiente:**
  - Quedan para tickets posteriores los íconos por sección, la barra lateral responsive y cerrar sesión (con el login).
  - En esta PC `pnpm` no está en el PATH: se usa `corepack pnpm`.
  - Al instalar sigue el aviso `ERR_PNPM_IGNORED_BUILDS` de msw, que ya venía de antes.
- **Después del ticket:**
  - Se puso el tag `pc1` en `8661dd2`, el último commit antes de la entrega del 02/10 (D3).
  - Se crearon T-141 (íconos de la navegación) y T-142 (barra lateral en pantallas angostas), con `origen: hallazgo T-020`.
  - El documento general figura como entregado.
  - C1–C3 quedan anotados como pendientes en el estado del proyecto.

## 16/10/26 — Nahuel (Claude Opus 5.5) — T-008: migración inicial de Alembic
- **Hecho:** T-008 implementado con TDD (capa backend).
  - Alembic async con la migración `0001`, que reproduce `rumbo.sql` (20 enums, 15 tablas y la fila de `configuracion`).
  - `alembic check` no encuentra diferencias con los modelos, y la base de tests ahora se arma con la migración.
  - `rumbo.sql` corrió sin errores contra PostgreSQL.
  - Con autorización se tocó la fixture `bd` de `test_modelos.py`, porque la base migrada ya trae la fila de `configuracion`.
  - La review con Opus dejó 2 bloqueantes (`prepend_sys_path` y lectura de `.env`) y 4 menores; se arreglaron todos menos uno.
  - Hay 118 tests en verde, con 96 % de cobertura. PR [#10](https://github.com/FranLuciano04/Vault-Rumbo/pull/10) mergeado (sin CI todavía).
- **Commits:** d7b99a7, 6d2b3f4, cdb8475, 0ff4980 (merge 61e5486), grafo aa26f30.
- **Pendiente:**
  - `prepend_sys_path = .` depende del cwd; se podría usar `%(here)s` (menor).
  - En Windows, pytest necesita `--basetemp` fuera del temp del sistema (acceso denegado).

## 16/10/26 — Nahuel (Claude Opus 5.5) — T-015: contrato base con el usuario de la sesión
- **Hecho:** T-015 implementado con TDD (capa contrato).
  - `GET /api/auth/yo` es un stub: responde 401 problem+json sin Bearer y 501 con Bearer.
  - Esquemas `Problema`, `ErrorCampo`, `UsuarioActual` y `Pagina`.
  - Las respuestas de error se publican como problem+json → `Problema`.
  - Comando `exportar-openapi`. El `openapi.json` de shared ya sale del backend y reemplaza al provisorio de T-014.
  - En shared: `useYo` (TanStack Query, sin reintentos ante un 401) y el mock `usuariosPorRol`/`manejadorYo`.
  - Queda confirmado el formato `errores: {campo, mensaje}[]`: el handler del 422 ahora lo cumple.
  - La review con Opus dejó 0 bloqueantes, 2 importantes y 4 menores; se arreglaron todos menos uno. PR [#9](https://github.com/FranLuciano04/Vault-Rumbo/pull/9) mergeado (sin CI todavía).
- **Commits:** c575756, 56204ef, dc41ea4, 5753968 (merge ec16b40), grafo 0e0d331.
- **Pendiente:**
  - El componente `Pagina` genérico queda huérfano (menor).
  - `cli.py` no tiene cobertura.
  - La operación de salud usa un `operationId` automático: conviene fijar `generate_unique_id_function`.
  - Los puertos de Postgres en Docker local (5434/5435) no coinciden con la spec (5432/5433).

## 15/10/26 — Nahuel (Claude Opus 5.5) — T-014: tipos compartidos desde el OpenAPI
- **Hecho:** T-014 implementado con TDD (capa shared). `@rumbo/shared` incluye:
  - `generar`: corre openapi-typescript para producir `tipos.gen.ts`.
  - `crearCliente`: Axios que agrega el ID token de `obtenerToken` y traduce problem+json a `ErrorApi`.
  - Mocks MSW en `@rumbo/shared/mocks`.
  - 13 tests. La review con Opus dejó 0 bloqueantes, 3 importantes y 5 menores, todos arreglados.
  - PR [#8](https://github.com/FranLuciano04/Vault-Rumbo/pull/8) mergeado (sin CI todavía).
- **Commits:** fdcd8d5, 5e4bf43, feb1b4e, fbfce20 (merge d6ffb25), grafo e6d11db.
- **Pendiente:**
  - `openapi.json` es provisorio y está hecho a mano. Hay que reemplazarlo por el que exporte el backend (`exportar-openapi`) en el primer ticket de contrato.
  - Falta confirmar el formato `errores: {campo, mensaje}[]`.
  - Falta probar los mocks en Jest (mobile).
  - `@rumbo/shared` no tiene proveedor de cobertura.

## 15/10/26 — Nahuel (Claude Opus 5.5) — T-002: workspace pnpm con la app web
- **Hecho:** T-002 implementado con el flujo de [[Flujo de implementación|DEC-0014]] (infra, sin TDD).
  - El workspace vive en `src/` y contiene `apps/web`: React, Vite, TypeScript estricto, React Router v8, Tailwind v4, shadcn/ui inicializado a mano, y Vitest con Testing Library.
  - La review con Opus dejó 2 hallazgos importantes y 3 menores. Los importantes y uno de los menores se arreglaron en el fix; los otros 2 menores quedaron anotados en el ticket.
  - Se corrigió el comando de cobertura de la Spec §4: ahora es `test:cobertura`, porque `test -- --coverage` no medía nada.
  - PR [#7](https://github.com/FranLuciano04/Vault-Rumbo/pull/7) mergeado con el OK de Nahuel.
- **Commits:** 93a7ce2, 52bda16, 2f48b36 (merge 1fe9287), grafo 31cde7e.
- **Entorno:** pnpm se usa con `corepack pnpm`, así que cada integrante tiene que correr `corepack enable`. En Windows, `tickets.mjs fase --test` hay que correrlo desde Git Bash: en PowerShell, `bash` resuelve al de WSL.
- **Pendiente:** sacar `minimumReleaseAgeExclude` de `pnpm-workspace.yaml` cuando vitest y jsdom superen la antigüedad mínima. El primer `shadcn add` necesita pnpm en el PATH.

## 15/10/26 — Nahuel (Claude Opus 5.5) — T-007: modelos SQLAlchemy del ER
- **Hecho:** T-007 implementado con el flujo de [[Flujo de implementación|DEC-0014]].
  - Los 15 modelos y los 20 enums viven en `rumbo/datos/modelos/` y tienen sus fábricas en `tests/fabricas.py`.
  - Hay 96 tests y la cobertura del backend es 99 %.
  - La review con Opus dejó 3 hallazgos importantes y 5 menores; todos se arreglaron en el fix.
  - PR [#6](https://github.com/FranLuciano04/Vault-Rumbo/pull/6) mergeado a mano por Nahuel: el sandbox bloqueó el merge automático sin review.
- **Commits:** 333a8ce, 79c9860, 1ad7d12, 38f9d3a (merge 952e7de).
- **Desvío:** `updated_at` usa `onupdate=func.now()` porque el SQL no tiene trigger. Está anotado en el ticket.
- **Entorno:** en el sandbox, pytest necesita `--basetemp` dentro del scratchpad porque `%TEMP%\pytest-of-*` da acceso denegado.
- **Pendiente:** las migraciones de Alembic, que son el ticket siguiente y deben partir de esta metadata.

## 14/10/26 — Nahuel (Claude Opus 5.5) — T-140: tests aislados de SSLKEYLOGFILE
- **Hecho:** T-140 implementado con el flujo de [[Flujo de implementación|DEC-0014]].
  - `tests/conftest.py` quita `SSLKEYLOGFILE` antes de cualquier conexión. Ya no hace falta correr `env -u SSLKEYLOGFILE`; la spec §4 está actualizada, así que el consejo de la entrada de T-006 quedó obsoleto.
  - Hay 33 tests, la cobertura del backend es 97 % y la review con Opus no dejó hallazgos.
  - PR [#5](https://github.com/FranLuciano04/Vault-Rumbo/pull/5) mergeado.
- **Commits:** ffe2a50, ca5a1be, 7ea62a6 (merge 8de2a1d).
- **Desvío:** `tickets.mjs fase verde` trata `conftest.py` como test y rechazó el cambio. El `feat` se commiteó a mano, con la autorización de Nahuel y el trailer «Tests-autorizados: sí».
- **Pendiente:** decidir si `fase verde` debe aceptar cambios en `conftest.py` cuando el ticket lo pide.

## 14/10/26 — Nahuel (Claude Opus 5.5) — T-006: sesión async de la base y configuración
- **Hecho:** T-006 implementado con el flujo de [[Flujo de implementación|DEC-0014]].
  - `core.config.Settings` exige `DATABASE_URL` con `postgresql+asyncpg://`; sin eso, la app no arranca.
  - `core.db` da una sesión por pedido con una sola transacción. Los routers la piden **solo con `SesionDep`** (`scope="function"`).
  - La review con Opus encontró un bloqueante: con el scope por defecto de FastAPI, el commit corría después de enviar la respuesta y un commit fallido devolvía 200. Se arregló y lo cubre un test con una FK diferida.
  - `conftest.py` tiene una sesión por test con rollback y un `AsyncClient`. Hay 32 tests y la cobertura del backend es 97,2 %.
  - PR [#4](https://github.com/FranLuciano04/Vault-Rumbo/pull/4) mergeado.
- **Commits:** 7ddd318, 95d4705, eaec44c, 0024964 (merge 605c86c).
- **Entorno:** el sandbox de Claude Code define `SSLKEYLOGFILE` y, en Windows, asyncpg aborta con `OPENSSL_Applink`. Se evita corriendo los tests con `env -u SSLKEYLOGFILE`. En la PC de Nahuel, Rumbo usa los puertos 5434 y 5435, porque 5433 lo ocupa otro proyecto.
- **Pendiente:** dos menores anotados en el ticket:
  - el test de aislamiento depende del orden de ejecución;
  - no hay `motor.dispose()` al apagar. Queda para el lifespan.

## 14/10/26 — Nahuel (Claude Opus 5.5) — T-004: PostgreSQL de desarrollo con Docker Compose
- **Hecho:** T-004 implementado con el flujo de [[Flujo de implementación|DEC-0014]]. `src/docker-compose.dev.yml` con dos `postgres:18`: dev en 5432, con volumen, y test en 5433, en `tmpfs`. Escuchan solo en 127.0.0.1 y toman las credenciales obligatorias de `src/.env` (plantilla `src/.env.example`). `src/backend/.env.example` trae `DATABASE_URL` y `TEST_DATABASE_URL`. Los puertos se pueden cambiar con `RUMBO_DEV_PORT` y `RUMBO_TEST_PORT`, porque en la PC de Nahuel 5432 y 5433 estaban ocupados. La review con Opus dejó 3 hallazgos menores, todos arreglados (entre ellos, el healthcheck ahora va por TCP). PR [#3](https://github.com/FranLuciano04/Vault-Rumbo/pull/3) mergeado.
- **Commits:** 0359ee8, 548e127, f7cdbec (merge 5ad0d90).
- **Pendiente:** verificar el arranque con los puertos por defecto en una PC donde estén libres. Ratificar que un solo Compose con dos servicios cumple DEC-0015 §1, que habla de «otro, aparte, para los tests».

## 14/10/26 — Nahuel (Claude Opus 5.5) — T-009: errores problem+json y paginación
- **Hecho:** T-009 implementado con el flujo de [[Flujo de implementación|DEC-0014]]. Manejadores problem+json para las excepciones de dominio, `HTTPException`, la validación 422 (con la lista `errores`) y un 500 genérico que no filtra detalles. Dependencia común de paginación (`pagina`, `por_pagina` ≤ 100, 20 por defecto) y `Pagina[T]`. La review con Opus encontró que las subclases de las excepciones de dominio respondían 500, porque el estado se buscaba por tipo exacto; se corrigió con `isinstance` y tests nuevos. 22 tests, cobertura del backend 97,9 %. PR [#2](https://github.com/FranLuciano04/Vault-Rumbo/pull/2) mergeado.
- **Commits:** 82cda4c, 1ead4bf, 4eb0557, de5e084 (merge c176046).
- **Pendiente:** decisiones que el contrato no fija y conviene ratificar: `por_pagina` por defecto 20 y no incluir el campo `type` del RFC 9457. Queda sin test el caso de `HTTPException` con un `detail` que no es texto.

## 14/10/26 — Nahuel (Claude Opus 5.5) — T-001: backend con uv y FastAPI
- **Hecho:** primer ticket implementado con el flujo de [[Flujo de implementación|DEC-0014]]. `src/backend` con Python 3.13, uv, FastAPI (`GET /api/salud`), las capas de ARQ, ruff, mypy, pytest y cobertura ≥ 70 %. La review con Opus encontró que `strict = true` en un override de mypy 2.4 se aplica a todo el proyecto; se corrigió con flags explícitos. Se agregó a la spec §4 el comando de cobertura de `negocio/` ≥ 80 %. PR [#1](https://github.com/FranLuciano04/Vault-Rumbo/pull/1) mergeado.
- **Commits:** 64fe1c2, be65483, 3a5aa0c (merge 7dc0615).
- **Pendiente:** en PCs con proxy TLS, `uv` necesita `UV_SYSTEM_CERTS=1`. No se midió el uso de tokens de forma exacta.

## 14/10/26 — Nahuel (Claude Opus 5.5) — precarga de skills de los reviewers
- **Hecho:** se probó la precarga de skills de `reviewer-ticket` y `reviewer-seguridad`: sin abrir archivos, cada uno citó textualmente las skills de su frontmatter `skills:` (2 y 3) y las citas coinciden con los `SKILL.md`. Resuelve el pendiente de confirmar la precarga. Se corrigió el bloque «Adaptación Rumbo» de `security-and-hardening`, que todavía hablaba de autenticación propia: ahora remite a [[DEC-0016 Autenticación con Firebase|DEC-0016]] (verificación del *ID token*, `firebase_uid`, `401` si el usuario no existe o está inactivo, cuenta de servicio en el `.env`). Catálogo en [[Skills compartidas]] actualizado.
- **Pendiente:** implementar el primer ticket en una sesión limpia y medir su uso de tokens.

## 14/10/26 — Nahuel, con Francisco y Paloma (Claude Opus 5.5) — plan aprobado
- **Hecho:** el equipo aprobó el [[Plan de implementación]] y los 139 tickets; el plan quedó formalizado.
- **Optimización de tokens (mismo día):** se midieron T-001 (~840 mil tokens equivalentes, 4 % de la sesión de 5 h) y T-009 (flujo completo; subagentes 162,7 mil). Se confirmaron tres fuentes de gasto y se aplicaron sus arreglos, aprobados por el equipo y registrados en [[DEC-0014 Flujo de implementación con agentes|DEC-0014]]:
  - El fix ahora lo hace el implementador del verde, continuado con `SendMessage`; Haiku ya no hace los arreglos.
  - Nuevo `tickets.mjs fase T-NNN <rojo|verde|refactor|fix|hecho>`: controla que los tests sigan intactos (sale con código 2 si cambiaron; `--tocar-tests` para un fix autorizado), commitea y sube en una llamada. Probado en un repo de prueba.
  - Los implementadores precargan menos skills; `debugging-and-error-recovery`, `source-driven-development` y `shipping-and-launch` se invocan a demanda (sumaron la herramienta Skill).
- **Medición de T-006 (mismo día):** el fix continuado sumó 5,9 mil tokens, contra ~36 mil de un subagente nuevo, y las skills precargadas del implementador bajaron del 22 % al 7 %. La sesión principal perdió ~15 pasos en problemas del entorno (`SSLKEYLOGFILE`, temporal, puertos), que quedaron en la spec §4.
  - `tickets.mjs fase` acepta `--test "<cmd>"`: corre los tests en la misma llamada (tienen que fallar en el rojo y pasar en el resto) y no commitea si no se cumple. Probado en un repo de prueba.
  - Los implementadores formatean y corrigen el lint antes de devolver.
  - Ticket nuevo T-140 (hallazgo T-006): que el `conftest` quite `SSLKEYLOGFILE`.
  - Se descartó saltear el refactor en los tickets chicos.
- **Código navegable y arquitectura (mismo día):**
  - La spec §6 suma «Código navegable»: cada cosa en su capa, reutilizar antes de escribir, seguir el patrón vecino, nombres del dominio, funciones cortas con docstring de CU o RF, y nada de código muerto.
  - Los implementadores y el simplificador lo siguen.
  - `review-de-ticket` suma el punto «Arquitectura y navegabilidad», clasificado como importante.
  - `fase verde` acepta `--tocar-tests` con autorización explícita, para archivos de soporte en `tests/` como `conftest.py` (el desvío de T-140).
- **Pendiente:** reiniciar Claude Code para que cargue las definiciones nuevas.

## 13/10/26 — Nahuel, con Francisco y Paloma (Claude Opus 5.5) — grill y spec de implementación
- **Paso 3, plan y tickets (mismo día):** el equipo aprobó la [[Spec de implementación]] (formalizada; se sumó `pydantic-settings` a §3). Con `planning-and-task-breakdown` se escribió el [[Plan de implementación]] (`en-revision`) y se crearon **139 tickets** (T-001 a T-139) en los 11 módulos: contrato primero, backend por CU o flujo, web y mobile por pantalla, un e2e por módulo (dos en M6). El proyecto de Firebase es T-005. Prioridad del PC2: los 79 tickets del camino de CU-01 (T-108). `tickets.mjs validar` da 139 válidos y el [[Grafo de tickets]] quedó regenerado; arrancan disponibles T-001, T-002, T-004 y T-005.
- **Subagentes por capa y skill `pr` (mismo día):** se sumaron 4 skills de Addy (`api-and-interface-design`, `frontend-ui-engineering`, `debugging-and-error-recovery`, `code-simplification`) y las propias `pr` (formato fijo del PR de un ticket) y `review-de-ticket`. Los subagentes ahora **precargan** sus skills con el campo `skills:` (verificado en la documentación de Claude Code) y hay uno por capa: `implementador`, `implementador-contrato`, `implementador-front`, `implementador-infra`, `simplificador`, `reviewer-ticket` y `reviewer-seguridad`. `implementar-ticket` elige según la capa (`infra` sin TDD, `e2e` sin rojo; nueva capa `contrato`), depura con método antes de escalar, registra las decisiones con `documentation-and-adrs` y cierra con `pr`. ⚠️ **Pendiente:** confirmar la precarga en una sesión nueva: una prueba con `reviewer-ticket` en esta sesión dio «no cargada», probablemente porque las definiciones se leen al iniciar la sesión.
- **Hecho:** grill de la fase 0 (`interview-me`, 10 preguntas, equipo completo). Sus decisiones quedaron en [[DEC-0015 Decisiones de implementación]] (formalizada): Docker en las 3 PC, JWT de 12 h con chequeo de usuario activo, contraseña temporal con cambio obligado (nuevo `Usuario.debe_cambiar_password`, propagado a [[Usuario]], [[DGM-ER]] y `rumbo.sql`), Tailwind + shadcn/ui en la web, NativeWind + Expo Router en el mobile, un ticket de contrato por módulo, Compose local y servidor al final, CI en runners de GitHub con filtros, cobertura 80/70/70 + e2e de Playwright, y una clave de IA del equipo solo para demos. Se escribió la [[Spec de implementación]] (`en-revision`) con el mapa de 11 módulos; la meta mínima del PC2 es M0 a M6.
- **Verificado:** el ER renderiza con mermaid-cli con el campo nuevo y los enlaces nuevos resuelven. ⚠️ El `rumbo.sql` modificado no se corrió contra PostgreSQL (el daemon de Docker no estaba levantado); lo ejecuta el ticket de la migración inicial.
- **Cambio a Firebase (mismo día, pedido del equipo):** [[DEC-0016 Autenticación con Firebase]] (formalizada) reemplaza DEC-0008 §1 y DEC-0015 §2 y §3. Firebase Authentication (email + Google, sin registro abierto; Firebase manda el mail para elegir o restablecer la contraseña) y la autorización sigue en Rumbo. `Usuario.firebase_uid` reemplaza a `password_hash` y `debe_cambiar_password`. Se propagó a [[Usuario]], [[DGM-ER]], `rumbo.sql`, [[CU-24 Iniciar sesión]] (A2 habilitado, A4 nuevo), [[CU-25 Gestionar usuarios y roles]], [[ARQ — Vista general]] (Firebase en el despliegue y en el C4), avisos en DEC-0008, DEC-0015 y el contrato, la spec y [[Skills compartidas]] (`firebase-tools` + Java). Crear el proyecto de Firebase será un ticket de M0. Riesgos aceptados: sin internet no hay login nuevo; los emails del personal quedan en Google.
- **Verificado (Firebase):** los 5 diagramas de ARQ modificados y el ER renderizan con mermaid-cli.
- **Pendiente:** que el equipo revise el [[Plan de implementación]] y los tickets; confirmar la precarga de skills en una sesión nueva; tomar los primeros tickets con `/tomar-ticket`. Los PNG de ARQ de `07-Entregables` no se regeneraron (son del PC1).

## 12/10/26 — Nahuel, con Francisco y Paloma (Claude Opus 5.5) — flujo de implementación
- **Hecho:** con el equipo reunido se diseñó y aprobó [[DEC-0014 Flujo de implementación con agentes]]:
  - spec → grill → plan de tickets del **sistema completo**;
  - tickets por capa contra el contrato OpenAPI, con dependencias y barreras de revisión por módulo;
  - semáforo con push atómico a `main` (un ticket por persona, vencimiento a las 48 h);
  - TDD con subagentes (`test-writer`, `implementador`, `reviewer-ticket`) y modelo por rol según una rúbrica;
  - review de cada módulo por **Codex**, disparada a mano;
  - código en `src/` (ajusta [[DEC-0001 Stack tecnológico|DEC-0001]]).
- **Paso 1 implementado:**
  - Skills `/tomar-ticket`, `/implementar-ticket` y `/cerrar-modulo`.
  - 13 skills de Addy Osmani copiadas con un bloque «Adaptación Rumbo», más las referencias en `.claude/references/`.
  - `.claude/agents/`.
  - `06-Desarrollo/herramientas/tickets.mjs`.
  - [[Flujo de implementación]], [[Review de módulo — rol de Codex]], [[Tablero de tickets]], [[Grafo de tickets]] y [[PL-Ticket]].
  - `.gitignore` para el código; Obsidian ignora `src/`.
- **Verificado:** el semáforo, probado con un remoto local y dos clones. El segundo claim del mismo ticket pierde y se descarta solo; si el único choque es el grafo, se regenera y se sube; también se probaron el límite de un ticket, el bloqueo de liberar un ticket ajeno no vencido, el cierre con `hecho` + merge, `publicar-grafo`, `modulo` y los errores de `validar`. El Mermaid generado es válido.
- **Commits:** e9e6480 (entregable de IA, aparte) y el de esta entrada.
- **Pendiente:**
  - **Paso 2:** spec de implementación + grill con el equipo, y después el plan y los tickets.
  - Cada integrante: instalar `gh` y loguearse (`gh auth login`), y reiniciar Claude Code después del pull para que carguen los subagentes.
  - Quien dispare la review de módulo: tener Codex.
  - Más adelante (lo crea el módulo de fundaciones): el CI y el auto-merge. ⚠️ La regla de protección de `main` tiene que exigir checks **solo a los PR**, sin bloquear los push directos de los claims y las notas (por ejemplo, un ruleset con bypass, o checks limitados a `src/`). La configura el dueño del repo.

## 08/10/26 — Nahuel (Claude Opus 5.5) — documento general para los profesores
- **Hecho:** nuevo entregable **[[Entregables — índice#Parámetros del documento general (08/10)|documento general]]**: `07-Entregables/General/Rumbo — Documento general.docx` y `.pdf` (127 páginas), generados por `07-Entregables/build/build-general.sh`. Reúne definición del problema, relevamiento y negocio (incluida la 2.ª ronda con la agencia), objetivos y alcance, los 155 RF + 16 RNF + matriz + RN-01, el diagrama y los 31 CU completos, todos los diagramas UML (clases y enumeraciones, ER, 6 de estados, 5 de actividad, 4 de secuencia), tecnologías, arquitectura (capas, MVC, C4 y despliegue) y 12 pantallas del prototipo. Textos propios en `07-Entregables/General/` (portada, modelo UML y tecnologías).
- **Afuera, a pedido de Nahuel:** decisiones de IA (van en su documento), referencias internas (DEC, ARQ, MOC, sync, fechas internas), el script SQL, el contrato OpenAPI y el modelo de desarrollo. Verificado: 0 fugas de `DEC-`/`ARQ`/`[[` en los intermedios.
- **Agregado (pedido de los profesores):** las **propuestas iniciales** y la elección del proyecto, en la nueva nota [[Elección del proyecto]] (cuadro de las tres propuestas y motivo de la elección: cliente real accesible). Entra como primera subsección de la sección 1 del documento general (ahora 128 páginas). El PDF de las propuestas quedó en `_adjuntos/Fuentes/Antecedentes/`.
- **Imágenes cortadas (arreglado):** los cuatro diagramas de actividad medían de 24" a 38" de alto y la secuencia de cobro 9", más que la hoja útil, así que salían cortados. Nuevo `07-Entregables/build/ajustar-imagenes.ps1`, que llama `build-general.sh`: achica las que se pasan poco y parte las largas en tramos de una hoja, cortando entre cajas. Verificado: 53 imágenes, ninguna de más de 8,6" de alto ni de 6,3" de ancho; tramos revisados a ojo. El documento pasó a 139 páginas.
- **Pendiente:** revisión del equipo antes de entregarlo; ratificar el motivo de la elección en [[Elección del proyecto]] (está `en-revision`, por si hay otros motivos); confirmar si la tecnología de IA del producto (una fila en *Tecnologías* y las menciones de Claude en CU-20 y en el C4) debe quedar o salir.

## 02/10/26 — Nahuel (Claude Sonnet 5.5) — fechas de PC2 y PC3 actualizadas en todo el vault
- **Hecho:** Se guardaron los cambios de Nahuel en el deck. Nuevas fechas: **PC2 30/10/26** y **PC3 13/11/26**; en el diagrama de iteraciones de [[Modelo de desarrollo]] (slide 25) se quitó además el nodo «Cierre y defensa». Se actualizaron [[Cronograma y PC]] (PC2 en la semana 10 y PC3 en la 12; la fila del cierre queda como «fecha a confirmar»), [[Guía del Vault]], [[Bitácora técnica]], la slide 27 y las notas de la slide 25 del `.pptx` (editado directo, sin regenerar el deck para no perder los cambios hechos a mano), `build-deck.js` y `deck-pc1.js`. Se regeneraron `DES-iteraciones.png`, el `.docx` del modelo de desarrollo, `Rumbo — PC1.docx` y el PDF de la presentación.
- **Commits:** 0284ed6 y los de esta entrada.
- **Pendiente:** confirmar la fecha del cierre y la defensa (el 11/12/26 quedó solo en el cronograma, sin confirmar). La carpeta de entrega (`armar-entrega.sh`) hay que volver a armarla en D2 para que tome el documento y el PDF nuevos, y subirla de nuevo al Drive.

## 01/10/26 — Paloma (Claude Opus 5.5) — revisión del documento principal: imágenes cortadas
- **Hecho:** Revisión completa de `Rumbo — PC1.docx` con un PDF de prueba. Tres imágenes eran más altas que la hoja y salían **cortadas** al pie: el diagrama de casos de uso (pág. 19), la actividad de CU-01 (pág. 24, ~27" de alto, solo se veían los pasos 1 a 3) y el ciclo de trabajo con el agente (pág. 49). Arreglo: el diagrama de casos de uso y el ciclo van con alto máximo (`height=8.5in`; `figuras()` de `build-pc1.sh` ahora acepta un atributo además del ancho), y en la sección 4 la actividad de CU-01 se **reemplazó** por [[DGM-ACT — Proceso automático diario]], que es horizontal y se lee en una página; el texto aclara que los de los CU van en la carpeta de entrega. Se regeneró el documento (54 páginas).
- **Verificado:** PDF de prueba sin ninguna imagen que exceda la página; las tres páginas revisadas como imagen.
- **Pendiente (no aplicado, a decidir por los autores de cada sección):** de la misma revisión quedaron anotados (1) frases cortadas por el filtro de DEC: «los roles de y.» y «la vista personal de.» en [[Contrato de la API (OpenAPI)]], y «ya fijó LangChain y Claude.» en [[DEC-0012 Modelo de IA del producto]]; (2) en la tabla de CU, CU-26 y CU-31 dicen solo «Admin» aunque la dueña es actor; (3) «14 tablas» en las convenciones del [[DGM-ER]] contra 15; (4) restos internos en el documento («Ver Sobre el tamaño», «Acordado el 30/09 (Francisco y Nahuel)», `EST-*`, MOD-Dashboard, nombres de notas); (5) la lista «8 permitidos / 15 rechazados» de [[Modelo de datos SQL]] sale aplastada; (6) el ejemplo del MCP de Figma en la sección 7 dice 31 pantallas y 36 capturas (hoy 59). La carpeta de entrega debe regenerarse en D2 para tomar el documento nuevo.
- **Documento definitivo (revisión de Paloma en Word):** Paloma revisó `Rumbo — PC1.docx` en Word y lo dio por **definitivo**: quitó «Interpretaciones adoptadas» de la presentación, la cursiva de los títulos de los actores, la frase sobre Mermaid C4 del párrafo del modelo C4 (a propósito queda «…en detalle. personas en azul oscuro…») y los dos «Ejemplo real» de la sección 7; agregó bordes a todos los cuadros menos el de tipos de diagrama (sección 8), centró la primera columna del cuadro comparativo y actualizó el índice. Se subió tal cual y los cambios se pasaron a las fuentes para que **regenerar dé el mismo documento**: `00 - Portada.md` y, solo para el PC1 (las notas del vault no cambian), `build-pc1.sh` filtra la cursiva de Actores, la frase del C4 y los ejemplos; los bordes los agrega el nuevo `07-Entregables/build/bordes-tablas.ps1` al final del armado. Verificado: un armado de prueba a una copia temporal da el mismo texto y los mismos 11 cuadros con borde; el script también centra la primera columna del cuadro comparativo (`-Centrar`), incluida la última fila, que en el `.docx` de Paloma había quedado sin centrar. Word abre el armado de prueba sin errores.
- **Commits:** df392f4, 1d4e70a y el de esta entrada.
- **Carpeta de entrega (paso 2 del plan del jueves):** según Paloma, el equipo ya definió la exposición, ensayó y Nahuel revisó sus secciones. Se agregó el link de la carpeta de Google Drive en `00 - Portada.md` y en `90 - Material complementario.md`, y se corrió `armar-entrega.sh`: anexos, documento principal (53 páginas, índice actualizado) y su PDF regenerados; el `.docx` del repo es el de la carpeta. Un guardado de PowerPoint al cerrar cambió el `.pptx` sin cambios de contenido (mismo texto en las 27 slides, mismas imágenes) y se descartó.
- **Verificado:** el PDF tiene el link al Drive en la portada y en Material complementario, no tiene imágenes que excedan la página y no incluye lo que se quitó en la revisión.
- **Drive:** Paloma subió la carpeta de entrega completa a la carpeta compartida.
- **Pendiente:** D3 (tag `pc1`) y la entrega a las 20 hs.
- **D1 (adelantado al jueves, con el equipo):** cero notas del PC1 en `borrador` o `en-revision` (control por tag y por `pc:`). [[IA — Agentes del proyecto]] y [[Antecedentes]] ya estaban formalizadas desde el 30/09. Solo `IA — Prompt de CU-20` sigue en `borrador`, y es del PC2. Los «a decidir» (ya resuelto) que quedan en notas del PC1 son texto histórico de puntos ya resueltos; la sección «Pendiente» de [[DEC-0005 Autenticación y modelo de roles]] quedó resuelta por DEC-0008.

## 30/09/26 — Paloma (Claude Opus 5.5) — menú según el perfil en el prototipo
- **Hecho:** Se creó en Figma la colección de variables «Prototipo · perfil» (`perfil`, `nombre`, `rol`, `iniciales`, `verAdmin`). En las 23 pantallas compartidas, la barra lateral toma de esas variables el nombre, el rol y las iniciales, muestra Reportes y Configuración solo al `admin` y a la dueña, y en Agenda del día, Dashboard y Configuración lleva a la pantalla que corresponde a cada perfil (un condicional por perfil, porque Figma no permite anidarlos). En las pantallas propias del `admin` (5) y de la dueña (4), cada enlace guarda primero el perfil; el inicio de sesión y el botón de salir lo vuelven a `empleado`. Se sacó el límite correspondiente de [[Prototipo UI]] y se tildó la tarea opcional en [[Cierre del PC1 — tareas pendientes]].
- **Verificado:** con el perfil de la dueña puesto a mano, la barra de una pantalla compartida muestra a Laura con Reportes y Configuración; después se restauró el valor por defecto (`empleado`), así que los PNG no cambian.
- **Pendiente:** probar el recorrido en modo *Present* (Dueña · dashboard → Clientes → Configuración, y lo mismo desde Admin · configuración); la API no permite simular la ejecución del prototipo. Las pantallas 24 y 25 conservan la barra de Marina.

## 30/09/26 — Paloma (Claude Opus 5.5) — revisión de la sección 3 y de las slides de interfaces
- **Hecho:** Se revisó la sección 3 del documento principal (modelo conceptual e interfaces principales) y las slides de interfaces (9 a 12). Se hicieron tres correcciones. (1) **Listas anidadas:** en todo el documento y en los anexos salían aplanadas, porque el filtro de los 6 scripts `07-Entregables/build/build-*.sh` comprimía también la sangría del principio de línea. El filtro se cambió para que solo comprima los espacios dentro del texto, y ahora se ven anidadas las 13 sublistas del documento principal (por ejemplo, Web y Mobile en «Qué atiende»); el resto del texto no cambió. (2) **Deck:** en la slide «Una vista por perfil», la dueña pasó de «Dashboard y reportes de la empresa» a «Todo lo del admin, más el dashboard y los reportes de la empresa» (decisión de la sync del 30/09). (3) Se regeneraron `Rumbo — PC1.docx`, el `.pptx` y su PDF.
- **Verificado:** la sección 3 comparada antes y después: solo cambia la sangría. La slide 10 se revisó como imagen. Las cifras de la sección coinciden (11 módulos, 15 tablas, 59 pantallas).
- **Pendiente:** los anexos toman la corrección de las listas cuando se regeneren en D2. (Lo del mobile «consulta de clientes» ya lo había corregido Nahuel en G3.)

## 30/09/26 — Paloma (Claude Opus 5.5) — configuración de la dueña en el prototipo
- **Hecho:** En la pantalla 51 de Figma, «Dueña · Configuración», se hicieron visibles las pestañas *Parámetros y comisiones* (CU-13) y *Usuarios y roles* (CU-25), que estaban ocultas. Ahora se ven las cuatro pestañas del `admin`, y cada una lleva a su pantalla (30, 31 y 33; se sumó el enlace de *Operadores*). La moderación de reseñas (CU-29) sigue en el detalle de hotel (24), igual que para el `admin`. Se reexportó `img/51-duena-configuracion.png` con el mismo nombre y se cerró la tarea en [[Prototipo UI]], en el paso B5 de [[Estado del proyecto]] y en [[Cierre del PC1 — tareas pendientes]].
- **Commits:** ver el commit de esta entrada.
- **Pendiente:** regenerar los `.docx` con la nueva captura (se hace en D2 con `armar-entrega.sh`). Queda del prototipo: al pasar a las pestañas 30, 31 y 33 se ve el menú de Marina (`admin`), la misma limitación de las pantallas compartidas. En la 51, el botón «Agregar requisito» tapa el final del subtítulo.

## 30/09/26 — Nahuel (Claude Sonnet 5.5) — G2 y G3 revisados y formalizados
- **Hecho:** Revisión de [[ARQ — MVC y modelo conceptual por capa]] contra [[ARQ — Vista general]], el [[DGM-ER]], `rumbo.sql`, `openapi.json` y [[CU-12 Registrar cobro de un pago]]: los servicios en el Modelo son coherentes con la vista lógica, los 11 módulos y las 15 tablas coinciden, el extracto del contrato es fiel (96 operaciones) y la secuencia de CU-12 respeta A0, A2 y la alerta resuelta. Ajustes: `usuarios` pasó a `seguridad` y el mobile incluye los clientes completos en G3; en ARQ, configuración y moderación son de `admin` y `dueño` (había quedado «solo `admin`»). Nota aprobada por Nahuel y `formalizada` (`fecha_aprobacion` 30/09/26); G2, G3 y la línea de G en el checklist de [[Estado del proyecto]] tildados, y [[Cierre del PC1 — tareas pendientes]] al día. Se regeneró `Rumbo — PC1.docx` con `build-pc1.sh`.
- **Pendiente:** Nahuel revisa sus secciones 4, 5 y 6 del documento y del deck; los pendientes de Paloma y los de los tres siguen en la nota de cierre.

## 30/09/26 — Paloma (Claude Opus 5.5) — H4: primera versión del deck
- **Hecho:** `Rumbo — PC1 (presentación).pptx` y su PDF en `07-Entregables/PC1/`: 24 diapositivas que siguen el orden del documento único (presentación general, IA, agentes, datos, desarrollo e interfaces, arquitectura y cierre), con la paleta del prototipo, la persona que expone cada parte según los frentes, diagramas, capturas del prototipo y notas del orador. Script reproducible `07-Entregables/build/build-deck.js` (pptxgenjs, sin instalar en el repo). Verificado: pasa el validador de PowerPoint y se revisó el render de todas las diapositivas.
- **Pendiente:** revisión del equipo; definir la duración y si hay demo en vivo; si cambian los números del PC1, actualizar el script y regenerar.

## 30/09/26 — Paloma (Claude Opus 5.5) — revisión de H2 y documentos regenerados
- **Hecho:** Revisión de [[Modelo de desarrollo]] (H2): en *Interfaces gráficas* se sumaron cómo se diseñó, el sistema de diseño, los criterios de usabilidad, la vista por perfil y el alcance web/mobile; sigue `en-revision` para que lo apruebe el equipo. Se instaló pandoc 3.12 en esta PC (winget) y se regeneraron `Rumbo — Modelo de desarrollo.docx` (59 pantallas) y `Rumbo — PC1.docx`, junto con los anexos que genera `build-pc1.sh`. `paletaColores/` quedó en `.gitignore` (la paleta ya está como variables en Figma).
- **Verificado:** el `.docx` de desarrollo tiene las 59 pantallas y la sección nueva, sin notas internas. En el documento único aparecen referencias a DEC dentro de bloques de código (árbol de carpetas y SQL), que vienen de las notas de Francisco y Nahuel.
- **Pendiente:** aprobar H2 en la sync; «a decidir» (ya resuelto) configuración de la dueña.

## 30/09/26 — Paloma (Claude Opus 5.5) — B5: mobile completo y navegación
- **Hecho:** 8 pantallas mobile nuevas (inicio de sesión, detalle de alerta, posponer, agenda tras resolver con «Deshacer», nuevo recordatorio, clientes, nuevo cliente y Más) con los componentes del sistema de diseño. La barra de pestañas pasó a Agenda · Clientes · Más (Ventas y Viajes quedan fuera del alcance mobile de RNF-14). El punto de inicio *Rumbo · mobile* arranca en el inicio de sesión. Revisión de navegación de todo el prototipo: todas las pantallas se alcanzan desde los 5 puntos de inicio, sin enlaces rotos; se enlazaron el error de inicio de sesión y el catálogo sin resultados, y se corrigieron puntos de inicio duplicados que habían dejado las copias. PNG 52 a 59 nuevos; 35 y 36 reexportados. **B5 cerrado.**
- **Pendiente:** «a decidir» (ya resuelto) configuración de la dueña; regenerar el `.docx` de Modelo de desarrollo con las 59 pantallas.

## 30/09/26 — Paloma (Claude Opus 5.5) — B5: vistas por rol
- **Hecho:** Matriz rol × sección en [[Prototipo UI]] (según los actores de cada CU) y 5 pantallas nuevas donde la vista cambia: dashboard del `empleado` (lo suyo, CU-21 A1), detalle de hotel del `empleado` (sin moderar), agenda de toda la agencia para `admin` y `dueño` (con el responsable de cada alerta y filtro por responsable) y configuración de la dueña (solo Destinos y Operadores). Menús por rol: el `empleado` ya no ve Reportes ni Configuración; los menús de `admin` y `dueño` abren sus agendas y el del `empleado` su dashboard. Coherencia de datos: el viaje a Mendoza y el Centro de Jubilados pasan a Sofía, y su agenda deja solo sus alertas. PNG 47 a 51 nuevos y 21 PNG del `empleado` reexportados.
- **Pendiente:** «a decidir» (ya resuelto) configuración de la dueña (CU-13 y CU-25 son solo del `admin`); B5 (3): mobile completo; regenerar el `.docx` de Modelo de desarrollo con la tabla de 51 pantallas.

## 30/09/26 — Paloma (Claude Opus 5.5) — B5: el freelance completo
- **Hecho:** En Figma, fila nueva «Rol freelance · recorrido completo» con 10 pantallas del `freelance` (Diego Paz): agenda, calendario, clientes, ficha del cliente, emitir cotización, viajes, ficha del viaje, catálogo de hoteles, detalle de hotel y dashboard. Se armó una **cartera ficticia propia** (Familia Acosta, Valeria Ortiz, Lucía Paz, Roberto Díaz, Andrés y Julia, Club Náutico Tigre, Tomás Herrera) y se **corrigió el embudo** existente (pantalla 34), que mostraba clientes de Sofía. Criterios de [[DEC-0005 Autenticación y modelo de roles|DEC-0005]] y [[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]]: solo lo suyo, sin «Toda la agencia», sin Redes/Reportes/Configuración, hoteles solo en consulta (sin CU-16, CU-17 ni CU-29), su comisión visible y sin el ranking de vendedores. El menú del `freelance` se reconectó a sus pantallas (antes abría las del `empleado`) y se quitaron los enlaces a formularios del `empleado`. PNG 37 a 46 y 34 reexportado; [[Prototipo UI]], [[Entregables — índice]] y [[Estado del proyecto]] actualizados.
- **Pendiente:** B5 (1): vistas de `admin` y `dueño` por sección (el menú del `empleado` muestra Reportes y Configuración: revisar); B5 (3): mobile completo; regenerar el `.docx` de Modelo de desarrollo (H2, de Francisco), que incluye la tabla de pantallas y todavía lista 36 (falta pandoc en esta PC). Detalle menor previo: en el listado de clientes del `empleado` (pantalla 8), Lucía Paz figura sin viaje aunque su viaje a Salta sale el 30/09.

## 30/09/26 — Francisco (Claude Opus 5.5) — pendientes del 29/09 cerrados
- **Hecho:** La fecha del PC1 pasó a **02/10/26** en [[Cronograma y PC]] (semana 6, entrega y exposición oral a las 20 hs), en las portadas de los tres entregables y en [[Entregables — índice]]. Se regeneraron los `.docx` de Casos de uso, Relevamiento y Requisitos. La memoria del proyecto y `CLAUDE.md` ya apuntan a la infraestructura on-premise de DEC-0011; la memoria suma además el ORM y el modelo de IA del producto. En el paso A6 de [[Estado del proyecto]] se listó todo lo que falta ratificar y se sumó, como «a decidir» (ya resuelto), la inconsistencia de tildes en los enums que Nahuel había dejado anotada.
- **Verificado:** los tres `.docx` muestran «Entrega: 02/10/26» y no filtran notas internas.
- **Tildes en los enums** (aprobado por Nahuel): en la capa técnica los valores van en ASCII. `dueño`, `seña` y `reseña` pasaron a `dueno`, `sena` y `resena` en [[DGM-ER]], `rumbo.sql`, `generar-openapi.js` y `openapi.json` (regenerado); el diagrama de clases, los CU y las pantallas siguen en castellano. El criterio quedó en las convenciones del ER, en [[Modelo de datos SQL]] y en [[Contrato de la API (OpenAPI)]]. Verificado: el SQL corre en PostgreSQL 18 (15 tablas, ningún valor de enum fuera de ASCII), Redocly da el contrato por válido y se regeneró el PNG del ER.
- **E3:** [[IA — Agentes del proyecto]] completa, con fichas de Claude Code, subagentes y MCP de Figma (rol, modelos por fecha, herramientas, contexto, límites y ejemplos reales tomados de esta bitácora); pasa a `en-revision`.
- **E4:** [[Herramientas del proyecto]] suma una tabla que separa la IA para desarrollar de la IA dentro del producto (DEC-0012). Se regeneró el `.docx` de Relevamiento y se verificó que la tabla no deje celdas vacías por el filtro de DEC.
- **H1:** nueva nota [[Antecedentes]] (`en-revision`), enlazada desde [[Relevamiento — Fuente de verdad]]. La situación actual sale solo del relevamiento; la comparación con el mercado (Excel, HubSpot y Pipedrive, Tern/TravelJoy/Travefy y back office argentinos como SAVIA) usa documentación pública consultada el 30/09, con enlaces.
- **Entregables:** [[Antecedentes]] se sumó al `.docx` de Relevamiento, como primera sección después de la portada. Nuevo entregable **`Rumbo — Inteligencia artificial.docx`** (`07-Entregables/IA/`, script `build-ia.sh`): el modelo de IA del producto (DEC-0012) y los agentes (E3), con la misma plantilla y el mismo filtro. Para que se lea bien en el `.docx`, la nota de agentes dejó de usar sublistas y el ejemplo real ya no queda cortado al quitar la referencia a DEC-0013. Verificado: 0 fugas de notas internas, figura incrustada, y Word lo abre y exporta a PDF sin errores.
- **Sync del 30/09 (Francisco, Nahuel y Paloma):** se aprobaron [[Antecedentes]] e [[IA — Agentes del proyecto]] y se ratificó [[ARQ — Vista general]]; las tres pasaron a `formalizado`. Sobre el C4: la lámina pide el modelo, no una herramienta, así que queda dibujado con diagramas de flujo y la notación estándar de C4, sin usar el tipo C4 de Mermaid (experimental). Único ajuste: el recuadro del nivel 2 pasó a llamarse «Rumbo [Sistema]», porque es el límite del sistema y no el servidor (la web y el mobile no corren ahí). PNG regenerado. **[[DEC-0013 Datos que faltaban en el ER]] ratificada** completa y sin cambios; el equipo adopta como válida la lista de motivos de pérdida, que era una propuesta del equipo y no sale del relevamiento. Antes de formalizarla se verificó que los 12 datos estén en el ER, el diagrama de clases, el SQL y el contrato (los endpoints de comisión por defecto y de baja de reseña quedan sin esquema detallado, como se acordó en F1). **Contrato OpenAPI formalizado:** se confirmaron sus cuatro supuestos sin cambios (el `freelance` no gestiona hoteles ni registra reseñas; la cotización se descarga en PDF; `/reportes` como está; los recontactos son alertas). Como el diagrama de CU hace del `freelance` una especialización del `empleado`, la excepción se escribió en CU-16, CU-17, [[Actores]], la nota del [[DGM — Casos de uso]] y una aclaración en DEC-0008; se regeneraron los `.docx` de Casos de uso y de Relevamiento. Después se confirmó que el `freelance` tampoco usa el módulo de redes (CU-19 y CU-20), anotado en los mismos lugares. **[[Modelo de datos SQL]] y [[Prototipo UI]] aprobados y formalizados**, con lo que **A6 queda cerrado**. Se cerró en la nota del prototipo la duda sobre «Próximas» y «Progreso del día», que Nahuel ya había aceptado. Para Paloma quedó **B5**: completar el prototipo con cada sección vista por cada rol, el `freelance` completo (sin hoteles, reseñas ni redes) y el mobile completo (agenda, alertas y clientes). Aclaración: cargar hoteles y reseñas no es exclusivo de `admin` y `dueño`; también lo hace el `empleado`, y solo moderar reseñas (CU-29) es de `admin` y `dueño`. **Deck:** PowerPoint a nombre de los tres, y es lo último que se arma, cuando el documento único esté completo. **Documento principal rehecho (sync del 30/09):** a pedido de Francisco, el documento sigue el contenido del «Documento con el MVC» de la lámina y baja de 237 a 57 páginas; `build-pc1.sh` lo arma desde las notas y los textos de `07-Entregables/PC1/`, con la tabla de CU y la de operaciones de la API generadas. Nueva nota [[IA — Prompt de CU-20]] (propuesta) y extracto de `CLAUDE.md` como prompt del agente. Nuevo `armar-entrega.sh`: carpeta de entrega para el Drive con documento, presentación, 5 anexos, 34 diagramas, 59 pantallas, API, SQL y `CLAUDE.md` (fuera de Git). Al integrar apareció que Paloma también había armado un deck (24 slides, `build-deck.js`): se conservó el suyo y del de Francisco quedó el generador `deck-pc1.js`. **Traspaso:** nueva nota [[Cierre del PC1 — tareas pendientes]], enlazada desde el Estado, con lo que le queda a cada uno (Nahuel: revisar y formalizar G2 y G3; Paloma: la configuración de la dueña en el prototipo; los tres: revisar el documento, decidir duración y demo, subir la carpeta al Drive, ensayo y cierre D1–D3) y cómo regenerar todo. **H2 formalizado:** [[Modelo de desarrollo]] aprobado por el equipo; antes se corrigió la fila de la dueña en la tabla de perfiles (tiene todo lo del administrador). **Prompts del PC1:** el equipo aclaró que la lámina pide los prompts usados para construir el producto guiado con IA, no los de una función del producto. La sección 7 del documento pasó a «Prompts usados para construir el producto» (`CLAUDE.md` como prompt de sistema, el prompt de cada sesión y la skill `gestionar-skills`), el deck cambió igual, la carpeta de entrega suma la skill, y [[IA — Prompt de CU-20]] salió del PC1 (borrador para PC2). **MOC formalizados:** los dos índices ([[MOC — Casos de uso]] y [[MOC — Modelo de dominio]]) se pusieron al día (sin las marcas «⚠️ nuevo» ni pendientes ya resueltos, con los enlaces al contrato, al MVC, al prompt de CU-20, al modelo SQL y a DEC-0013, y las precisiones de actores del 30/09) y pasaron a `formalizado`. **La dueña tiene todo (sync del 30/09):** los CU decían que usuarios (CU-25), comisiones (CU-13) y moderación de reseñas (CU-29) eran solo del admin, pero el contrato OpenAPI, DEC-0005 («el dueño tiene todo») y el relevamiento («Administrador / Dueña: configura comisiones, gestiona usuarios») dicen admin y dueño. Se ampliaron los tres CU y [[Actores]], y el [[DGM — Casos de uso]] ahora conecta a la dueña con todos los casos de gestión y al admin con el dashboard y los reportes, como ya decían sus CU; PNG regenerado. Los RF no cambian (llevan el actor principal). Queda para Paloma la configuración de la dueña en el prototipo. De paso, DEC-0005 ya no dice que la infraestructura está pendiente. **Deck reordenado:** el generador de Paloma (`build-deck.js`) se reordenó con la misma estructura del documento (agenda de 8 puntos y secciones renumeradas) y suma tres slides: modelo conceptual por capa, prompts y Mermaid.js (con el código real del diagrama del pipeline y su imagen); el modelo de desarrollo y la calidad quedan como anexo. 27 slides, validadas y revisadas exportándolas con PowerPoint; PDF regenerado. **H4 (primera versión):** deck `Rumbo — PC1 (presentación).pptx` con 19 slides en el orden del documento, generado con `deck-pc1.js` (pptxgenjs) y revisado slide por slide exportándolo con PowerPoint; las notas del orador indican quién expone cada parte. **H3 (primera versión):** `build-pc1.sh` arma `07-Entregables/PC1/Rumbo — PC1.docx` (237 páginas, 93 imágenes, 70 tablas) en el orden de la lámina: las secciones 1, 2, 3 y 5 y los anexos A y B se convierten desde los `.docx` sueltos, y las secciones 4 y 6 y el anexo C se arman desde las notas; también cubre F3. De paso se escaparon cinco enlaces de la tabla de [[Prototipo UI]] que cortaban columnas. **G2 y G3:** los arma Francisco y los revisa Nahuel antes del cierre del día 2. Hechos el mismo día en [[ARQ — MVC y modelo conceptual por capa]] (`en-revision`): Vista = web y mobile, Controlador = capa de presentación, Modelo = negocio y datos (se eligió la lectura clásica, con controlador delgado; Nahuel tiene que confirmarlo), la comunicación por OpenAPI con el ejemplo de CU-12 y el modelo conceptual por capa, con tres diagramas Mermaid sumados a `render-diagramas-diseno.sh`. **Documento único (H3):** orden de la lámina, un solo `.docx` con los anexos adentro (los sueltos quedan de respaldo), SQL completo en anexo y del OpenAPI la tabla de endpoints más un extracto, con el JSON completo aparte. **H2:** Francisco lo arma por acuerdo de la sync para liberar a Paloma: nota [[Modelo de desarrollo]] (`en-revision`, ciclo de vida iterativo por PC, prácticas del equipo, calidad e interfaces, con dos diagramas Mermaid) y nuevo `Rumbo — Modelo de desarrollo.docx` (`build-desarrollo.sh`), cuya galería de pantallas se arma sola desde la tabla de [[Prototipo UI]]. Verificado: 38 imágenes, 29 páginas, sin notas internas, y Word lo abre sin errores. Paloma lo revisa. Francisco revisó el `.docx` y recortó texto (el aviso de que los Word se generan con scripts, la mención de las syncs del 11, 17 y 29/09, el ejemplo de los frentes, la referencia a la nota de agentes y el bloque «Cómo se trabajó» del prototipo); esos cambios se pasaron a la nota fuente y el `.docx` se regeneró desde ahí, con el mismo texto.
- **Commits:** 47dfff4, 553811a, b95afc9, 74430d3, e29c12c y el de la sync.
- **Pendiente:** G2, G3 y el esqueleto de H3 (día 2). Ratificar en A6 las dos notas nuevas. De otros: H2 y `paletaColores/` (Paloma).

## 29/09/26 — Paloma (Claude Opus 5.5) — prototipo ampliado al sistema completo
- **Hecho:** A las 11 pantallas clave se sumaron **20 pantallas** en el mismo archivo de Figma, en filas por módulo y con los mismos componentes: *Clientes y ventas* (listado, CU-02 con duplicado A1, CU-04, CU-28); *Viajes* (listado, CU-08, CU-27, CU-09); *Calendario y catálogo* (CU-23, CU-16, detalle de hotel con CU-29 visto por el admin, CU-17); *Redes y reportes* (CU-19, CU-20, CU-22); *Administración* (parámetros de `CONFIGURACION` y CU-13, CU-25, CU-26/CU-15, CU-31); y *vistas por rol* (embudo del `freelance` y CU-30). Además, en CU-18 se agregó el botón «Nuevo hotel» y la variante sin resultados (A1). Las altas y confirmaciones van como panel o diálogo sobre la pantalla de origen. Se usaron los campos de [[DEC-0013 Datos que faltaban en el ER]] (notas, motivos, `Alerta.descripcion`, `Usuario.activo` y `acceso_redes`, comisión con tipo). Se corrigió un dato de ejemplo (la oportunidad de Martín Ruiz pasó a «Cancún» para no chocar con su viaje a Río).
- **Prototipo navegable:** 435 interacciones (menú lateral en las 30 pantallas de escritorio, flujos de los CU, pestañas de Configuración y mobile) y 5 puntos de inicio: escritorio (empleado), mobile, dueña, admin y freelance. Se sumó a la ficha del viaje el botón «Cancelar viaje», que faltaba para entrar a CU-27.
- **Menú sin «Pagos»:** se quitó esa entrada de la barra lateral porque ningún CU ni RF define una vista general de pagos; los cobros se gestionan en la ficha del viaje (CU-10/11/12) y los vencimientos en el calendario (CU-23), la agenda (CU-14) y el dashboard/reportes.
- **B4 hecho:** las 36 pantallas exportadas a `07-Entregables/Prototipo/img/` (1440 px de ancho; mobile a 390), nueva nota [[Prototipo UI]] con el link, cómo presentarlo (Present → Opciones → «Ajustar»), el sistema de diseño y la tabla pantalla → CU → PNG, y filas nuevas en [[Entregables — índice]]. Antes se ajustaron los 9 paneles de acción (alto según contenido) para que el botón final se vea al presentar.
- **Pendiente:** H2; `paletaColores/` sigue sin versionar.

## 29/09/26 — Nahuel (Claude Opus 5.5) — PNG del ER en alta resolución
- **Hecho:** El PNG del [[DGM-ER]] se pixelaba al hacer zoom: con escala 2, mermaid-cli limita el ancho a unos 1568 px y achicaba el ER (el diagrama más grande) a la mitad de su tamaño natural. `render-diagramas-dominio.sh` acepta ahora un quinto parámetro opcional con el lado mayor del PNG, y el ER se exporta a **5535 × 6000 px** (antes 1568 × 1700). No se aplica a todos porque `--size` limita el lado mayor y achicaría los diagramas de actividad, que son muy altos.
- **Pendiente:** si otro diagrama ancho se ve mal impreso (por ejemplo, la vista principal de clases), se le pasa el mismo parámetro.

## 29/09/26 — Nahuel (Claude Opus 5.5) — propuestas de Paloma para CU-14 aceptadas
- **Hecho:** Nahuel aceptó las dos propuestas que Paloma dejó al diseñar la agenda. [[CU-14 Ver y atender alertas del día]] suma **A5 — Ver próximas** y el **progreso del día** (paso 2 y postcondiciones). [[Requisitos funcionales]] suma **RF-154** y **RF-155** en el módulo 5 (total: 155 RF), con índice, matriz y totales actualizados en MOC, Estado, portada e índice de entregables. El progreso necesita `Alerta.resuelta_en`: quedó como punto 12 de [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] y se propagó a ER, clases, [[Alerta]] y SQL. El contrato OpenAPI suma el filtro `proximas` en `GET /alertas` y `GET /alertas/progreso-del-dia` (96 operaciones).
- **Verificado:** SQL revalidado en PostgreSQL 18.3 (23 casos: 8 permitidos y 15 rechazados); contrato válido en Redocly; PNG de clases y ER regenerados; `.docx` de requisitos y de casos de uso regenerados con RF-154, RF-155 y A5, sin fugas de notas internas.

## 29/09/26 — Nahuel (Claude Opus 5.5) — G1: modelo C4
- **Hecho:** Nueva sección *Modelo C4* en [[ARQ — Vista general]] con los tres niveles: contexto (usuarios de la agencia, pasajero, API de Claude y WhatsApp/Instagram/TikTok como canales manuales), contenedores (web, mobile, API, proceso automático y PostgreSQL) y componentes de la API (reúne la vista lógica en formato C4). Se dibujó con flowchart y ELK en lugar del tipo C4 de Mermaid, que es experimental. Los tres bloques se sumaron a `render-diagramas-diseno.sh` y a la tabla de PNG de [[Entregables — índice]]. ARQ queda lista para ratificar (A6).
- **Verificado:** los tres PNG se exportaron y se revisaron.
- **Pendiente:** A6 (ratificar ARQ, DEC-0013 y los supuestos del contrato OpenAPI) en el cierre del día 2.

## 29/09/26 — Nahuel (Claude Opus 5.5) — F1: contrato OpenAPI
- **Hecho:** `05-Diseño/API/openapi.json` (OpenAPI 3.1): 95 operaciones en 72 rutas para los 11 módulos, cada una con rol (`x-roles`), casos de uso (`x-casos-de-uso`) y errores en `application/problem+json`. Esquemas completos para Cliente, Oportunidad, Cotización, Viaje, Pago y Alerta, más el login. Lo genera `generar-openapi.js` (no se edita el JSON a mano). Nota índice con convenciones, roles, errores y tabla de endpoints: [[Contrato de la API (OpenAPI)]]; enlazada desde ARQ.
- **Verificado:** Redocly CLI lo da por válido (solo avisa que no declara licencia); cubre los 30 CU atómicos.
- **A revisar en A6:** cuatro supuestos anotados en la nota (alcance del freelance fuera de lo operativo, PDF de la cotización, rutas de reportes y recontactos como alertas).
- **Pendiente:** G1 (C4).

## 29/09/26 — Paloma (Claude Opus 5.5) — B2/B3: prototipo UI en Figma
- **Hecho:** Se armó el prototipo en Figma vía MCP (cuenta de estudiante de Paloma): [Rumbo — Prototipo PC1](https://www.figma.com/design/5rq8HOlZQ3uu4IUpBuhuZp). Primero se validó el estilo con una sola pantalla (agenda, CU-14), que se rehízo aplicando buenas prácticas de UX/UI actuales: contraste AA, jerarquía, control segmentado en vez de 9 filtros, acción principal según el `tipo` de alerta, acciones rápidas en hover, estado vacío y «Deshacer». Después se hizo un **sistema de diseño liviano** (tokens desde la paleta del equipo, tipografía Plus Jakarta Sans, 7 componentes y 28 íconos) y, con él, las otras 10 pantallas: CU-24 (y error A1), CU-03, CU-05, CU-06, ficha del viaje (CU-07/10/11), CU-12 como panel lateral, CU-21, CU-18 y las dos mobile (agenda y ficha del cliente). Datos de ejemplo ficticios y coherentes entre pantallas.
- **Propuestas para Nahuel** «a decidir» (ya resuelto): en la Revisión de [[CU-14 Ver y atender alertas del día]], **A5 — Ver próximas** y un **indicador de progreso del día** (requiere el atributo nuevo `Alerta.resuelta_en`); en la Revisión de [[Requisitos funcionales]], los **RF-154** y **RF-155** correspondientes. El cuerpo de las notas no se tocó.
- **Pendiente:** B4 (exportar los PNG a `07-Entregables/Prototipo/` y sumar la fila en [[Entregables — índice]]); H2 (modelo de desarrollo); que Nahuel acepte o rechace las dos propuestas (si las rechaza, sacar «Próximas» y «Progreso del día» del prototipo). La carpeta `paletaColores/` quedó sin versionar.

## 29/09/26 — Nahuel (Claude Opus 5.5) — DEC-0013: datos que faltaban en el ER
- **Hecho:** Al preparar F2 y F1 aparecieron once datos que los CU y los RF piden y el ER no guardaba. Nahuel aprobó las once propuestas y quedaron en [[DEC-0013 Datos que faltaban en el ER]] (`en-revision`, a ratificar en A6): `PAGO.fecha_cobro`, tabla `CONFIGURACION` de una fila (1 mes, 7 días y 6 meses), comisión con `tipo_comision` en `VIAJE` y default por vendedor en `USUARIO`, `USUARIO.acceso_redes`, `USUARIO.activo`, `VIAJE.estado_previo`, `OPORTUNIDAD.notas`, los motivos de pérdida (enum), cancelación y baja de reseña, `ALERTA.viaje_hotel_id` como quinto origen, `ALERTA.descripcion` y `CONTENIDO_RED.texto`. Propagado a [[DGM-ER]], [[DGM — Diagrama de clases]] (20 enums), las entidades [[Pago]], [[Usuario]], [[Viaje]], [[Oportunidad]], [[Reseña]], [[Alerta]] y [[ContenidoRed]], ARQ y [[Modelo de datos SQL]].
- **Verificado:** PNG de clases y ER regenerados; el script vuelve a correr en PostgreSQL 18.3 (15 tablas, 20 enums) y pasan 21 casos de prueba (7 permitidos y 14 rechazados). Quitar un tramo (CU-09 A3) es la única eliminación física: `alerta.viaje_hotel_id` usa `ON DELETE SET NULL`.

## 29/09/26 — Nahuel (Claude Opus 5.5) — F2: script SQL
- **Hecho:** `05-Diseño/Datos/rumbo.sql` con las 14 tablas y los 18 enums del [[DGM-ER]], `gen_random_uuid()`, auditoría nullable, el CHECK de origen de `alerta`, la unicidad de `viaje_hotel` y `ganancia`/`margen` como columnas calculadas. Nota índice: [[Modelo de datos SQL]].
- **Verificado:** en un clúster PostgreSQL 18.3 temporal (el servidor local de la PC pide contraseña, así que no se usó): el script corre sin errores y 11 casos de prueba dan lo esperado (3 permitidos y 8 rechazados).
- **A mirar:** el ER escribe los enum sin tilde (`en_gestion`) pero con ñ (`seña`), y el diagrama de clases con tilde; el script sigue al ER.
- **Pendiente:** F1 y G1.

## 29/09/26 — Nahuel (Claude Opus 5.5) — ajustes del túnel y auditoría nullable aplicados
- **Hecho:** [[DEC-0011 Infraestructura de despliegue on-premise]] suma el quinto contenedor `cloudflared` (token en el `.env` del servidor, fuera de Git), el acceso de **todos** los usuarios por la URL del túnel (la entrada local directa queda como respaldo) y el riesgo aceptado de que Cloudflare vea el tráfico descifrado. La vista de despliegue de [[ARQ — Vista general]] (diagrama, viñetas, resumen y *Pendiente*) quedó igual y su PNG se regeneró. En [[DGM-ER]] se anotó que `created_by`/`updated_by` son nullable (vacío = proceso automático).
- **Pendiente:** F2, F1 y G1.

## 29/09/26 — Nahuel (Claude Opus 5.5) — aprobaciones y traspaso
- **Hecho:** Nahuel aprobó (1) `created_by`/`updated_by` vacíos para las acciones del proceso automático y (2) los tres ajustes del túnel en DEC-0011. Quedaron registrados en *Decidido en el día 0* de [[Estado del proyecto]], todavía sin aplicar.
- **Pendiente (siguiente sesión):** aplicar los ajustes del túnel en DEC-0011 y ARQ, anotar la nulabilidad en [[DGM-ER]] y seguir con F2 (script SQL); después F1 y G1.

## 29/09/26 — Nahuel (Claude Opus 5.5) — ARQ: paquete core fuera de las tres capas
- **Hecho:** A pedido de Nahuel, la vista lógica de [[ARQ — Vista general]] suma un paquete **`core`** transversal, fuera de las tres capas (convención que Nahuel ya usa en otro proyecto): `config`, `db` (motor, sesión y auditoría), `seguridad` (hash y tokens de DEC-0008) e `ia` (cliente LangChain + Claude). Regla: `core` no usa ninguna capa y todas pueden usarlo; solo entra lo técnico, transversal y sin reglas del negocio. La IA de CU-20 quedó **partida en dos**: el prompt y sus límites en `negocio/prompts/` y el cable técnico en `core/ia.py`; `datos/` queda solo con modelos y repositorios. Diagrama de capas rehecho con `core` al costado; tabla, reglas transversales, estructura de carpetas y resumen actualizados.

## 29/09/26 — Nahuel (Claude Opus 5.5) — ARQ: resumen general al día
- **Hecho:** En [[ARQ — Vista general]] se reemplazó la introducción y la vieja sección *Componentes* por un **Resumen** con la tabla de piezas (web, mobile, paquete compartido, API en tres capas, base, proceso automático, IA, servidor y calidad). Se rehízo el diagrama del **monorepo** para que se lea impreso (frontend y backend separados, contrato OpenAPI y despliegue «si el pipeline pasa en `main`» en lugar de «deploy condicionado») y se corrigió la ruta del job a `rumbo.presentacion.jobs.diario`. La sección *Pendiente* pasó a *Decisiones que sostienen esta arquitectura* más los pendientes reales (C4, ratificación y ajustes del túnel).

## 29/09/26 — Nahuel (Claude Opus 5.5) — A3: vista lógica del backend
- **Hecho:** Nueva sección *Vista lógica del backend* en [[ARQ — Vista general]], organizada en el **modelo de tres capas** a pedido de Nahuel: **presentación** (routers, esquemas Pydantic, usuario actual y `jobs/diario.py`), **lógica de negocio** (servicios con una transacción por caso de uso, `estados/` con las reglas de los `EST-*` y `politicas.py` con DEC-0005/0008) y **acceso a datos** (modelos SQLAlchemy, repositorios, sesión con auditoría automática e `ia/` para Claude). Cada capa solo usa a la de abajo; el filtro de visibilidad lo decide negocio y el repositorio lo recibe como parámetro obligatorio. Once módulos, repetidos como archivos en cada capa, con dependencias sin ciclos (viajes ↔ economía se resuelve con `negocio/estados/viaje.py`). Diagramas de capas y de módulos exportados a PNG, y estructura de carpetas por capa.
- **Decisión de diseño a validar:** lo que hace el proceso automático queda con `created_by`/`updated_by` vacíos (= «lo hizo el sistema»), así que esas columnas son nullable en el script SQL (F2).
- **Pendiente:** F2 (script SQL); corregir DEC-0011 con lo del túnel (contenedor `cloudflared`, Cloudflare ve el tráfico descifrado, acceso local por el túnel).

## 29/09/26 — Nahuel (Claude Opus 5.5) — diagramas exportados a PNG
- **Hecho:** Como la entrega y la exposición van en PDF y no muestran los `.md`, todos los diagramas quedan exportados a PNG. Nuevo script `render-diagramas-diseno.sh` para los de `05-Diseño` (despliegue, monorepo y ciclo de trabajo del agente). La vista de despliegue de [[ARQ — Vista general]] se reordenó de izquierda a derecha para que se lea en papel (EAS Build queda solo en la vista del monorepo). Al volver a exportar el dominio aparecieron **tres PNG desactualizados** desde la sync de hoy: clases, ER y actividad del proceso diario; ya están regenerados. El resto coincide con su Mermaid. En [[Entregables — índice]] se sumó la tabla de dónde está cada PNG y cómo regenerarlo.
- **Pendiente:** A3 y F2.

## 29/09/26 — Nahuel (Claude Opus 5.5) — A2: vista de despliegue
- **Hecho:** En [[ARQ — Vista general]] se rehízo la *Vista de despliegue* según [[DEC-0011 Infraestructura de despliegue on-premise]]: usuarios, servicios externos (Cloudflare Tunnel, API de Claude, GitHub, EAS Build) y el servidor de la agencia con los cuatro contenedores, el runner self-hosted y el respaldo marcado como pendiente de PC2. El diagrama viejo quedó como *Vista de componentes del monorepo*, con la caja «a definir» reemplazada. Mermaid validado.
- **Pendiente:** A3 (vista lógica del backend) y F2 (script SQL).

## 29/09/26 — Nahuel, con Francisco y Paloma (Claude Opus 5.5) — día 0: entrevista de diseño
- **Hecho:** Entrevista de diseño con el equipo completo para cerrar todo lo que bloqueaba el día 1. Nuevas [[DEC-0011 Infraestructura de despliegue on-premise]] (on-premise con Docker Compose, scheduler con cron, Cloudflare Tunnel y runner self-hosted; RNF-08 y RNF-13 sin cambios, con el respaldo diferido a PC2) y [[DEC-0012 Modelo de IA del producto]] (Claude Sonnet 5.5, mínima). SQLAlchemy 2.0 async + Alembic en [[ARQ — Vista general]]; Dependabot en [[DEC-0001 Stack tecnológico]]. Nueva nota [[IA — Agentes del proyecto]] con el diagrama del ciclo de trabajo (Mermaid validado). En [[Estado del proyecto]]: entrega y oral el 02/10 a las 20 hs, frentes asignados (Nahuel arquitectura y API, Paloma prototipo, Francisco IA y documento), 11 pantallas, alcance de F1, F2 y E3, y supuestos de H0.
- **Pendiente:** formato del deck (viernes); actualizar [[Cronograma y PC]] y las portadas de los `.docx` con la nueva fecha.

## 29/09/26 — Nahuel (Claude Opus 5.5) — PC1 adelantado: plan comprimido a 3 días
- **Hecho:** El PC1 se adelantó. En [[Estado del proyecto]] se agregó el *Plan comprimido a 3 días* (30/09 → 02/10): tres frentes en paralelo (arquitectura/datos/API, prototipo UI, IA/documento único), sync express el día 1 para decidir A1, A4, A5, B1 y E1 y repartir los frentes, ratificación de ARQ al cierre del día 2 e integración, documento único y ensayo el día 3. Los recomendados C1–C3 salen del PC1. El calendario por semanas quedó marcado como superado.
- **Pendiente:** confirmar la fecha y hora exactas de entrega y actualizar [[Cronograma y PC]] y las portadas de los `.docx`; asignar los frentes en la sync del 30/09.

## 29/09/26 — Nahuel (Claude Opus 5.5) — plan del PC1 ajustado a la documentación obligatoria de la cátedra
- **Hecho:** Se compararon las láminas del PC1 (contenido, entrega «Documento con el MVC» y documentación obligatoria) con el vault. El análisis y el UML están completos; faltaban frentes de diseño técnico e IA. Se sumaron al plan de [[Estado del proyecto]] cuatro frentes obligatorios nuevos: **E** (modelo de IA del producto con `DEC-0012`, cadena de LangChain y prompts, agentes de desarrollo y del producto), **F** (contrato OpenAPI en JSON, script SQL desde el ER, diagramas de dominio a un entregable), **G** (modelo C4 de contexto, contenedores y componentes, sección MVC, modelo conceptual por capa) y **H** (preguntas a la cátedra, antecedentes, modelo de desarrollo, documento único `build-pc1.sh` y presentación oral). Se recalculó el calendario, se sumaron las casillas al checklist obligatorio y la lista oficial quedó en [[Cronograma y PC]].
- **Commits:** 5352451.
- **Pendiente:** confirmar con la cátedra qué significan «MVC» y «Modelo de desarrollo» (H0); repartir los frentes A a H en la sync.

## 29/09/26 — Nahuel (Claude Opus 5.5) — entregable de casos de uso limpio, cotización validada, enum cerrado y plan a PC1
- **Hecho:** (1) **Entregable de casos de uso limpio y regenerado.** Se sacaron de los CU fuente las marcas internas que el filtro dejaba pasar (fechas de resolución, «a ratificar», «Q6.1», `EST-*`, citas a la entrevista y al relevamiento por bloque) y se movió a Revisión la nota meta de CU-13. Además se reescribieron seis frases que quedaban cortadas al borrar referencias a DEC (CU-09, CU-10, CU-22, CU-24, CU-27 y CU-29), y se alinearon la descripción de CU-18 (filtros de precio y servicios) y la de CU-27 (pagos `anulados`). (2) La **vigencia de 1 mes de la [[Cotización]] quedó validada con la agencia**, así que ya no queda ningún requisito con valor abierto. (3) **`CategoriaViaje` cerrado** con `grupal · individual`, los dos valores del relevamiento: el tipo de producto va en [[Destino]] y el perfil en el segmento del [[Cliente]]. (4) Nuevo **plan detallado hacia PC1** en [[Estado del proyecto]] (arquitectura A1–A6, prototipo B1–B4, recomendados C1–C3, cierre D1–D3, con calendario propuesto). (5) En [[ARQ — Vista general]] se corrigieron datos viejos (13 entidades, DEC-0005 sellada, rol `freelance`).
- **Verificado:** el `.docx` de casos de uso tiene los 31 CU y el diagrama incrustado, y no filtra marcas internas ni frases cortadas; se regeneraron también el de Requisitos y los PNG de dominio.
- **Commits:** d93bfe7.
- **Pendiente:** confirmar en la sync el plan hacia PC1 (calendario y responsables); A1, decidir la infraestructura con una DEC-0011.

## 29/09/26 — Nahuel, con Francisco y Paloma (Claude Opus 5.5) — sync: cierre de todas las disyuntivas y ratificación
- **Hecho:** Sync con el equipo completo. Se recorrió toda la *Agenda para la próxima sync* de [[Estado del proyecto]] y se decidió cada punto. **Viaje y cobros:** el primer cobro de cualquier tipo pasa el viaje a `vendido`; nueva reversión `vendido → reservado` ([[EST-Viaje]] T10); el [[Pago]] es indivisible y un pago parcial se resuelve dividiendo la cuota (nuevo [[CU-11 Definir plan de cuotas]] A6). **Oportunidad:** la cierra `ganada` [[CU-07 Confirmar reserva]]. **Cancelación:** al revertirla la comisión vuelve a quedar proyectada y se reabren solo las alertas que cerró (nuevo `Alerta.cerrada_por_cancelacion`). **CU-01** reordenado (cliente → consulta) y con 5 pasos. **Proceso diario** a las 00:00; nuevo tipo de [[Alerta]] `viaje`; recontacto sin duplicar y asignado al responsable del cliente. **Defaults:** `salida` 7 días verificado con la agencia; vigencia de cotización 1 mes, falta validar; `forma_pago` sin cambios (billeteras virtuales = `transferencia`). **Recargo por mora descartado.** **Requisitos:** auditoría en todas las entidades, RF-106 conserva sus filtros (al plantear la pregunta se usó una nota desactualizada y el equipo lo corrigió), y RNF con valores fijados por el equipo (respaldo diario de 30 días, p95 ≤ 2 s con 10 usuarios, 24/7, navegadores y SO). Se **formalizaron** (29/09/26) 66 notas: 31 CU, diagrama de CU, 13 entidades, clases, ER, 6 EST, 5 DGM-ACT, 4 DGM-SEC, Requisitos, Circuito de la consulta a la venta, DEC-0002 y DEC-0010.
- **Verificado:** se re-renderizaron los PNG de actividad, secuencia, clases, ER y estados (todos OK); se regeneró `Rumbo — Requisitos.docx` sin fugas de cocina interna.
- **Commits:** c9199cd.
- **Pendiente:** **limpiar y regenerar el entregable de casos de uso** (no se regeneró a propósito, porque filtraría marcas internas); validar con la agencia la vigencia de la cotización; cerrar `CategoriaViaje`; arquitectura, infraestructura y prototipo en Figma.

## 25/09/26 — Nahuel (Claude Opus 5.5) — reorganización de las imágenes de dominio
- **Hecho:** Nahuel reordenó a mano las imágenes de `03-Dominio/Diagramas/` para que cada tipo tenga su carpeta: los PNG de clases a `Clases/`, el del ER a `DER/`, los de estado a `Estados/img/` y `mermaid-config.json` a la raíz de `Diagramas/`; se eliminó `Diagramas/img/`. Se adaptó `render-diagramas-dominio.sh` para que regenere cada PNG en su carpeta nueva y se actualizaron el [[MOC — Modelo de dominio]] y la [[Guía del Vault]].
- **Verificado:** el script regenera los 11 PNG en las rutas nuevas y no vuelve a crear `Diagramas/img/`.
- **Commits:** 128b08b.
- **Pendiente:** —

## 25/09/26 — Nahuel (Claude Opus 5.5) — diagramas movidos a 03-Dominio/Diagramas
- **Hecho:** A pedido de Nahuel, **todos los diagramas del modelo UML viven en `03-Dominio/Diagramas/`**, con una subcarpeta por tipo: los 5 de actividad pasaron a `Actividad/` y los 4 de secuencia (incluido [[DGM-SEC — De la consulta a la venta]], la vista de negocio) a `Secuencia/`, cada uno con su `img/`. Se actualizaron las rutas en `render-diagramas-actividad.sh`, `render-diagramas-secuencia.sh` y `build-relevamiento.sh`, la [[Guía del Vault]], [[DEC-0010 Notación de los diagramas de actividad y de secuencia]] y el [[MOC — Casos de uso]], y se sumaron las secciones de actividad y secuencia al [[MOC — Modelo de dominio]]. Los enlaces `[[ ]]` no cambian porque los nombres de nota son los mismos.
- **Verificado:** los dos scripts regeneran los 8 PNG y el entregable de relevamiento compila con la Figura 1 desde la ruta nueva.
- **Commits:** a6a1169.
- **Pendiente:** la sesión que hace los diagramas de secuencia tiene que trabajar sobre las rutas nuevas (se le avisó).


## 25/09/26 — Nahuel (Sonnet 5) — diagramas de secuencia 3 de 3, completos
- **Hecho:** Se dibujó el tercer y último diagrama de secuencia acordado: [[DGM-SEC — Cancelar viaje]] (CU-27), con la misma notación ya cerrada en [[DEC-0010 Notación de los diagramas de actividad y de secuencia|DEC-0010]] (actor → `Interfaz` → `Sistema Rumbo` → `Viaje`/`Pago`/`Alerta` → `Base de Datos`). Sigue paso a paso el camino principal de [[DGM-ACT — Cancelar viaje]]: el `alt` de A1 (viaje `finalizado`) corta antes de cancelar; dentro del camino principal, un `alt` anidado cubre A2 (pagos ya cobrados) y otro cubre A4 (viaje `en curso`, mantiene la comisión); A3 (revertir la cancelación) va como continuación cronológica al final, igual que en CU-12. Se enlazó desde CU-27 y el [[MOC — Casos de uso]], se sumó al `render-diagramas-secuencia.sh` y se verificó el render con `mermaid-cli`. Con este quedan **los 3 `DGM-SEC` de análisis completos** (CU-07, CU-12, CU-27), más el de negocio ([[DGM-SEC — De la consulta a la venta]]) sin tocar.
- **Sin hallazgos nuevos:** el diagrama dibuja lo que ya decía [[DGM-ACT — Cancelar viaje]]; los huecos son los mismos (ver su Revisión).
- **Commits:** df1560b.
- **Pendiente:** ratificar en la sync los 3 `DGM-SEC` y la convención de participantes (`Interfaz` + `Base de Datos`, sumadas en dos ampliaciones durante el día).

## 25/09/26 — Nahuel (Sonnet 5) — diagramas de secuencia 1 y 2 de 3
- **Hecho:** Se cerró el detalle de notación que [[DEC-0010 Notación de los diagramas de actividad y de secuencia]] dejaba pendiente para los `DGM-SEC`, acordado con Nahuel antes de dibujar: (1) el [[DGM-SEC — De la consulta a la venta]] existente **se conserva tal cual** como vista de negocio (Figura 1 del relevamiento); los diagramas nuevos con clases van aparte, en `02-Analisis/Diagramas de secuencia/`; (2) participantes = actores + una única clase de **control** (`Sistema Rumbo <<control>>`) + las clases de **entidad** del dominio que cada CU manipula, **sin clase boundary**; (3) mensajes en **español, lenguaje natural** (no firmas de método), porque el diagrama de clases de dominio no lleva operaciones. Se dibujaron los dos primeros de los tres acordados (CU-07 y CU-12, los que más huecos de estado dejaron en los `DGM-ACT`): [[DGM-SEC — Confirmar reserva]] y [[DGM-SEC — Registrar cobro de un pago]], con un `Note over` por paso del camino principal (misma trazabilidad que los `DGM-ACT`) y las transiciones `EST-*` citadas en cada respuesta. Se sumó `render-diagramas-secuencia.sh` (PNG en `img/`, ambos verificados con `mermaid-cli`) y se enlazaron desde CU-07, CU-12 y el [[MOC — Casos de uso]].
- **Hallazgo de layout:** en `sequenceDiagram` un "flujo aparte" (como A3 de CU-12, que ocurre en otro momento) **no necesita el truco de layout** que sí hace falta en `flowchart` (nodo inicial + enlace invisible): al ser cronológico de arriba a abajo, alcanza con seguir dibujando más abajo y anunciarlo con un `Note`.
- **Sin hallazgos nuevos de dominio:** ambos diagramas dibujan lo que ya decían sus `DGM-ACT`; los huecos son los mismos (ver la Revisión de cada nota).
- **Ampliación (mismo día, a pedido de Nahuel):** se sumó la **Base de Datos** como participante `<<database>>` al final de la fila, en ambos `DGM-SEC`. Regla agregada a [[DEC-0010 Notación de los diagramas de actividad y de secuencia|DEC-0010]]: **toda vez que una clase de entidad busca o guarda información, se comunica con la Base de Datos** (ida y vuelta propio, debajo del mensaje entidad↔control). No es una clase de dominio nueva (no va al [[DGM — Diagrama de clases]]); es infraestructura, como el [[DGM-ER]]. Los dos diagramas se re-renderizaron y verificaron.
- **Segunda ampliación (mismo día, a pedido de Nahuel):** el `Empleado` **no habla directo con `Sistema Rumbo`**; se sumó una clase de **interfaz** (`Interfaz <<boundary>>`) que media entre ambos y solo reenvía, sin agregar lógica — orden final de participantes: actor → `Interfaz` → `Sistema Rumbo` → entidades → `Base de Datos`. Regla agregada a DEC-0010 (queda con boundary-control-entity **completo**, ya no parcial). No aplica a `Cliente`, que sigue hablando solo con `Empleado` (externo). Los dos diagramas se re-renderizaron y verificaron.
- **Commits:** b3650e7, a69c6c7, 4ac98cb, ae51867.
- **Pendiente:** falta el tercero, [[CU-27 Cancelar viaje|CU-27]] (ahora con Interfaz + Base de Datos). Ratificar en la sync los dos ya hechos y las dos ampliaciones de notación.

## 25/09/26 — Nahuel (Claude Opus 5.5) — cierre: decisiones documentadas y handoff
- **Hecho:** Se registró [[DEC-0010 Notación de los diagramas de actividad y de secuencia]] (`en-revision`): notación UML de actividad en `flowchart` de Mermaid y diagramas de secuencia con las clases del sistema como participantes, con las alternativas descartadas (PlantUML, sintaxis de secuencia, `block-beta`). Se agregó al [[Estado del proyecto]] una **Agenda para la próxima sync** que indexa todas las decisiones abiertas (ratificaciones, los 18 huecos de los diagramas de actividad y los pendientes previos), con punteros a su nota. Se sumó el puntero a DEC-0010 en el [[MOC — Decisiones (ADR)]] y en la memoria del proyecto.
- **Commits:** feddd66.
- **Pendiente:** próxima sesión, **diagramas de secuencia** (lanzada con handoff). Sigue la tarea de limpiar y regenerar el entregable de Casos de uso.

## 25/09/26 — Nahuel (Claude Opus 5.5) — diagramas de actividad 3 a 5
- **Hecho:** Nahuel aprobó el formato y se dibujaron los tres que faltaban: [[DGM-ACT — Registrar cobro de un pago]] (CU-12), [[DGM-ACT — Cancelar viaje]] (CU-27) y [[DGM-ACT — Proceso automático diario]]. En CU-12 y CU-27, el flujo alternativo **A3** (revertir un cobro o una cancelación) se dibujó como **actividad aparte** con su propio nodo inicial, porque ocurre después y no es una rama del flujo. El proceso diario **no es un CU**: junta en cuatro tareas paralelas lo que el sistema hace solo (vencer pagos y cotizaciones, sugerir el avance de los viajes, detectar recontactos) y se traza a las transiciones `EST-*` y a los pasos de los CU que lo definen. Se enlazaron desde CU-08, CU-12, CU-27, CU-30 y el [[MOC — Casos de uso]], y se sumaron al script de render.
- **Hallazgos (a decidir, no resueltos):** revertir el cobro de la **seña** deja el viaje `vendido` sin seña (no hay `vendido → reservado`); el enum de `forma_pago` de CU-12 no coincide con el de [[Pago]]; los **cobros parciales** no están contemplados; revertir una cancelación no dice qué pasa con la **comisión** ni qué alertas reabrir; la **frecuencia del proceso automático no está definida** (que sea diario es un supuesto); [[EST-Pago]] dice que T3 es la única transición automática (ya no lo es); no está definido cómo llega la **sugerencia de avance del viaje** ni a quién se asigna la alerta de **recontacto**. Detalle en la Revisión de cada nota.
- **Límite técnico:** ELK ubica arriba del inicio principal la actividad aparte (A3) si no está conectada; se la empuja al final con un enlace invisible (`fin ~~~ ini3`).
- **Commits:** d356188.
- **Pendiente:** ratificar los 5 diagramas y los 18 huecos en la sync. Queda por hacer el diagrama de **secuencia** con las clases del sistema (formato de secuencia de Mermaid).

## 25/09/26 — Nahuel (Claude Opus 5.5) — diagramas de actividad rehechos en notación UML
- **Hecho:** Nahuel aclaró que el formato de secuencia que había pedido era para los **diagramas de secuencia** (que también hay que hacer, con las clases del sistema como participantes), y que los de actividad siguen el formato UML clásico con carriles. Se rehicieron [[DGM-ACT — De la consulta a la venta]] y [[DGM-ACT — Confirmar reserva]] como `flowchart` de Mermaid con nodo inicial ●, final ◉, decisiones y fusiones en rombo, fork/join en barra y guardas entre corchetes. Se conservaron los **marcos por paso** del camino principal, las tablas de trazabilidad y los huecos detectados (siguen vigentes).
- **Límite técnico:** Mermaid **no dibuja carriles en columnas**: se probaron subgrafos con ELK, con el motor por defecto y con `flowchart LR` + `direction TB`, y en todos los casos los apila o los desordena; el diagrama de bloques (`block-beta`) falla al dibujar flechas en Mermaid 12. Nahuel eligió quedarse en Mermaid con la **notación de partición dentro de la acción** que admite UML (`(Empleado) Registra el cobro`) más un color por carril, en vez de pasar a PlantUML (que exigía una DEC, Java y un plugin de Obsidian). Además, Mermaid ignora `classDef` en los nodos inicial y final: se pintan con un `themeCSS` en el encabezado, que **no puede llevar el carácter `>`** porque Mermaid lo descarta.
- **Commits:** 171a574.
- **Pendiente:** revisión de Nahuel; después, los diagramas 3 a 5. Verificar que Obsidian renderice las formas nuevas (`@{ shape: … }` requiere Mermaid 11.3 o superior).

## 25/09/26 — Nahuel (Claude Opus 5.5) — diagramas de actividad (1 y 2 de 5)
- **Hecho:** Se acordaron **5 diagramas de actividad**: de la consulta a la venta (CU-01), confirmar reserva (CU-07), registrar cobro (CU-12), cancelar viaje (CU-27) y el proceso automático diario. Nahuel pidió dibujarlos con la **sintaxis de secuencia de Mermaid** (`alt`, `loop`, `break`, `par`, `opt`), con **trazabilidad con el camino principal** de cada CU, y hacerlos de a dos para revisarlos. Se hicieron los dos primeros en `02-Analisis/Diagramas de actividad/`: [[DGM-ACT — De la consulta a la venta]] y [[DGM-ACT — Confirmar reserva]]. Cada paso del camino principal es una **franja** con el nombre y número del paso, cada fragmento lleva el código del flujo alternativo que lo origina y los cambios de estado citan su transición `EST-*`; cada nota cierra con una tabla paso → franja y alternativo → fragmento. Se agregó `render-diagramas-actividad.sh` (PNG en `img/`) y se enlazaron desde CU-01, CU-07 y el [[MOC — Casos de uso]]. La [[Guía del Vault]] pasó los diagramas de secuencia y actividad a `02-Analisis/`, donde viven de hecho.
- **Límite técnico:** en `sequenceDiagram`, las autollamadas (`R->>R`) escriben el texto a la derecha de la línea de vida y se pisan con los marcos anidados; las acciones internas del sistema se dibujan como **nota ámbar** sobre el Sistema Rumbo.
- **Hallazgos (a decidir, no resueltos):** 🚨 **un viaje sin seña nunca pasa a `vendido`** (CU-11 permite pago único, pero la guarda de EST-Viaje T2 exige un pago `tipo = seña`, y T3 solo sale de `vendido`); orden de los pasos 1 y 2 de CU-01 distinto al de CU-04; el paso 5 de CU-01 ocurre en realidad dentro del paso 4; precondición de CU-05 sin `en_gestión`; precondición de CU-10 dice `vendido` en vez de `reservado`; no está claro quién hace la transición a `ganada` (CU-05 o CU-07). Detalle en la Revisión de cada diagrama.
- **Commits:** d2b89c4.
- **Pendiente:** revisión de Nahuel; después, los diagramas 3 a 5.

## 25/09/26 — Nahuel (Claude Opus 5.5) — ediciones manuales de los `.docx`, pasadas a la fuente
- **Hecho:** Las ediciones que Nahuel hizo a mano en Word (commit `96b152d`) sobre los entregables de Relevamiento y Requisitos se trasladaron a los `.md` y a los scripts, para que no se pierdan al regenerar. Se compararon ambas versiones de cada `.docx` (texto, estilos por nombre, formato directo y partes internas). Casi todo el cambio de estilos era **ruido de Word al guardar** (renombra los estilos al español y quita propiedades redundantes); las ediciones reales eran siete: **(1)** sin las marcas ❌/✅ en las listas de alcance → las quita `build-relevamiento.sh` y la nota [[Alcance y fuera de alcance]] las conserva para Obsidian; **(2)** Figura 1 más grande (85 % → 95 % del ancho); **(3)** su leyenda sin énfasis en «Figura 1.»; **(4)** introducción de Requisitos sin «—de la consulta a la venta—» ni «para la primera prueba de concepto (PC1)»; **(5)** «(transversal)» sin cursiva en RF-151 a RF-153; **(6)** sin el título «Table of Contents»; **(7)** sin número de página. Las dos últimas vienen de la plantilla que comparten los **tres** entregables y se decidieron con Nahuel: el índice pasa a titularse **«Índice»** y el pie queda con **el número solo**, sin guiones (`make-reference.ps1`; además el campo `PAGE` lleva un resultado inicial para que se vea en visores que no actualizan campos). Se regeneraron `reference.docx` y los `.docx` de Relevamiento y Requisitos. Convenciones anotadas en [[Entregables — índice]].
- **Verificado:** el texto regenerado coincide con la versión editada salvo el título «Índice» y el subtítulo «Origen de los requisitos», que el `.md` ya había renombrado en `afba768` (el `.docx` había quedado con el nombre viejo). No quedó ningún ❌/✅ y el pie tiene el campo de página.
- **Hallazgo:** el `.docx` de **Casos de uso** no se regenera desde el 21/09 y le faltan los cambios de ese día (vencimiento de Cotización, `Pago.vencido`, CU-27 A4, etc.). Al regenerarlo **se filtran marcas internas**: «a ratificar», «regla del 21/09», «ver EST-Oportunidad T8», y un recorte roto en CU-27 («sigue valiendo lo de; esto es»). **No se commiteó**: sigue la versión anterior hasta limpiar esas notas en los CU fuente.
- **Commits:** 1bfbc77.
- **Pendiente:** limpiar las filtraciones de los CU y regenerar el entregable de Casos de uso (saldrá ya con «Índice» y el pie nuevo).

## 22/09/26 — Nahuel (Claude Opus 5.5) — PNG de los diagramas de dominio
- **Hecho:** Los diagramas de clases, ER y de estados existían solo como Mermaid dentro de sus notas y no estaban exportados. Se renderizaron los **11 PNG** a `03-Dominio/Diagramas/img/`: la vista principal de clases, las 3 bandas de enumeraciones, el ER y los 6 de estado. Se agregó `07-Entregables/build/render-diagramas-dominio.sh` para regenerarlos y un puntero en [[MOC — Modelo de dominio]]. **Límite técnico encontrado:** con la configuración por defecto, `mermaid-cli` **cortaba la última letra de cada texto** en clases y ER ("UUID ic", "USUARI", "PAGC"). Se corrige con `htmlLabels: false` (`img/mermaid-config.json`); los de estado salen bien sin ella. Además, a escala 3 los dos diagramas grandes superan el lienzo máximo, así que todos quedan a escala 2. **No se tocaron los `.docx`**: Nahuel los editó a mano a propósito, y correr los scripts de compilación pisaría esas ediciones.
- **Commits:** _(ver git log)_.
- **Pendiente:** decidir si los diagramas de dominio entran a algún entregable. Si se regeneran los `.docx` desde los scripts, **se pierden las ediciones manuales de Nahuel**: hay que pasarlas antes a los `.md` fuente.

## 22/09/26 — Nahuel (Claude Opus 5) — relevamiento al vault e integridad entre entregables
- **Hecho:** Nahuel trajo el `.docx` de relevamiento (`rumbo-relevamiento-OLA.docx`, editado a mano y fuera del vault) para cruzarlo con el catálogo de requisitos. **Estaba desactualizado en 7 puntos**, tres de ellos contradiciendo decisiones ya selladas: actores viejos (Agente/Asesor, `admin` y `dueño` fusionados, redes como rol, sin `freelance`); modelo económico "costo neto + comisión automática", superseded por [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]]; **scraping listado como "a definir (fase 2)"** cuando el 11/09 se descartó para PC1; y faltaban el canal `presencial`, el segmento `pareja`, el CRM proactivo, el vencimiento a proveedor, los catálogos (Destino/Operador/RequisitoDestino), el módulo de Configuración y toda la autenticación.
- **Hecho (cont.) — se incorporó al pipeline.** En vez de parchear el `.docx` suelto, se hizo el tercer entregable generado: `07-Entregables/Relevamiento/` + **`build-relevamiento.sh`** (mismo `filtrar()` y misma plantilla que los otros dos). Se crearon las tres notas que solo existían dentro del `.docx`: [[Justificación del sistema]], [[Herramientas del proyecto]] (elección de Claude + comparativa + Mermaid) y [[Circuito de la consulta a la venta]]; y se propagaron las decisiones a [[Objetivos del sistema]] y [[Alcance y fuera de alcance]] (que sumó los módulos de *Configuración y catálogos* y *Usuarios y seguridad*, el envío manual de avisos, y pasó "A definir" a "Fase 2" con enunciados afirmativos). Los tres documentos salen ahora de la misma fuente de verdad.
- **Hecho (cont. 2) — la regla de integridad:** 🔑 **cada contenido vive en un solo documento y los otros lo referencian.** El **alcance** quedó **únicamente en el relevamiento**: se eliminó la sección `# Alcance del sistema` de [[Requisitos funcionales]], que ahora remite a él. Simétricamente, la **especificación formal del circuito** (precondiciones, flujos alternativos, postcondiciones) vive solo en [[CU-01 De la consulta a la venta]]; el relevamiento lleva un **resumen de alto nivel** en [[Circuito de la consulta a la venta]], que reemplaza al "caso de uso genérico" embebido que traía el `.docx`. La regla quedó escrita en [[Entregables — índice]] para que no se vuelva a duplicar.
- **Hecho (cont. 3) — diagrama de secuencia en Mermaid.** La Figura 1 del relevamiento era una **imagen** con "Agente / Asesor" y "comisión" (modelo viejo). Nahuel primero pidió dejarla y sobre el final de la sesión pidió rehacerla: se creó [[DGM-SEC — De la consulta a la venta]] en **Mermaid**, versionable, con los actores vigentes, el modelo económico de DEC-0007 (venta, costo del operador, comisión del vendedor → ganancia y margen calculados) y los **estados de [[Oportunidad]] y [[Viaje]] explícitos** en cada respuesta del sistema, para poder cruzarlo con [[EST-Oportunidad]] y [[EST-Viaje]]. Lleva `autonumber` (21 pasos) y notas ámbar para lo que resuelve el sistema solo. **Límite técnico:** `sequenceDiagram` **no acepta ELK** —usa su layout propio—, a diferencia de los diagramas de clases, ER y estados; queda documentado en la nota. Con esto se cierra el diagrama de secuencia principal del checklist de PC1 (falta el de registrar pago).
- **Verificado:** el DOCX de relevamiento se genera con **0 fugas y 0 artefactos** (se detectaron y sanearon tres notas meta que se colaban al entregable: las introducciones de [[Justificación del sistema]] y [[Herramientas del proyecto]], y la de [[Circuito de la consulta a la venta]], que hablaban del propio entregable; se movieron a sus secciones de Revisión). El Mermaid renderiza con `mermaid-cli`. El DOCX de requisitos se regeneró sin el alcance: **153 RF + 16 RNF** intactos.
- **Commits:** afba768.
- **Pendiente:** ratificar en la sync las notas nuevas y el diagrama de secuencia. El `.docx` original en `Downloads/rumbo-relevamiento-OLA.docx` **quedó obsoleto**: el vigente se genera desde el vault. Sigue abierto el diagrama de secuencia de **registrar pago** y los 5 puntos de los RNF.

## 22/09/26 — Nahuel (Claude Opus 5) — reencuadre del documento de requisitos
- **Hecho:** A pedido de Nahuel, [[Requisitos funcionales]] se **reencuadró para el entregable**, sin tocar el contenido de los 153 RF. Tres cambios: **(1) la narrativa se invirtió** — el documento ya no se presenta como derivado de los CU, sino al revés: los requisitos son la base del análisis y los **casos de uso son su realización**. El campo `**Origen:** CU-xx — paso 3, A1` de cada ficha pasó a `**Casos de uso:** CU-xx` (se quitaron los pasos, que delataban la dirección de la derivación), la matriz se releyó como "este CU realiza estos requisitos" y se reescribieron la introducción, las convenciones y la portada del entregable. **(2) Se sacó del cuerpo toda la cocina interna**: las tablas de *RNF sin definir* y *RF con dependencias abiertas*, las menciones a `en-revision`, "a ratificar" y "sin validar", y la explicación del método. Nada se perdió: **todo se movió a la sección `## 🔎 Revisión`** de la misma nota, que el filtro del entregable recorta. **(3) Los RNF se rehicieron**: de 13 "respaldados" con ocho huecos declarados, a **16 organizados por atributo de calidad** (seguridad, fiabilidad y robustez, rendimiento, usabilidad, disponibilidad, portabilidad y compatibilidad, mantenibilidad, localización y privacidad), cada uno con **justificación anclada en este negocio** y **criterio de verificación**. La sección de huecos desapareció del entregable.
- **Hecho (cont.) — dónde quedó el límite:** los RNF **los redactó el equipo, no salen del relevamiento**, y eso queda advertido en la sección de Revisión con la lista de **5 puntos a confirmar** antes de comprometerlos en PC2 (política de respaldo, horario de atención real de la agencia, volumen y concurrencia si se quieren metas medibles de rendimiento, navegadores y versiones soportadas, y el cifrado en tránsito / almacenamiento no reversible de credenciales, que se dan por parte del diseño sin estar en ninguna `DEC-`). Para no inventar dato de negocio se redactaron **sin comprometer ningún valor numérico**: nada de tiempos de respuesta, porcentajes de disponibilidad ni volúmenes: las exigencias están enunciadas de forma cualitativa pero verificable. El resto de los RNF se apoya en decisiones ya selladas o en criterios que el vault aplica de hecho.
- **Verificado:** los 153 RF y los 16 RNF están en el `.md` y en el DOCX; el `.md` filtrado da **0 fugas** (sin `DEC-`, `tags::`, wikilinks, la sección de Revisión, ni las palabras "ingeniería inversa", "ratificar", "sin definir", "sin validar", "vault", "sync" ni nombres del equipo) y **0 artefactos** de recorte. Actualizados [[Estado del proyecto]], [[Entregables — índice]] (con la convención de narrativa, para que no se pierda al editar) y [[MOC — Casos de uso]].
- **Commits:** 89ac6f9.
- **Pendiente:** ratificar el catálogo en la sync y llevar los **5 puntos de los RNF** a la próxima ronda con la agencia y con el equipo. _(Nota operativa: la primera compilación falló con *permission denied* porque el `.docx` estaba abierto en Word; hay que cerrarlo antes de correr el script. Quedó anotado en [[Entregables — índice]].)_

## 21/09/26 — Nahuel (Claude Opus 5) — requisitos funcionales y no funcionales
- **Hecho:** Se creó [[Requisitos funcionales]] (`02-Analisis/`), el catálogo de requisitos del sistema: **153 RF + 13 RNF**. Los RF se obtuvieron por **ingeniería inversa** sobre los **31 CU** —se recorrió cada uno entero (flujo principal, alternativos, precondiciones, postcondiciones y reglas) y se extrajo la capacidad funcional, separándola del guion de interacción—; **cada RF declara el CU y el punto exacto** (paso o `A#`) que lo respalda, además de actor, tipo, prioridad y entidades. La nota cierra con la **matriz de trazabilidad CU → RF** (los 31 CU, ninguno sin cobertura), las **restricciones de alcance**, los **RNF sin definir** y los **RF con dependencias abiertas**. Antes de escribir se acordaron con Nahuel las cuatro decisiones de formato: alcance RF+RNF respaldados, ficha media por requisito, un solo catálogo agrupado por los 11 módulos del [[MOC — Casos de uso]] y matriz CU → RF incluida.
- **Hecho (cont.) — el criterio para no inventar:** **nada del catálogo agrega funcionalidad nueva**. Donde el vault no tenía dato, se dejó el hueco explícito en vez de completarlo: los **8 RNF sin valor acordado** (rendimiento, volumen y concurrencia, disponibilidad, backup, usabilidad, compatibilidad, política de contraseñas e infraestructura) se listan como pendientes, sin números estimados, y los **9 RF con dependencias abiertas** citan qué falta cerrar en cada uno (la vigencia de 1 mes de la cotización, los 7 días de la alerta `salida`, el enum `forma_pago`, la comisión al cancelar un viaje `en curso`, los filtros de [[Hotel]] por precio y servicios, el alcance de la auditoría). La **prioridad**, que el vault no registra, se derivó con un **criterio explícito y documentado** (flujo principal = alta; alternativo, validación o corrección = media; marcado opcional o futuro = baja) en vez de asignarla a ojo; los 31 CU son todos PC1, así que ordena el trabajo dentro de la etapa, no decide qué entra. Tres capacidades **compartidas por dos CU se escribieron una sola vez** y se referencian desde ambos en la matriz: **RF-034** (CU-07 la dispara, CU-15 la configura), **RF-059** (el rebalanceo de CU-10 A4 y CU-11 A5 es el mismo) y **RF-038** (CU-08 describe la transición, CU-12 la dispara). **[[CU-01 De la consulta a la venta|CU-01]] no genera RF propios** por ser el flujo núcleo: sus tres alternativos ya están cubiertos (A1 → RF-015, A2 → RF-060 y RF-068, A3 → RF-034). Un solo requisito, **RF-072** (el [[Pago]] es indivisible), sale de una **nota de revisión** de CU-12 y no del cuerpo del CU; se incluyó por ser una restricción real del dominio, pero queda marcado para subirlo al cuerpo del CU si se ratifica.
- **Hecho (cont. 2) — entregable:** se armó `07-Entregables/Requisitos/` con su portada e introducción y el script **`build-requisitos.sh`**, que reutiliza **el mismo `filtrar()`** y la misma plantilla `reference.docx` que el entregable de casos de uso, de modo que los dos documentos salen con idéntica estética. Se registró el entregable en [[Entregables — índice]] y se apuntó desde [[MOC — Casos de uso]] y [[Estado del proyecto]] (ítem del checklist marcado; la *Matriz de trazabilidad* del checklist queda como **medio hecha**: el tramo CU → RF ya está, falta objetivo → CU y CU → entidad/regla). **Límite encontrado al compilar:** el `filtrar()` heredado **no limpia dos referencias `DEC-` encadenadas dentro de un mismo paréntesis** — al recortarlas quedan separadores sueltos (`,,,`). En vez de tocar el filtro compartido (que hoy funciona bien para los 31 CU), se **reescribieron las tres frases** del `.md` fuente poniendo la referencia a la decisión al final del paréntesis, y se documentó la convención en [[Entregables — índice]].
- **Verificado:** numeración **RF-001 → RF-153 contigua y sin duplicados**; los **57 enlaces `[[ ]]` distintos** de la nota resuelven a archivos existentes; el `.md` filtrado da **0 fugas** (sin `DEC-`, `tags::`, `#accion/`, wikilinks ni la sección de Revisión) y **0 artefactos** de recorte; el DOCX se generó y contiene los **153 RF**.
- **Commits:** 8fdb1fc.
- **Pendiente:** **ratificar el catálogo en la sync**, en especial el criterio de prioridad y los tres RF compartidos. **Llevar los 8 RNF sin definir a la próxima ronda con la agencia y al equipo** antes de que PC2 los decida por omisión (volumen de operaciones y usuarios en simultáneo son pregunta para la agencia; backup, compatibilidad y política de contraseñas son decisión del equipo). Evaluar si **RF-153** (baja lógica transversal en 8 entidades) merece una **RN propia**, como [[RN-01 Comisión automática]]. Completar el resto de la matriz de trazabilidad (objetivo → CU → entidad → regla).

## 21/09/26 — Nahuel (Claude Opus 5) — dibujo de los 6 diagramas de estado
- **Hecho:** Se **dibujaron los 6 diagramas de estado**, cada uno dentro de la sección `## Diagrama` de su nota `EST-*` (no se crearon notas nuevas): [[EST-Viaje]], [[EST-Oportunidad]], [[EST-Pago]], [[EST-Cotización]], [[EST-Alerta]] y [[EST-ContenidoRed]]. Con esto el punto de diagramas de estado del checklist de PC1 queda **cerrado** (falta ratificar en la sync). **Convención acordada con Nahuel antes de empezar**, común a los seis y documentada en la sección *Convenciones del diagrama* de cada nota: motor **ELK** (`BRANDES_KOEPF`, líneas ortogonales, paleta slate) igual que [[DGM — Diagrama de clases]] y [[DGM-ER]]; **cada flecha etiquetada `Tn · evento`** para poder cruzar diagrama ↔ tabla de transiciones; **reversiones y orígenes múltiples desplegados** (una flecha por destino real, en vez de una flecha abstracta "al estado anterior"); y **color por tipo de estado** vía `classDef` (verde cierre, rojo baja lógica, ámbar atraso). Los dos disparadores distintos que producen el mismo salto van en **una sola flecha con las dos etiquetas** (p. ej. `pendiente → anulado` por T5 y T7 en [[EST-Pago]]), porque desplegarlos dejaba el layout ilegible.
- **Hecho (cont.) — límite técnico encontrado:** **Mermaid no permite estilar flechas individuales en `stateDiagram-v2`**. `linkStyle` se parsea sin error pero **no se aplica** (verificado renderizando: todas las aristas salen `edge-pattern-solid`), así que la instrucción original de dibujar las correcciones en **línea punteada** no se pudo cumplir. Se reemplazó por **símbolos en la etiqueta**: `⚙` transición automática del sistema, `↺` corrección o reversión de un error de carga, sin símbolo = acción de una persona. El `classDef` sí funciona sobre los **estados**, y de ahí el color. Queda documentado en las seis notas para que nadie lo vuelva a intentar. También se verificó que **ELK sí se aplica a `stateDiagram-v2`** (comparado contra dagre: layouts distintos; dagre daba un resultado peor y se descartó). En [[EST-ContenidoRed]] hubo que **declarar los cinco estados en orden** antes de las transiciones, porque el retroceso del kanban (T5) le daba vuelta el orden de las columnas a ELK.
- **Hecho (cont. 2) — dos hallazgos de dominio al dibujar**, ambos **borrador a ratificar**: **(1)** 🚨 **Cancelar un viaje `en curso` borraba la comisión.** La precondición de [[CU-27 Cancelar viaje]] siempre permitió cancelar un viaje ya iniciado, pero arrastraba el paso 5 completo, así que un viaje **que ya se había prestado** perdía la comisión proyectada. Nahuel resolvió que desde `en curso` la cancelación es una **interrupción**: la comisión **se mantiene**, los cobros quedan y solo se anulan las cuotas no cobradas. Nuevo flujo **A4** en [[CU-27 Cancelar viaje]] + invariante y hueco 5 en [[EST-Viaje]]. Se descartó crear un estado `interrumpido` propio (costaba enum, entidad, clases, ER y CU para un caso de borde) y también sacar `en curso` de los orígenes, porque la fuerza mayor durante el viaje es un caso real. **No se reabrió [[RN-01 Comisión automática]]**, que está `formalizado`: la regla no cambia, lo que cambia es *cuándo se considera realizada*, y eso vive en el CU. **(2)** [[CU-05 Seguir oportunidad]] **A3 estaba desactualizado**: decía que la reactivación de una oportunidad `perdida` vuelve a `nueva`/`cotizada`, cuando el 21/09 se había resuelto que vuelve a **`en_gestión`** ([[EST-Oportunidad]] T8). Era propagación pendiente, no una decisión nueva; se corrigió.
- **Hecho (cont. 3):** A pedido de Nahuel, cada nota suma la sección **"Para qué se creó cada transición poco obvia"**: el **caso concreto** que justifica cada flecha que no se explica sola, para que el equipo no tenga que reconstruirlo de memoria en la sync. Son 28 casos en total (la transferencia que nunca entró y por qué la cuota vuelve a `vencido` y no a `pendiente`; el grupo en Bariloche al que le levantan el servicio; el cliente habitual que compra por WhatsApp sin cotización; la cotización de mayo que el cliente trae en julio; por qué la [[Alerta]] **no** tiene estado `vencida` y el [[Pago]] sí; por qué la IA no mueve la tarjeta del kanban…). Todos van marcados como **ejemplos ilustrativos que no salen del relevamiento**, para que nadie los cite después como dato de la agencia. Se corrigieron además dos erratas de numeración de las especificaciones (en [[EST-Alerta]] el hueco 3 decía T9 por T7; en [[EST-ContenidoRed]] el hueco 2 decía T8 por T6) y se sacaron las menciones a "línea punteada" que quedaron sin sentido.
- **Verificado:** los **6 bloques Mermaid renderizan con `mermaid-cli` extraídos de las notas** (no de un borrador aparte) y todos los enlaces `[[ ]]` de las seis resuelven a archivos existentes. Actualizados [[MOC — Modelo de dominio]] (columna *Dibujado* y descripción) y [[Estado del proyecto]] (checklist marcado).
- **Commits:** 3a230dc (Viaje, Oportunidad, Pago) + _(el de los otros 3, por completar al cerrar)_.
- **Pendiente:** **ratificar en la sync** los 6 diagramas y, en especial, el nuevo A4 de [[CU-27 Cancelar viaje]]; los dos cambios de modelo del 21/09 (`Cotización.vencida` + `validez_hasta`, `ContenidoRed.descartado`); los **defaults sin validar con la agencia** (1 mes de vigencia de cotización, 7 días de anticipación de la alerta `salida`, enum `forma_pago`); decidir el **recargo por mora**; y ajustar la fila **T8** de [[EST-ContenidoRed]] (dice que reprogramar aplica a *cualquier* estado, pero sobre `publicado` y `descartado` no tiene sentido — el diagrama la dibuja solo sobre las tres columnas activas).

## 21/09/26 — Nahuel (Claude Opus 5) — especificación de diagramas de estado
- **Hecho:** Se armaron **6 especificaciones de estados** en `03-Dominio/Diagramas/Estados/`, una nota por clase: [[EST-Viaje]], [[EST-Oportunidad]], [[EST-Pago]], [[EST-Cotización]], [[EST-Alerta]] y [[EST-ContenidoRed]]. Alcance acordado con Nahuel: las **6 clases con máquina de estados real**, no las 3 del checklist ni las 8 que tienen atributo `estado` ([[Hotel]] y [[Reseña]] quedan afuera por ser bajas lógicas de dos estados; [[Destino]], [[Operador]] y [[RequisitoDestino]] usan un `activo` booleano). **No se dibujó ningún diagrama**: el pedido era dejar solo la especificación para que otra sesión, con contexto limpio, únicamente tenga que dibujar. Por eso cada nota es **autosuficiente** y arranca con un bloque *"Para la sesión que dibuje este diagrama"* (qué motor usar, el encabezado ELK listo para copiar, dónde pegar el bloque, cómo etiquetar las transiciones y la instrucción de no resolver los huecos). El cuerpo lleva: tabla de **estados** (significado, cómo se entra, si es terminal), estado inicial y finales, tabla de **transiciones** (origen → destino, evento disparador, actor, CU, guarda y efectos colaterales), **invariantes** y **huecos detectados**. Se sumó el código **`EST`** a [[PL-Diagrama Mermaid]].
- **Hecho (cont.):** Se detectaron **25 huecos**, todos señalados y **ninguno resuelto** (orden de autoridad de `CLAUDE.md`). 🚨 El más grave: [[CU-14 Ver y atender alertas del día]] paso 2 lista las alertas *"vigentes (`pendiente` y `vencida`)"*, pero el enum `EstadoAlerta` es `pendiente · vista · resuelta` — **`vencida` no existe**. Hay que decidir si se suma al enum (como se hizo con [[Pago]] el 18/09) o si era solo un filtro de la vista mal redactado, porque **cambia la cantidad de estados del diagrama**; quedó avisado al principio de [[EST-Alerta]] para que la sesión que dibuje no lo pase por alto. El más sistemático es el de [[EST-Pago]]: [[CU-11 Definir plan de cuotas|CU-11]] A4 y [[CU-27 Cancelar viaje|CU-27]] solo anulan pagos **`pendientes`**, así que una cuota **`vencida`** de un viaje cancelado **quedaría exigible para siempre**; son 4 huecos con la misma raíz (los CU tratan `vencido` como si no existiera) y conviene resolverlos juntos. Otros para la sync: si `Viaje` puede pasar de `vendido` a `en curso` salteando `confirmado`; si `cancelado` es terminal de verdad (CU-08 dice que sí, CU-27 A3 lo contradice); en qué estado queda una [[Cotización]] al generarse una versión nueva; y que [[ContenidoRed]] no tiene forma de descartar una pieza sin borrarla físicamente, lo que rompe el criterio de baja lógica del resto del vault. Actualizados [[MOC — Modelo de dominio]] (tabla índice de los 6) y [[Estado del proyecto]].
- **Hecho (cont. 2):** **Nahuel resolvió los 25 huecos en la misma sesión** y se propagaron a las notas fuente, los diagramas y los CU. **Dos cambian el modelo:** las [[Cotización|Cotizaciones]] **vencen** (nuevo estado `vencida` + atributo `validez_hasta`, default **1 mes** configurable ⚠️ sin validar con la agencia; nuevo A5 en [[CU-06 Emitir cotización]]) y [[ContenidoRed]] gana **`descartado`** como baja lógica (A4/A5 en [[CU-19 Planificar contenido en redes]]), porque antes la única salida era el borrado físico, que rompía el criterio del resto del vault. La resolución más importante es una sola regla: **🔑 `Pago.vencido` es "`pendiente` con la fecha pasada"**, así que donde los CU decían `pendiente` ahora se lee `pendiente` o `vencido` — cierra los 4 huecos que dejaban una cuota vencida de un viaje cancelado exigible para siempre ([[CU-11 Definir plan de cuotas]] A3/A4, [[CU-27 Cancelar viaje]] paso 4 y A3). El resto se resolvió sin tocar el modelo: [[Alerta]] **no** suma `vencida` (se corrigió [[CU-14 Ver y atender alertas del día]]), `vista → resuelta` y `vista → pendiente` confirmadas, la reapertura de alertas vale para cualquier `tipo`; [[Viaje]] con **secuencia estricta** (no se saltea `confirmado`) y correcciones manuales solo sobre transiciones manuales; [[Oportunidad]] con `nueva → cotizada` permitido, reactivación a `en_gestión` y `ganada` **terminal** aunque el viaje se cancele (para que el embudo histórico no cambie retroactivamente); [[Cotización]] deja las versiones viejas en `enviada` y no permite aceptar un `borrador`. Se propagó a [[DGM — Diagrama de clases]] y [[DGM-ER]] (enums y `validez_hasta`), a las notas de [[Cotización]] y [[ContenidoRed]], y a 5 CU. Los 5 bloques Mermaid se revalidaron renderizando. **Queda una idea abierta:** Nahuel propuso un **recargo por mora** al vencer una cuota; **no se modeló** a pedido suyo, hay que confirmarlo con el equipo y la agencia.
- **Commits:** 60f56ef, 961f97c.
- **Pendiente:** **dibujar los 6 diagramas** (sesión aparte, con contexto limpio: alcanza con abrir la nota `EST-*` correspondiente); ratificar en la sync las 25 resoluciones, en especial los dos cambios de modelo y los defaults sin validar (1 mes de vigencia de cotización); decidir el **recargo por mora**.

## 21/09/26 — Nahuel (Claude Opus 5) — diagrama de clases
- **Hecho:** Se armó el **diagrama de clases definitivo** en una nota propia, [[DGM — Diagrama de clases]] (simétrica a [[DGM-ER]]). Antes de empezar se acordaron cuatro convenciones con Nahuel: **(1)** nivel de dominio — solo atributos, **sin métodos** (no se inventan operaciones que ningún CU respalda); **(2)** los **FK no se listan como atributos**, la asociación ya expresa la relación y el rol va como etiqueta (`responsable`, `vendedor`, `asesor asignado`) — los `*_id` siguen siendo cosa del [[DGM-ER]]; **(3)** **todas** las enumeraciones como clases `<<enumeration>>`; **(4)** nota propia en `03-Dominio/Diagramas/`, con [[MOC — Modelo de dominio]] reducido a puntero (el borrador embebido se movió, no se duplicó). El resultado son **4 bloques Mermaid**: la vista principal (13 entidades + la clase asociativa **`ViajeHotel`**, 24 asociaciones con multiplicidades en ambos extremos) y **3 bandas de enumeraciones** agrupadas por módulo, con las 18 enums ligadas a su clase dueña por dependencias punteadas. Se probó `direction LR` y `TB` y se midieron los viewBox: el layout final usa `TB` en los 4 bloques (la vista principal queda 2428×1970 con `Viaje` al centro; en `LR` el bloque de enums salía 521×4706, ilegible). **Los 4 bloques se verificaron renderizando con `mermaid-cli`** (el validador del MCP de Mermaid falla con `<<enumeration>>` por un bug de su sanitizador HTML, no por el diagrama).
- **Hecho (cont.):** Se documentaron **4 refinamientos de expresión** (rangos de fecha desdoblados en dos `Date`, `Oportunidad.destino` → `destinoConsultado`, `viaje_hotel` promovida a clase asociativa, FK fuera de las cajas) y se **señalaron 4 incoherencias** entre notas y diagramas, sin resolverlas de movida (orden de autoridad de `CLAUDE.md`). **En la misma sesión Nahuel resolvió 3:** `Viaje`–`Pago` queda en **`1..*`** — su corrección; todo viaje tiene al menos un pago, porque [[CU-07 Confirmar reserva]] es el único CU que crea un `Viaje`, incluye (`<<include>>`) [[CU-10 Registrar economía del viaje|CU-10]] y [[CU-11 Definir plan de cuotas|CU-11]], su postcondición exige el plan cargado y [[CU-11 Definir plan de cuotas|CU-11]] A2 crea un `Pago` `saldo` aun sin cuotas (el hueco es intra-transacción, no un estado del dominio) → **el [[DGM-ER]] debe pasar a `VIAJE ||--|{ PAGO`**; `Viaje`–`Alerta` queda en **`0..1` → `0..*`** → corregir la nota de [[Viaje]]; y `Cotización.items` **no** se promueve a entidad; y el **origen de la `Alerta`** en el ER se modela con **cuatro FK nullable + CHECK** (`viaje_id`, `pago_id`, `oportunidad_id`, `cliente_id`, a lo sumo una cargada), descartando el polimórfico `origen_tipo`+`origen_id` porque pierde la FK. Las 4 se **propagaron** a [[DGM-ER]] (que además quedó sin una línea duplicada `CLIENTE–RESENA`) y a la nota de [[Viaje]]; el ER se revalidó renderizando. **Hallazgo lateral:** al [[DGM-ER]] le faltan 4 relaciones que el diagrama de clases sí tiene y que nunca tuvo — `USUARIO`–`ALERTA` (propietario), `USUARIO`–`CLIENTE` (asesor asignado), `USUARIO`–`OPORTUNIDAD` (responsable) y `DESTINO`–`REQUISITO_DESTINO`; quedan anotadas, no se tocaron. Actualizados [[Estado del proyecto]] y [[MOC — Modelo de dominio]].
- **Commits:** 6faa568.
- **Hecho (cont. 2):** Se **completó el [[DGM-ER]]**: atributos de las **14 tablas** (tipos PostgreSQL, PK/FK/UK, nullable y valores de enum en el comentario), las **4 relaciones que le faltaban** (`USUARIO`–`ALERTA` propietario, `USUARIO`–`CLIENTE` asesor asignado, `USUARIO`–`OPORTUNIDAD` responsable y `DESTINO`–`REQUISITO_DESTINO`) y una sección de convenciones. Se agregó `USUARIO.password_hash` y se dejó **propuesta** (a ratificar) la auditoría `created_by`/`updated_by` sobre las tablas operativas, ambas por [[DEC-0008 Autenticación propia y rol de vendedor freelance]]; `COTIZACION.items` se modela como `jsonb`, coherente con la decisión de no promoverlo a entidad. Además, **los 5 bloques Mermaid pasaron al motor ELK** (`nodePlacementStrategy: BRANDES_KOEPF`) a pedido de Nahuel: las líneas salen **ortogonales** en vez de curvas, que con 24 asociaciones es mucho más legible — mismo criterio que ya usaba [[DGM — Casos de uso]]. Se unificó además la paleta (slate neutro, Segoe UI). Los 5 bloques se revalidaron renderizando.
- **Pendiente:** ratificar en la sync el diagrama de clases, el ER y las 4 resoluciones, junto con el batch del 18/09; cerrar los enums `FormaPago` y `CategoriaViaje`; definir el alcance de las columnas de auditoría; renderizar los PNG cuando los diagramas entren a un entregable.

## 21/09/26 — Nahuel (Claude Sonnet 5)
- **Hecho:** Antes de armar los diagramas de clases y ER definitivos, se resolvió la única pregunta técnica abierta que quedaba en [[DGM-ER]]: la **PK de la tabla intermedia `viaje_hotel`**. Se optó por **`id` propio (UUID)** en vez de PK compuesta `(viaje_id, hotel_id)`, porque un mismo [[Hotel]] puede figurar en **tramos no consecutivos** del mismo [[Viaje]] (ej. Buenos Aires → Bariloche → Buenos Aires con el mismo hotel porteño en ida y vuelta), cada tramo con su propio `vencimiento_pago_proveedor`. Se agregó índice no-único en `(viaje_id, hotel_id)` y unicidad en `(viaje_id, orden)`. Esto resuelve el «a decidir» (ya resuelto) que [[DEC-0003 Relación Viaje–Hotel y Reseña]] había dejado explícitamente abierto ("a refinar en DGM-ER"); se agregó como **addendum** a esa DEC (ya `formalizado`, no se reabre su `fecha_aprobacion`). Propagado a [[Hotel]] y [[CU-09 Armar itinerario de hoteles]] (nuevo flujo alternativo A5). **No se generaron los diagramas de clases/ER definitivos** (pedido explícito: se deja para después).
- **Commits:** d83fcff.
- **Pendiente:** ratificar en sync (junto con el resto del batch del 18/09); armar/renderizar los diagramas de clases y ER definitivos cuando se indique.

## 18/09/26 — Nahuel (Claude Opus 4.8) — entrevista de consistencia (grill)
- **Hecho:** Se corrió una **entrevista de consistencia** (`/grill-me`) sobre toda la fase inicial: se estudiaron los **31 CU**, las **13 entidades**, las 9 DEC y los diagramas, se detectaron las incongruencias y se resolvieron en 4 rondas con Nahuel. Cambios aplicados (todos **borrador a ratificar en la próxima sync**): **(Q1)** embudo del [[CU-21 Ver dashboard y embudo|CU-21]] y [[DEC-0002 Modelar la consulta como Oportunidad|DEC-0002]] alineados a los **5 estados** de [[Oportunidad]] (faltaba `en_gestión`); DEC-0002 queda lista para ratificar (no se selló sin Francisco, su otro decisor). **(Q2)** `presencial` sumado al `canal` de [[Oportunidad]] (CU-04/CU-01). **(Q3)** `pareja` sumado a `segmento` de [[Cliente]] en [[CU-02 Registrar cliente|CU-02]]/[[CU-03 Gestionar ficha del cliente|CU-03]]. **(Q4)** estado **`anulado`** en [[Pago]] (baja lógica; reemplaza "desactivar/eliminar" en [[CU-11 Definir plan de cuotas|CU-11]] A4 y [[CU-27 Cancelar viaje|CU-27]]). **(Q5)** rol **`freelance`** propagado a [[CU-24 Iniciar sesión|CU-24]] y [[CU-25 Gestionar usuarios y roles|CU-25]] y **sumado como actor** al [[DGM — Casos de uso]] (especialización de `Empleado`). **(Q6)** **multimoneda por pago** (un viaje se paga parte ARS / parte USD): el plan se denomina en la moneda de referencia del viaje y al cobrar se cargan `moneda_pago`/`tipo_cambio`/`monto_cobrado` — actualizados [[Pago]], [[CU-11 Definir plan de cuotas|CU-11]] y [[CU-12 Registrar cobro de un pago|CU-12]]. **(Q7)** `forma_pago` capturada al cobrar (CU-12). **(Q8)** anticipación de la alerta `salida` = **configurable, default 7 días** ([[Alerta]], [[CU-07 Confirmar reserva|CU-07]]). **(Q9)** nuevo módulo **Configuración / Catálogos** (CU-13, CU-15, CU-26, CU-31) y [[RequisitoDestino]] confirmada como entidad sin DEC nueva. Además: **[[CU-01 De la consulta a la venta|CU-01]] reescrito** al modelo sellado (actor `empleado`, estados `reservado/vendido/confirmado`, ganancia/margen/comisión, [[Operador]]); **diagrama de clases** ([[MOC — Modelo de dominio]]) y **[[DGM-ER]]** completados con los atributos faltantes (incl. `vencimiento_pago_proveedor`/`pago_proveedor_realizado` en `viaje_hotel`). Se actualizaron [[Estado del proyecto]] y [[MOC — Casos de uso]].
- **Hecho (cont.):** Se **regeneró el entregable** de casos de uso — PNG del [[DGM — Casos de uso]] con el actor `freelance` y el módulo *Configuración/Catálogos* (mermaid-cli ELK), y DOCX recompilado con `build-casos-de-uso.sh`. Se mejoró el **filtro del build** (limpia artefactos de paréntesis al quitar las referencias `DEC-` inline): verificado **0 fugas** y **0 artefactos** en el DOCX final.
- **Commits:** 0e35b15, d987825, f43a09f.
- **Pendiente:** **ratificar en la sync** el batch completo de arriba (nada se selló unilateralmente); seguir con diagramas de actividad/estado, ER final para PostgreSQL y arquitectura.

## 18/09/26 — Nahuel (Claude Opus 4.8 / Sonnet 5)
- **Hecho:** Se sumó el **CU-31 Gestionar operadores** al [[DGM — Casos de uso]] (módulo *Economía y pagos*, actor `admin`, análogo a [[CU-26 Gestionar destinos]]) y se regeneró el PNG del diagrama (mermaid-cli, motor ELK) y el DOCX entregable (31 CU verificados en el `.docx`). Se corrigieron 4 nombres de casos de uso en el diagrama para que todos inicien con verbo y sin detalle de implementación: *Propuesta con IA* → **Generar propuesta con IA**, *Reportes y estadísticas* → **Generar reportes y estadísticas**, *Recordatorios por destino* → **Generar recordatorios por destinos**, *Configurar % comisión* → **Configurar comisión** (se quitó el `%`). Los títulos de los `.md` fuente de cada CU no se modificaron (ya usaban verbo). Se actualizaron [[Estado del proyecto]], [[CONTINUAR — entregable Casos de uso]] y la nota de revisión de [[CU-31 Gestionar operadores|CU-31]] para reflejar el pendiente resuelto.
- **Hecho (cont.):** Se cerraron los enums de [[Pago]]`.forma_pago` y [[Alerta]]`.tipo` (ambos «a decidir» (ya resuelto), borrador a ratificar). Al cerrar `Alerta.tipo` se detectó una **contradicción real**: los CU ya escritos (CU-07, CU-14, CU-15, CU-28) usan un tipo genérico `formulario`, mientras la nota de la entidad (Paloma, 17/09) proponía 6 tipos granulares del relevamiento que duplicaban la categorización que ya hace [[RequisitoDestino]]`.tipo`. Se consultó a Nahuel y se resolvió: mantener `formulario` genérico y sumar **`salida`** (aviso de próxima salida, sin CU que lo generara hasta ahora) — enum final `pago · formulario · salida · insistencia · reseña · manual · recontacto`. Se propagó a [[CU-07 Confirmar reserva]] (genera la alerta `salida` al confirmar, anticipación ⚠️ 7 días sin validar) y [[CU-14 Ver y atender alertas del día]] (lista de tipos actualizada). Para `forma_pago` no había dato del relevamiento: se propuso `efectivo · transferencia · tarjeta_credito · tarjeta_debito · cheque · deposito` como borrador a confirmar con la agencia.
- **Commits:** 0d7d537, 2f9e4ca, 2293d52.
- **Pendiente:** ratificar en sync los enums `forma_pago` y `Alerta.tipo` (incl. anticipación de `salida`, 7 días propuestos) y los 31 CU; avanzar con diagrama de clases, ER, actividad y arquitectura.

## 17/09/26 — Paloma (Claude Opus 4.8)
- **Hecho:** Se procesó la **2ª ronda de relevamiento** (respuestas de la agencia traídas por Francisco). Se registró íntegra en la nueva nota [[Relevamiento — respuestas de la agencia (17-09)]] (fuente de verdad) y se enlazó desde [[Relevamiento — Fuente de verdad]]. Como varias respuestas **contradicen decisiones selladas**, se abrieron dos DEC en `en-revision` (sin formalizar): **[[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]** (supersede a [[DEC-0004 Comisión configurable por porcentaje]]: `ganancia = precioVenta − costo`, margen en $ y %, **comisión del vendedor/freelancer aparte**, **multimoneda ARS/USD**) y **[[DEC-0008 Autenticación propia y rol de vendedor freelance]]** (login **usuario/contraseña individual** + auditoría; nuevo rol **`freelance`** con visibilidad restringida — excepción al *lectura global* de [[DEC-0005 Autenticación y modelo de roles]], que se anotó y amplió). Se actualizaron los CU dependientes con las respuestas concretas: [[CU-21 Ver dashboard y embudo|CU-21]] (KPIs), [[CU-22 Generar reportes y estadísticas|CU-22]] (catálogo de reportes + **Excel principal / PDF resumido**) y [[CU-30 Sugerir recontacto de clientes|CU-30]] (**≈ 6 meses**, recurrentes ≥ 2 viajes, + **segmentación comercial**). Se propagó al dominio (como propuesta atada a las DEC): [[Viaje]] (`moneda`, `costo`, `ganancia`, `margen`, `vendedor`, `comision_vendedor`), [[Usuario]] (rol `freelance` + auth propia), [[Alerta]] (tipos de aviso ampliados + fase 1 manual), [[Cliente]] (`pareja` + segmentación) y [[RN-01 Comisión automática]] (reescrita). Se marcaron las **preguntas a la agencia como respondidas** en [[Estado del proyecto]] y se registró DEC-0004 como "en revisión / probable supersesión".
- **Sync 17/09 (Francisco, Nahuel y Paloma):** se **sellaron** [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]], [[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]] y la nueva **[[DEC-0009 Operador-Proveedor como entidad de catálogo|DEC-0009]]**; **[[DEC-0004 Comisión configurable por porcentaje|DEC-0004]] pasó a `obsoleto`**. Se creó la **13ª entidad [[Operador]]** (FK `operador` en [[Viaje]]). Definiciones: margen % **sobre venta**; comisión del vendedor importe o % (% sobre ganancia, default por vendedor + override); **multimoneda ARS/USD** manual por operación; auth usuario/contraseña + auditoría (`created_by`/`updated_by`); `freelance` ve solo lo suyo; recontacto 6 meses; segmentación por **etiquetas libres**. Se reescribieron [[CU-10 Registrar economía del viaje|CU-10]] y [[CU-13 Configurar porcentaje de comisión|CU-13]] al nuevo modelo, se marcaron como resueltas las revisiones de [[CU-21 Ver dashboard y embudo|CU-21]]/[[CU-22 Generar reportes y estadísticas|CU-22]]/[[CU-30 Sugerir recontacto de clientes|CU-30]], se propagó a [[Pago]] (`moneda`, `forma_pago`) y [[RN-01 Comisión automática]] (`formalizado`), y se sincronizaron [[MOC — Modelo de dominio]] (13 entidades) y [[DGM-ER]]. Se creó el **[[CU-31 Gestionar operadores]]** (ABM de la nueva entidad, actor admin/dueño) y se registró en [[MOC — Casos de uso]] (**31 CU**).
- **Commits:** f86f066 (borradores `en-revision`), 38e8362 (sellado de la sync) + _(CU-31, por completar al cerrar)_.
- **Pendiente:** cerrar el enum `forma_pago` ([[Pago]]) y los valores de `Alerta.tipo` (Nahuel); **sumar [[CU-31 Gestionar operadores|CU-31]] al [[DGM — Casos de uso]] y al entregable** (lo mantiene Nahuel, layout ELK); definir la **consolidación multimoneda** de reportes (fase posterior); formalizar las entidades tocadas ([[Viaje]], [[Usuario]], [[Operador]]) al cerrar el resto de sus atributos.

## 11/09/26 — Nahuel (Claude Opus 4.8)
- **Hecho:** **Rehecho el entregable DOCX de Casos de uso** en dos frentes. (1) **Diagrama** ([[DGM — Casos de uso]]): estaba compacto y con líneas cruzadas; se rehízo con óvalos por caso de uso, color por módulo, **generalización de roles** (`Admin`/`Dueño` *es-un* `Empleado`) y el `Pasajero/Cliente` movido a la derecha como actor externo con asociaciones etiquetadas (*recibe cotización* / *aporta reseña*). Tras comparar dagre vs **ELK**, se adoptó ELK (`mergeEdges` + `considerModelOrder`) por el ruteo ordenado. PNG regenerado en alta resolución e **incrustado** en el DOCX. (2) **DOCX**: estética **académica** (plantilla `reference.docx` migrada de Python a **PowerShell** `make-reference.ps1` — Python no estaba instalado: Cambria justificado, títulos navy con filete, A4 2,5 cm, **paginación** al pie), portada reescrita, y **bug de la imagen resuelto** (`--resource-path`). (3) **Contenido saneado**: el filtro del build ahora recorta toda la cocina interna (secciones `Revisión`/`Diagramas`/`Decisiones asociadas`, `tags::`, referencias `DEC-####` inline, notas meta y `#accion/...`); verificado **0 fugas**. Se reescribió el flujo A2 de [[CU-24 Iniciar sesión|CU-24]] (login con Google) en versión neutral, dejando el pendiente del mecanismo en su sección Revisión. Se instaló **pandoc 3.11**; se actualizaron [[Entregables — índice]], [[CONTINUAR — entregable Casos de uso]] y [[Skills compartidas]] (se agregó Node/mermaid-cli; se eliminó `make-reference.py`).
- **Commits:** e88a05f.
- **Pendiente:** ⚠️ el bloque Mermaid usa `layout: elk`; si Obsidian no lo soporta, la vista previa del vault puede fallar (el render de verdad es el PNG del entregable). Confirmar con la cátedra la **fecha de entrega** y la **comisión**. Ratificar los 30 CU en la próxima sync.

## 11/09/26 — Francisco (Claude Opus 4.8)
- **Hecho:** **Revisión cruzada de los 17 CU de Paloma y Nahuel** buscando inconsistencias de diseño y gaps de modelado. Resultados: (1) Se resolvió la contradicción de **visibilidad** (Paloma asumía Cliente/calendario globales; Nahuel, cartera propia) definiendo el modelo *lectura global + propiedad para organización* en [[DEC-0005 Autenticación y modelo de roles]] (agrega `asesor_asignado` a [[Cliente]], `responsable` a [[Oportunidad]]/[[Viaje]], `propietario` a [[Alerta]]). (2) Se creó la 12ª entidad **[[RequisitoDestino]]** para cerrar el gap de [[CU-15 Configurar recordatorios por destino]] (actor unificado a `admin`). (3) Se documentó la transición automática `Pago pendiente→vencido` en [[Pago]]. (4) Coherencia de [[Reseña]] entre [[CU-17 Registrar reseña de hotel|CU-17]] (nace `publicada`) y [[CU-29 Eliminar reseña|CU-29]] (baja lógica). (5) Interacción economía↔plan de cuotas ([[CU-10 Registrar economía del viaje|CU-10]] A4 / [[CU-11 Definir plan de cuotas|CU-11]] A5). Se actualizó [[MOC — Modelo de dominio]] (12 entidades, FKs de propiedad) y [[Estado del proyecto]]. **Luego se cruzó el relevamiento en crudo:** la mayoría ya estaba cubierta; se definió el **cotizador por scraping como fuera de alcance**, se creó **[[CU-30 Sugerir recontacto de clientes]]** (CRM proactivo acotado, con opt-out), se modeló el **vencimiento de pago a proveedor por hotel** en `viaje_hotel` ([[DEC-0003 Relación Viaje–Hotel y Reseña]]) y se sumó el **% pagado/checklist** a [[CU-12 Registrar cobro de un pago|CU-12]]. Total: **30 CU** (nuevos atributos: `Cliente.no_recontactar`, `Alerta.tipo=recontacto`, `viaje_hotel.vencimiento_pago_proveedor`).
Se **especificaron los CU faltantes de Francisco** (todos a `en-revision`): [[CU-05 Seguir oportunidad|CU-05]], [[CU-06 Emitir cotización|CU-06]], [[CU-07 Confirmar reserva|CU-07]], [[CU-08 Gestionar estado del viaje|CU-08]], [[CU-09 Armar itinerario de hoteles|CU-09]], [[CU-21 Ver dashboard y embudo|CU-21]], [[CU-22 Generar reportes y estadísticas|CU-22]] y [[CU-30 Sugerir recontacto de clientes|CU-30]]; se **validó [[CU-27 Cancelar viaje|CU-27]]** (resueltas las 3 dudas de Nahuel) y se corrigió la visibilidad de [[CU-04 Registrar consulta|CU-04]]. Con esto los **30 CU quedan especificados**. Finalmente se **definieron las decisiones de equipo abiertas** (Francisco, sin esperar la sync): [[CU-29 Eliminar reseña|CU-29]] (actor `admin` + baja lógica; pasa a `en-revision`), baja de [[Hotel]] (física sin historial / `cerrado` con historial), transiciones del [[Viaje]] mixtas ([[CU-08 Gestionar estado del viaje|CU-08]]), motivo de pérdida de lista fija ([[CU-05 Seguir oportunidad|CU-05]]) y viaje nace `confirmado` ([[CU-07 Confirmar reserva|CU-07]]). Ver el desglose en [[Estado del proyecto]].
- **Sync 11/09 (Francisco + Nahuel):** se **sellaron** las DEC-0001, 0003, 0004, 0005, 0006 (`formalizado`; Paloma notificada por Git). Definiciones adicionales: **baja de [[Hotel]] siempre lógica** (`cerrado`, nunca física); nuevo ciclo del [[Viaje]] `reservado → vendido → confirmado → en curso → finalizado` (`vendido`=seña, `confirmado`=total pagado); estado `en_gestión` en [[Oportunidad]]; se amplió [[RequisitoDestino]] (`tipo`, `obligatorio`, `descripcion`); `Oportunidad.destino` texto libre normalizado al derivar en [[Viaje]].
- **Commits:** a26625d, c8aac09, 67bf721, c586eb9, c47408f (pusheados); dad2dc8, 0fd7965 y los de la sync _(por pushear al cerrar)_.
- **Roles:** se acordó que **los tres toman los tres roles** (todos en todo); Francisco referente/mantenedor del vault.
- **Pendiente:** **Preguntas para la agencia — las lleva Francisco a Valentina:** comisión vs. margen (puede reabrir DEC-0004), KPIs del dashboard, catálogo de reportes, criterio del CRM y WhatsApp API. Técnicos: mecanismo de autenticación e infraestructura.

## 10/09/26 — Paloma (Claude Opus 4.8)
- **Hecho:** Primera sesión de Paloma. Se configuró su identidad Git (`palomap2003`) y se completó su fila en *Quién es quién*. Especificó sus **8 casos de uso** (todos a `en-revision`): [[CU-02 Registrar cliente|CU-02]] y [[CU-03 Gestionar ficha del cliente|CU-03]] (Clientes); [[CU-16 Gestionar hotel en catálogo|CU-16]], [[CU-17 Registrar reseña de hotel|CU-17]] y [[CU-18 Buscar y recomendar hoteles|CU-18]] (Hoteles); [[CU-19 Planificar contenido en redes|CU-19]] y [[CU-20 Generar propuesta de contenido con IA|CU-20]] (Redes); [[CU-23 Ver calendario de viajes y vencimientos|CU-23]] (Calendario). Ajustes de dominio: [[Hotel]] suma `precio_referencia`, `servicios` y `estado` (activo/cerrado, a ratificar), sincronizado en [[MOC — Modelo de dominio]]; [[ContenidoRed]] fija canales (Instagram · TikTok · WhatsApp ventas) y libera el rol.
- **Commits:** 4d8bb94, 662b582, e6e95e3, 617b5ad, b63c02e.
- **Pendiente:** ratificar en la sync la **visibilidad global** (Cliente, Hotel, calendario) en [[DEC-0005 Autenticación y modelo de roles]]; el atributo `estado` y la política de baja de [[Hotel]]; asignar el rol *Guardián del dominio*. Especificar los CU de Francisco y Nahuel (siguen en `borrador`).

## 10/09/26 — Francisco (Claude Opus 4.8)
- **Hecho:** Se resolvieron tres decisiones de dominio ([[DEC-0003 Relación Viaje–Hotel y Reseña]], [[DEC-0004 Comisión configurable por porcentaje]], [[DEC-0005 Autenticación y modelo de roles]]) y se reconcilió [[Actores]] con los nuevos roles. Se definió el **catálogo completo de casos de uso** (24 CU + núcleo [[CU-01 De la consulta a la venta|CU-01]]) con [[DGM — Casos de uso|diagrama]] y división entre los tres. Se creó el flujo **md-fuente / docx-derivado** ([[Especificación de casos de uso — flujo]]) y la sección [[Entregables — índice]]; se registró **pandoc** en [[Skills compartidas]] y se agregaron punteros en [[CLAUDE|CLAUDE.md]] y el Home. Se instauró esta **bitácora de sesiones** como dinámica de cierre. Se especificó [[CU-04 Registrar consulta]] como ejemplo de referencia y se dejó de versionar `.obsidian/graph.json`. Se amplió el **checklist de PC1** con el set completo de entregables UML (obligatorios vs recomendados), fijando que los diagramas van en Mermaid y el prototipo UI en Figma (MCP). Se agregó la **identidad por sesión**: cada sesión se reconoce por la identidad Git y se registra a nombre de quien la corre (mapa "Quién es quién").
- **Commits:** 20f3cc8, 1bea1f9, f17a0dd, a1dbcf5, 7c6e5fe.
- **Pendiente:** ratificar DEC-0003/0004/0005 y formalizar [[DEC-0001 Stack tecnológico]] en la sync; especificar los CU restantes (en `borrador`); definir mecanismo de autenticación e infraestructura; instalar pandoc al compilar el primer entregable.
