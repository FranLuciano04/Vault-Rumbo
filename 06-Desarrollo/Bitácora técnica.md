---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 09/09/26
---
# Bitácora técnica

tags:: #tipo/referencia

> Registro **append-only** de la fase de desarrollo (PC2+). Entradas fechadas por autor; no se reescribe lo anterior. Vincula avances de código con decisiones del vault.

## Formato de entrada
```
### dd/mm/aa — <Autor>
- <Qué se hizo> (rama `feature/...`, commit `<hash>`)
- Decisiones tocadas: [[DEC-####]]
```

---

### 12/10/26 — Nahuel
- Se definió el proceso de implementación: [[Flujo de implementación]], con skills, subagentes y `06-Desarrollo/herramientas/tickets.mjs` (semáforo y grafo). Todavía no hay código: el próximo paso es la spec y el plan con los tickets. Desde ahora, una entrada por módulo cerrado.
- Decisiones tocadas: [[DEC-0014 Flujo de implementación con agentes]], [[DEC-0001 Stack tecnológico]] (estructura en `src/`).

### 23/10/26 — Nahuel (con el equipo) — M0 Fundaciones cerrado (`mod-0`)
- **Qué quedó:**
  - Backend FastAPI con PostgreSQL, sesión async, modelos del ER y migración inicial desde `rumbo.sql`.
  - Errores problem+json.
  - Autenticación con Firebase: verificación del token y `GET /api/auth/yo` con el rol.
  - Visibilidad por fila según el rol y auditoría `created_by`/`updated_by`.
  - Cliente de IA con modelo falso y CLI de datos iniciales.
  - Contrato y tipos compartidos en `@rumbo/shared`.
  - Shells web y mobile con inicio de sesión por email o Google.
  - CI con filtros por carpeta, análisis de seguridad y auditoría semanal.
  - Compose de desarrollo, de e2e y de producción local; e2e del login web.
- **Tickets:** 38, de T-001 a T-025 más los de hallazgos (T-140 a T-145, T-150, T-152, T-154, T-162) y los de la review de Codex (T-158, T-159, T-160). Detalle y merges en [[M0 — pedido de review]].
- **Review de Codex** ([[M0 — review Codex]]): 3 hallazgos, todos confirmados en el triage.
  - H-01 → T-158 (PR #51): la config de Firebase de mobile no llegaba al bundle de Expo porque se leía con un alias de `process.env`.
  - H-02 → [[DEC-0018 Revocación de sesiones de Firebase|DEC-0018]] y T-159 (PR #53): se acepta la ventana de 1 h sin `check_revoked`, y un test impide activarlo sin una decisión nueva.
  - H-03 → T-160 (PR #55): el CI corre mobile cuando cambia `shared`.
- **Pendientes que no bloquean:**
  - probar el inicio de sesión en el development build con un `.env` real;
  - si se edita `openapi.json` a mano sin tocar el backend, no corre el job `backend` (menor de T-160);
  - el `PermissionError` de `tmp_path` de pytest en la PC de Nahuel.
- **Decisiones tocadas:** [[DEC-0001 Stack tecnológico]], [[DEC-0005 Autenticación y modelo de roles]], [[DEC-0008 Autenticación propia y rol de vendedor freelance]], [[DEC-0011 Infraestructura de despliegue on-premise]], [[DEC-0012 Modelo de IA del producto]], [[DEC-0013 Datos que faltaban en el ER]], [[DEC-0014 Flujo de implementación con agentes]], [[DEC-0015 Decisiones de implementación]], [[DEC-0016 Autenticación con Firebase]], [[DEC-0018 Revocación de sesiones de Firebase]].
- Aprobación del equipo: 23/10/26. Tag `mod-0` sobre `d57e8f2`.

### 26/10/26 — Nahuel (con el equipo) — M1 Usuarios y configuración cerrado (`mod-1`)
- **Qué quedó:**
  - Alta de `Usuario` con su cuenta de Firebase. Una cuenta de Firebase sin `Usuario` se borra y se crea de nuevo (T-153), y el alta toma un lock por email.
  - Cambio de rol y baja lógica. La agencia nunca queda sin un admin activo (CU-25 A4) ni sin una dueña activa (A5), y solo una dueña toca a otra.
  - Parámetros del negocio y comisión por defecto de cada vendedor.
  - Catálogo de destinos con sus requisitos y catálogo de operadores, con nombre único sin distinguir mayúsculas, tildes ni espacios, y baja lógica.
  - Errores de PostgreSQL traducidos a 409/422 problem+json (T-151).
  - Contrato en `@rumbo/shared`, con mocks que responden como el backend.
  - Pantalla de Configuración en la web y e2e de punta a punta.
- **Tickets:** 19, de T-026 a T-038 más T-146, T-147, T-148, T-151, T-153 y T-163. Detalle y merges en [[M1 — pedido de review]].
- **Review de Codex** ([[M1 — review Codex]]): 3 hallazgos, todos confirmados en el triage y arreglados sin ticket ([[DEC-0019 Las fallas se arreglan al encontrarlas|DEC-0019]]).
  - H-01, bloqueante → PR #93: al cambiar de destino en la web seguían abiertas la baja o la edición del requisito del destino anterior. Se arregló con `key` en `RequisitosDestino`.
  - H-02, importante → PR #93 (filtro por destino) y PR #95: los mocks de M1 solo cubrían el camino feliz. Ahora filtran, paginan y responden 409/422 con `errores` por campo. Además, `normalizarTexto` y `pagina` quedan en `mocks/utilidades.ts` y la validación en `mocks/validacion.ts`.
  - H-03, importante → PR #100, de riesgo alto y aprobado por otro integrante: 8 tests con dos transacciones simultáneas para el último admin y la última dueña, que fallan si se quita el `FOR UPDATE`.
- **Pendientes que no bloquean:**
  - Fidelidad de los mocks, anotada en el PR #95: falta el 422 de `pagina` y `por_pagina` y el 404 de los requisitos de un destino inexistente; `normalizarTexto` saca todas las marcas diacríticas, incluida la ñ, y el backend solo las tildes; y no se copiaron los mensajes exactos de Pydantic.
  - El actor se carga antes de bloquear, así que una dueña a la que demueven en paralelo completa su acción con el rol viejo. En A5 el resultado final es correcto.
  - Con el timeout por defecto, la suite web falla al azar por timeouts cuando la máquina está cargada, y pasa con `--testTimeout=30000`. Dos sesiones que corren el backend sobre la misma base de tests pueden pisarse.
- **Decisiones tocadas:** [[DEC-0004 Comisión configurable por porcentaje]], [[DEC-0005 Autenticación y modelo de roles]], [[DEC-0006 Destino como entidad de catálogo]], [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]], [[DEC-0008 Autenticación propia y rol de vendedor freelance]], [[DEC-0009 Operador-Proveedor como entidad de catálogo]], [[DEC-0013 Datos que faltaban en el ER]], [[DEC-0016 Autenticación con Firebase]], [[DEC-0019 Las fallas se arreglan al encontrarlas]].
- Aprobación del equipo: 26/10/26. Tag `mod-1` sobre `1024133`.

### 27/10/26 — Nahuel (con el equipo) — M3 Alertas cerrado (`mod-3`)
- **Qué quedó:**
  - Servicio de alertas para los demás módulos: `crear`, `resolver_de_origen` y `reabrir_de_origen`. Lo manual no se cierra solo, y las alertas resueltas por la cancelación de un viaje quedan marcadas.
  - Agenda según el rol: cada uno ve lo suyo, y admin y dueño ven toda la agencia y filtran por responsable. Atender alertas (vista, resolver con «Deshacer», posponer) con el progreso del día, que usa el día de Argentina.
  - Recordatorios manuales asociados a un cliente, una oportunidad o un viaje que el actor ve, y su edición, que solo hace el propietario (enmienda de [[DEC-0005 Autenticación y modelo de roles|DEC-0005]] del 25/10/26).
  - Contrato en `@rumbo/shared`, con mocks que responden según el rol.
  - Agenda web con totales, panel de detalle y alta de recordatorio; agenda mobile con chips, detalle con posponer y alta con selector de calendario nativo; e2e de punta a punta y semilla de demo.
- **Tickets:** 14, de T-050 a T-060 más T-164, T-165 y T-166. Detalle y merges en [[M3 — pedido de review]].
- **Review de Codex** ([[M3 — review Codex]]): 4 hallazgos, todos confirmados en el triage y arreglados sin ticket ([[DEC-0019 Las fallas se arreglan al encontrarlas|DEC-0019]]).
  - H-01, bloqueante → PR #104: con «Mostrar vistas», la agenda web no paginaba las vistas, así que las que pasaban de 100 no se podían abrir ni resolver. Sin cambiar el contrato, ahora se piden con la misma página que las pendientes y la última página es la mayor de las dos.
  - H-02, importante → PR #105: al cambiar de filtro durante el «Deshacer», `useTotalesAgenda` descontaba alertas fuera del filtro y podía mostrar −1 (web y mobile).
  - H-03, importante → PR #106: la semilla de demo podía asociar a la freelance un cliente que ella no ve. La semilla replica RF-151 sin importar de `negocio`.
  - H-04, importante → PR #107: los mocks de alertas no respetaban los permisos por rol. Ahora existe `manejadoresAlertasPara(rol)`, y `usuariosPorRol`, `RolMock` y `manejadorYo` pasaron a `mocks/usuarios.ts`.
- **Pendientes que no bloquean:**
  - Prueba manual guiada en mobile: reconstruir el dev client (`expo run:android`) por el selector de calendario de T-059, probar VoiceOver/TalkBack en los chips (T-165) y el selector en un iPhone.
  - Las bases donde corrió la semilla vieja conservan el recordatorio de demo con el cliente ajeno.
  - `crear` no deduplica alertas: la idempotencia del proceso diario queda para M7 (T-110).
- **Decisiones tocadas:** [[DEC-0005 Autenticación y modelo de roles]], [[DEC-0008 Autenticación propia y rol de vendedor freelance]], [[DEC-0013 Datos que faltaban en el ER]], [[DEC-0019 Las fallas se arreglan al encontrarlas]].
- Aprobación del equipo: 27/10/26. Tag `mod-3` sobre `3d2e2a9`. M2 todavía no tiene su tag `mod-2`.

### 27/10/26 — Nahuel (con el equipo) — M2 Clientes cerrado (`mod-2`)
- **Qué quedó:**
  - Alta de clientes con aviso de posible duplicado por contacto o nombre, que se confirma explícitamente. El contacto se compara por su clave canónica (`contacto_clave`, migración 0005): un teléfono argentino en cualquier formato o un email sin distinguir mayúsculas. El `freelance` recibe el aviso sin datos de clientes ajenos (RF-151).
  - La edición de la ficha avisa igual que el alta, pero solo por lo que cambia y sin contar la propia ficha. Se agregó el flujo A4 a [[CU-03 Gestionar ficha del cliente]].
  - Altas y ediciones simultáneas con los mismos datos se serializan con un advisory lock, así que ninguna se saltea el aviso.
  - Búsqueda según la visibilidad del rol, historial del cliente, usuario de Instagram ([[DEC-0017 Contacto mínimo del cliente|DEC-0017]]) y listado con asesor, último viaje y oportunidades abiertas.
  - Contrato en `@rumbo/shared` con mocks que validan con zod y responden 409/422 como la API. Pantallas web (listado, alta y ficha editable), mobile (listado y alta) y e2e de punta a punta.
- **Tickets:** 15, de T-039 a T-049 más T-149, T-155, T-156 y T-157. Detalle y merges en [[M2 — pedido de review]].
- **Review de Codex** ([[M2 — review Codex]]): 7 hallazgos, todos confirmados en el triage y arreglados sin ticket ([[DEC-0019 Las fallas se arreglan al encontrarlas|DEC-0019]]).
  - H-01, bloqueante → PR #96: si la ficha se refrescaba durante la edición, el PATCH reenviaba campos que nadie había editado.
  - H-02, bloqueante; H-03, H-05 y H-07, importantes → PR #97:
    - La API aceptaba un contacto que no era teléfono ni email.
    - Un teléfono escrito en otro formato evitaba el aviso de duplicado.
    - Dos altas simultáneas podían crear el duplicado sin aviso.
    - Los mocks aceptaban entradas que la API rechaza.
  - H-04, importante → PR #108, de riesgo alto y aprobado por palomap2003: editar el nombre o el contacto no controlaba duplicados. El 26/10 quedó para decidir con el equipo, que el 27/10 resolvió arreglarlo antes del cierre.
  - H-06, importante → PR #99: con la caché poblada, el listado mobile podía mostrarse vacío.
- **Pendientes que no bloquean:**
  - El backend antepone «Value error, » a los mensajes de validación 422 (convención previa, también en otros módulos).
  - `05-Diseño/Datos/rumbo.sql` no tiene `contacto_clave` ni `instagram`; `test_modelos` los lista aparte.
  - Dos sesiones que corren pytest sobre la misma base `rumbo_test` se pisan: conviene una base propia por sesión (`TEST_DATABASE_URL`).
- **Decisiones tocadas:** [[DEC-0017 Contacto mínimo del cliente]], [[DEC-0019 Las fallas se arreglan al encontrarlas]], [[DEC-0020 Cliente traído por dos asesores]].
- Aprobación del equipo: 27/10/26. Tag `mod-2` sobre `c5d8c9c`.

### 28/10/26 — Nahuel (con el equipo) — M4 Oportunidades y cotizaciones cerrado (`mod-4`)
- **Qué quedó:**
  - Alta de una consulta como `Oportunidad`, con aviso si el `Cliente` ya tiene una abierta. Destino y pasajeros son opcionales ([[DEC-0023 Datos mínimos de la consulta|DEC-0023]], migración `0007`), y cotizar sin ellos da 409.
  - Embudo según el rol, con filtro por responsable para admin y dueño. Máquina de estados de la oportunidad (nueva → en gestión → cotizada → ganada | perdida, con reactivar) y bloqueo `FOR UPDATE` en cada transición. Una oportunidad cerrada es de solo lectura: el `PATCH` da 409.
  - Insistencias de seguimiento que crean `Alerta` con el servicio de M3. El detalle muestra las pendientes, las vistas y las resueltas, con «Ver más» por estado.
  - `Cotización` versionada con su vigencia, respuesta del cliente y PDF con WeasyPrint. Solo se acepta la versión vigente, una sola por oportunidad, y aceptar deja la oportunidad `cotizada`.
  - Contrato en `@rumbo/shared`, pantallas web (nueva consulta, embudo, detalle, emisión y respuesta de cotizaciones) y e2e del embudo con cotización.
- **Tickets:** 16, de T-061 a T-074 más T-167 y T-168. Detalle y merges en [[M4 — pedido de review]].
- **Review de Codex** ([[M4 — review Codex]]): 6 hallazgos, todos confirmados en el triage y arreglados sin ticket ([[DEC-0019 Las fallas se arreglan al encontrarlas|DEC-0019]]).
  - H-01 y H-02, bloqueantes → PR #135, de riesgo alto y aprobado por Paloma: se podían aceptar varias versiones de la misma oportunidad, y aceptar después de reactivar la dejaba `en_gestion`. Ahora `aceptar` exige la versión vigente sin otra aceptada, leída con la oportunidad bloqueada, y pasa la oportunidad a `cotizada`.
  - H-03, bloqueante, y H-04, importante → PR #136, de riesgo alto y aprobado por Paloma: el `PATCH` modificaba oportunidades cerradas (ahora 409), y `GET /cotizaciones/{id}` respondía 501 (ahora resuelve la visibilidad por su oportunidad). Resuelve el punto abierto de T-168 sobre editar una oportunidad cerrada.
  - H-05 y H-06, importantes → PR #137: el detalle no mostraba las insistencias vistas y se cortaba en la primera página.
- **Pendientes que no bloquean** (anotados en el PR #137):
  - No hay estado de carga al abrir el detalle de la oportunidad.
  - Faltan tests de dónde van las vistas en el orden, de un «Ver más» por estado, de que una insistencia recién agendada aparezca en la lista y del aviso «No pudimos cargar más.».
  - Hay avisos de Prettier previos en `AccionesOportunidad.tsx` y `RespuestaCotizacion.test.tsx`.
- **Decisiones tocadas:** [[DEC-0002 Modelar la consulta como Oportunidad]], [[DEC-0005 Autenticación y modelo de roles]], [[DEC-0013 Datos que faltaban en el ER]], [[DEC-0019 Las fallas se arreglan al encontrarlas]], [[DEC-0020 Cliente traído por dos asesores]], [[DEC-0023 Datos mínimos de la consulta]].
- Aprobación del equipo: 28/10/26. Tag `mod-4` sobre `c0ed646`.

### 29/10/26 — Nahuel (con el equipo) — M5 Hoteles y reseñas cerrado (`mod-5`)
- **Qué quedó:**
  - Catálogo de `Hotel`: alta con solo nombre y destino, edición, baja lógica y duplicado por destino y nombre normalizado (migración `0006`, índice único parcial). Editar y dar de baja bloquean la fila (`FOR NO KEY UPDATE`).
  - Búsqueda ordenada por puntaje, que solo pondera las reseñas publicadas.
  - `Reseña` de un `Cliente`, con `Viaje` opcional ([[DEC-0003 Relación Viaje–Hotel y Reseña|DEC-0003]]). Moderación: ocultar con motivo, restaurar y eliminación física solo de una oculta (CU-29 A2), que queda en el log.
  - Primera configuración de logging del backend: `rumbo.core.logs.configurar_logs()`, que deja el logger `rumbo` en INFO por stderr con los campos `extra`.
  - Contrato en `@rumbo/shared`, pantallas web (catálogo, alta y edición, detalle con reseñas, registrar reseña, moderación), recomendación de hoteles al cotizar y e2e del catálogo.
- **Tickets:** 11, de T-075 a T-085. Detalle y merges en [[M5 — pedido de review]].
- **Review de Codex** ([[M5 — review Codex]]): 6 hallazgos, todos confirmados en el triage.
  - H-01, bloqueante → PR #140, de riesgo alto: un precio de referencia en ARS se emitía como USD si se cambiaba la moneda después de agregar el hotel. Se mergeó sin la aprobación de otro integrante registrada en GitHub; el equipo aceptó el cierre así.
  - H-02, bloqueante → PR #141: la línea de la eliminación física se descartaba porque no había configuración de logging.
  - H-03 y H-06, importantes → PR #142: la lista de reseñas quedaba en una página fuera de rango después de moderar, y el mock dejaba borrar una publicada.
  - H-05, importante → PR #143: una edición en carrera con un cambio de destino daba 500 en lugar de 409.
  - H-04, importante, pasó a [[T-091 Listar los viajes con su situación económica|T-091]]: `GET /viajes` es un stub, así que `SelectorViaje` no carga viajes contra la API real. T-091 suma el filtro `cliente_id` y la verificación de CU-17 A1.
- **Pendientes que no bloquean** (anotados en los PR):
  - La protección de moneda vive en el `onChange` del radio y no en el esquema (#140).
  - La línea del log sale después del `flush`, no del commit (#141).
  - Puede haber un parpadeo de un frame al ajustar la página, y `DetalleHotel` no vuelve a la página 1 al cambiar de hotel (#142).
  - `test_oportunidades_concurrencia.py` espera bloqueos de todo el servidor, no solo de su base; hay varias copias de `obtener_para_modificar` que se podrían subir a `RepositorioBase` (#143).
  - Sigue abierto el `#accion/decidir` de CU-29 sobre una tabla de auditoría.
- **Decisiones tocadas:** [[DEC-0003 Relación Viaje–Hotel y Reseña]], [[DEC-0005 Autenticación y modelo de roles]], [[DEC-0019 Las fallas se arreglan al encontrarlas]], [[DEC-0022 Suite completa solo en el CI]].
- Aprobación del equipo: 29/10/26 (Nahuel, en nombre del equipo). Tag `mod-5` sobre `fbedf55`.

### 02/11/26 — Nahuel (con el equipo) — M6 Viajes y economía cerrado (`mod-6`)
- **Qué quedó:**
  - Confirmar la reserva desde una `Oportunidad` con su `Cotización` aceptada: crea el `Viaje`, sus alertas por requisito del destino y la de salida, y deja la oportunidad ganada (CU-07).
  - Máquinas de estados del `Viaje` (`reservado → vendido → confirmado → en_curso → finalizado`, `cancelado` con su reversión, correcciones T7) y del `Pago`.
  - Economía del viaje: costo, operador, vendedor, ganancia y margen generados en la base, comisión (RN-01, [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]]). Migración `0008`.
  - Plan de pagos: definir, rebalancear, reprogramar, dividir y anular; cobro con forma de pago y otra moneda, y su reversión. Itinerario de hoteles con el pago al proveedor por tramo. Cancelación con cobros y su reversión, que solo restaura los pagos que anuló la cancelación (migración `0009`, [[DEC-0025 Pagos anulados por la cancelación|DEC-0025]]).
  - Contrato en `@rumbo/shared`, pantallas web (listado, ficha, economía, plan, cobro, estado, itinerario, cancelación, confirmar reserva), dos e2e (circuito de CU-01 y excepciones del viaje) y semilla de viajes de demo.
- **Tickets:** 24, de T-086 a T-109. Detalle y merges en [[M6 — pedido de review]].
- **Review de Codex** ([[M6 — review Codex]]): 5 hallazgos, todos confirmados y arreglados.
  - H-01, bloqueante → PR #170: la API multiplicaba siempre por el tipo de cambio; ahora es pesos por dólar en las dos direcciones ([[DEC-0026 Tipo de cambio y deuda nueva en un viaje confirmado|DEC-0026]] punto 1).
  - H-02, bloqueante, y H-04, importante → PR #172: un `confirmado` que vuelve a deber pasa a `vendido` (T11), el rebalanceo y la economía también confirman, iniciar exige el total pagado, corregir un `en_curso` con deuda vuelve a `vendido`, y se puede rebalancear sin pagos nuevos (DEC-0026 puntos 2 a 5).
  - H-03, bloqueante → PR #173: la ficha separa operar (responsable, admin o dueño) de editar la economía (sin el freelance), con la misma regla que la API.
  - H-05, importante → PR #174: `GET /hoteles?nombre=` y el buscador del itinerario consultan a la API.
  - Los cuatro PR de riesgo alto los aprobó y mergeó Paloma. Se verificó `main` con los tres últimos juntos (contrato sincronizado, 486 tests de backend y 208 de viajes en la web).
  - Aparte, PR #171: `pyasn1`, `node-forge` y `follow-redirects` actualizados por vulnerabilidades altas que frenaban el CI.
- **Pendientes que no bloquean:**
  - Ratificar DEC-0026 (en revisión) y redibujar EST-Viaje. Quedan dos puntos abiertos: cómo se cobra la deuda nueva de un `en_curso`, y si corregir un `en_curso` con saldo cero y plan descalzado da `vendido` (hoy) o `confirmado`.
  - La vista previa del cobro y el mock redondean con `toFixed`, no con half-up: en un empate de medio centavo pueden diferir un centavo de la API (#170).
  - Que la búsqueda de hoteles ignore ã, ñ y ç pediría cambiar `CON_TILDE`, la clave de unicidad (RF-099) y su índice (#174).
  - El aviso «El precio de venta cambió…» aparece también al anular un pago sin cambio de precio (sesión de T-109).
- **Decisiones tocadas:** [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]], [[DEC-0013 Datos que faltaban en el ER]], [[DEC-0025 Pagos anulados por la cancelación]], [[DEC-0026 Tipo de cambio y deuda nueva en un viaje confirmado]], [[DEC-0005 Autenticación y modelo de roles]], [[DEC-0008 Autenticación propia y rol de vendedor freelance]], [[DEC-0019 Las fallas se arreglan al encontrarlas]].
- Aprobación del equipo: 02/11/26 (Nahuel, en nombre del equipo). Tag `mod-6` sobre `0979018`.

### 05/11/26 — Nahuel (con el equipo) — M7 Proceso diario y CRM proactivo cerrado (`mod-7`)
- **Qué quedó:**
  - Proceso diario idempotente (`presentacion/jobs/diario.py`), programado en el `scheduler` del Compose a las 00:00 de Argentina.
  - Vencimiento de pagos y cotizaciones (RF-026), sugerencia de avance de viajes (RF-039) y detección de clientes para recontacto (RF-027, RF-028, RF-030).
  - Decisión sobre la sugerencia en backend, web y mobile: crear consulta, no recontactar o posponer (RF-029).
  - E2e del proceso contra el sistema real, con `--fecha`.
- **Tickets:** 9, de T-110 a T-118. Detalle y merges en [[M7 — pedido de review]].
- **Review de Codex** ([[M7 — review Codex]]): 2 hallazgos importantes, los dos confirmados y arreglados.
  - H-01 → PR #191, riesgo alto, aprobado y mergeado por Paloma: el proceso y la API se coordinan con un bloqueo de fila de `Cliente` y `Viaje`, y una operación concurrente ya no deja una sugerencia obsoleta.
  - H-02 → PR #192: `contexto.cliente.recurrente` identifica a los clientes con 2 o más viajes no cancelados, y la sugerencia lo muestra en la web y en la app.
  - El CI de `main` con los dos juntos (`5980a1b`) terminó en verde: Backend y E2e web pasaron; Web y Mobile se saltearon en esa corrida y pasaron en el PR #192.
- **Pendientes que no bloquean:**
  - Ratificar con el equipo que «recurrente» cuenta viajes no cancelados (anotado en [[CU-30 Sugerir recontacto de clientes]]).
  - Reabrir una oportunidad perdida no toma el bloqueo de H-01 ni resuelve las sugerencias abiertas: anotado como menor, sin arreglar.
  - La relectura de candidatos usa un `IN` limitado a 32.767; se acepta porque ese volumen es improbable para una PyME.
  - Las otras copias de `tokenDe` en `e2e/` no se migraron a `apoyo.ts`.

### 06/11/26 — Nahuel (con el equipo) — M8 Calendario, dashboard y reportes cerrado (`mod-8`)
- **Qué quedó:**
  - Calendario consolidado de viajes, vencimientos de pagos y alertas, con filtros (CU-23).
  - Dashboard con el embudo y los indicadores económicos y operativos, por moneda y acotados por rol (CU-21).
  - Reportes del período con comparación entre períodos, y exportación a Excel y PDF (CU-22).
  - Las tres secciones en la web y el e2e `gestion.spec.ts` contra el sistema real. Mobile no cambia.
- **Tickets:** 10, de T-119 a T-128. Detalle y merges en [[M8 — pedido de review]].
- **Review de Codex** ([[M8 — review Codex]]): 3 hallazgos. 2 importantes confirmados y arreglados, y 1 bloqueante descartado.
  - H-01, descartado por Nahuel: la API entrega ganancia y margen a empleado y freelance. La prohibición salió de una frase del pedido de review, sin respaldo en el vault, y `GET /viajes/{id}` ya entrega esos datos. Si el equipo quiere restringirlo, es una regla nueva en una `DEC-` que abarca dashboard y viajes.
  - H-02 → PR #195: los contadores del dashboard llevan a su detalle con los filtros, y Viajes, Oportunidades y Agenda los leen de la URL (RF-128).
  - H-03 → PR #194: Reportes abre en el mes de Buenos Aires, no en el del navegador.
  - El CI de `main` con los dos juntos (`8c9fe00`) terminó en verde. En el PR #195 pasaron los 40 e2e.
- **Pendientes que no bloquean:**
  - Con `?estado=`, el embudo muestra una sola columna y no avisa que está filtrado.
  - Si la URL trae el id de un usuario dado de baja, el listado queda filtrado mientras el selector dice «Responsable: todos».
  - Con un responsable elegido, «Reservas confirmadas» abre las de toda la agencia, porque `/viajes` no filtra por responsable.
  - `FormularioResena.tsx:37` usa la fecha local, igual que H-03. Está fuera de M8.
  - El recorrido de H-02 no se miró en un navegador real: lo cubren tests de componentes.
  - Siguen anotados en [[M8 — pedido de review]] los supuestos a ratificar: las decisiones sobre los indicadores (T-121) y `pendiente_de_pagar` (T-122).
- **Decisiones tocadas:** [[DEC-0005 Autenticación y modelo de roles]], [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]], [[DEC-0008 Autenticación propia y rol de vendedor freelance]], [[DEC-0024 Reglas del dashboard, calendario y criterios de M6]], [[DEC-0019 Las fallas se arreglan al encontrarlas]].
- Aprobación del equipo: 06/11/26 (Nahuel, en nombre del equipo). Tag `mod-8` sobre `7030f4e`.
