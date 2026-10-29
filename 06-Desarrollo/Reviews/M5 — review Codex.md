---
tipo: referencia
estado: formalizado
responsable: Codex
modulo: M5
actualizado: 29/10/26
---
# M5 — review Codex

## Resumen
Se revisaron los 11 diffs de merge indicados y se contrastaron los hallazgos con HEAD (`5fe3ca4`): ninguno de los siguientes está corregido. Se encontraron 2 bloqueantes y 4 importantes; los riesgos principales son emitir una referencia ARS como USD y eliminar reseñas sin el rastro exigido.
La revisión fue estática, con una comprobación puntual de la configuración efectiva de logging; no se ejecutaron las suites ni se reprodujo la carrera con PostgreSQL. Las ubicaciones corresponden al código del merge citado.

## Hallazgos

### H-01 · El precio de referencia cambia de moneda sin revisión
- **Severidad:** bloqueante
- **Ubicación:** `src/apps/web/src/features/oportunidades/cotizaciones/FormularioCotizacion.tsx:66` (merge `e508a2a`)
- **Ticket relacionado:** T-084
- **Trazabilidad:** CU-06 paso 2, CU-18, RF-106; contrato `Hotel.precio_referencia` (ARS por noche).
- **Problema:** `elegirHotel` verifica la moneda solamente al agregar el hotel. Si después se cambia el radio de moneda, el precio autocompletado queda intacto y `enviar` lo manda con la nueva moneda. El test de USD elige esa moneda antes de agregar el hotel, por lo que no cubre el orden inverso.
- **Escenario:** con la moneda inicial ARS, agregar un hotel cuyo precio de referencia es `150000.00` → cambiar a USD → emitir. Se envía `moneda: "USD"` con `precio: "150000.00"`, aunque el usuario nunca cargó un precio en dólares.
- **Arreglo sugerido:** identificar los importes autocompletados desde el catálogo y, al cambiar la moneda, vaciarlos o exigir una revisión explícita antes de emitir. No convertir automáticamente sin un tipo de cambio definido. Cubrir la secuencia agregar en ARS → cambiar a USD → emitir.

### H-02 · La eliminación física no deja un log efectivo
- **Severidad:** bloqueante
- **Ubicación:** `src/backend/rumbo/negocio/servicios/resenas.py:115` (merge `431eac9`)
- **Ticket relacionado:** T-079
- **Trazabilidad:** CU-29 A2 y decisión del 28/10/26 sobre el registro de cada eliminación.
- **Problema:** el único rastro es un `logger.info` con los datos en `extra`, pero el arranque definido en el Dockerfile usa Uvicorn sin configurar un handler ni el nivel del logger de Rumbo. La comprobación con `uvicorn.Config('rumbo.main:app')` devuelve nivel efectivo `WARNING`, `isEnabledFor(INFO) == False` y ningún handler propio: el mensaje se descarta. Además, un formatter de texto estándar no vuelca automáticamente los campos de `extra`. El test fuerza INFO con `caplog.at_level` e inspecciona el registro en memoria, de modo que no detecta esta falta.
- **Escenario:** una admin elimina una reseña oculta con el arranque normal del contenedor → se borra la fila y se devuelve 204, sin un registro de aplicación que conserve actor, motivo y datos de la reseña. El access log del DELETE no contiene esa información.
- **Arreglo sugerido:** configurar nivel, handler y formato que emitan los campos requeridos, y probar la salida efectiva bajo la configuración real de arranque. Vincular el registro de éxito a una eliminación confirmada. No requiere resolver la tabla de auditoría que el CU deja pendiente.

### H-03 · La moderación puede dejar las reseñas en una página inaccesible
- **Severidad:** importante
- **Ubicación:** `src/apps/web/src/features/hoteles/PaginadorResenas.tsx:16` (merge `6df3c07`)
- **Ticket relacionado:** entre T-079 y T-082
- **Trazabilidad:** CU-18 paso 3, CU-29, RF-108, RF-111, RF-112.
- **Problema:** `DetalleHotel` y `ResenasOcultas` conservan la página seleccionada después de invalidar las consultas por una moderación. Cuando el total baja a una sola página, el paginador desaparece sin corregir ese estado.
- **Escenario:** un hotel tiene 21 reseñas publicadas, con 20 por página. La admin navega a la página 2 y oculta su única reseña → la recarga pide todavía página 2, recibe `items: []` y `total: 20`, y desaparece «Anterior». Las otras 20 reseñas quedan inaccesibles desde esa lista hasta recargar o salir y volver. Ocurre también al restaurar la única reseña de la segunda página de ocultas.
- **Arreglo sugerido:** ajustar la página al último número válido cuando cambia el total, tanto en publicadas como en ocultas. Agregar una prueba de moderación que reduzca el número de páginas.

### H-04 · No se puede elegir un viaje con el backend real
- **Severidad:** importante
- **Ubicación:** `src/apps/web/src/features/hoteles/SelectorViaje.tsx:51` (merge `cb2ed9f`)
- **Ticket relacionado:** T-083
- **Trazabilidad:** CU-17 A1, RF-102, DEC-0003.
- **Problema:** el selector depende de `GET /api/viajes`, pero `listar_viajes` en `routers/viajes.py` sigue respondiendo `no_implementado()` (501), también en HEAD. Los mocks permiten probar la selección sin revelar que el flujo integrado no funciona. Las notas de T-083 posponen entrar desde la pantalla de un viaje, pero presentan como resuelta la selección del viaje desde el hotel.
- **Escenario:** existen un cliente y un viaje suyo; el empleado abre Nueva reseña y elige ese cliente → el GET de viajes devuelve 501, aparece «No pudimos cargar los viajes del cliente» y solo queda «Sin viaje». Puede registrar la reseña sin vínculo, pero no completar A1.
- **Arreglo sugerido:** resolver la dependencia del listado mínimo de viajes visibles por cliente y verificar A1 contra la API real antes de dar el flujo por completo; coordinarlo con T-091 de M6 para evitar dos implementaciones divergentes.

### H-05 · Una edición concurrente pierde el 409 de duplicado
- **Severidad:** importante
- **Ubicación:** `src/backend/rumbo/negocio/servicios/hoteles.py:136` (merge `d97a166`)
- **Ticket relacionado:** T-076
- **Trazabilidad:** CU-16 A2, RF-099.
- **Problema:** `editar_hotel` lee la fila sin bloquearla y `_guardar_sin_duplicado` conserva nombre y destino de esa lectura para traducir la violación del índice. Otra edición puede cambiar el destino antes del UPDATE. En ese caso, el índice verifica el destino real, pero el rescate busca el duplicado en el destino anterior y relanza `IntegrityError`, que termina como 500 en lugar de 409 con `existente`.
- **Escenario:** H tiene nombre «Luna» en D1; en D2 ya existe «Sol». La petición A lee H para renombrarlo «Sol» y pasa el chequeo en D1. La petición B mueve H a D2 y confirma. A actualiza solo el nombre → el índice rechaza «Sol» en D2, pero el manejador busca «Sol» en D1 y no lo encuentra → 500 sin ofrecer abrir el hotel existente. Escenario deducido del orden de lecturas y escrituras; no reproducido con dos conexiones.
- **Arreglo sugerido:** bloquear y refrescar H antes de validar su estado, nombre y destino, manteniendo el bloqueo hasta terminar la transacción, como ya hace el repositorio de reseñas. Cubrir esta intercalación con dos sesiones.

### H-06 · El mock permite borrar físicamente una reseña publicada
- **Severidad:** importante
- **Ubicación:** `src/packages/shared/src/mocks/hoteles.ts:379` (merge `a3bba04`)
- **Ticket relacionado:** entre T-075 y T-079
- **Trazabilidad:** CU-29 A2; contrato de `DELETE /resenas/{resena_id}`.
- **Problema:** el handler de DELETE solo comprueba rol y existencia; responde 204 para cualquier reseña existente. T-079 exige que esté oculta y devuelve 409 para una publicada, pero no actualizó este mock. La divergencia persiste en HEAD y permite que las pruebas del consumidor acepten un flujo prohibido por la API real.
- **Escenario:** con `manejadoresHotelesPara("admin")`, borrar el ID de una reseña publicada de `resenasMock` → 204. La misma petición contra el backend → 409 «Solo se elimina una reseña oculta: ocultala primero».
- **Arreglo sugerido:** exigir `estado === "oculta"` en el mock y devolver el mismo error de transición para una publicada. Verificar ambos resultados, 409 para publicada y 204 para oculta.

## Triage de Claude

> Triage del 29/10/26 (Claude, sesión de Nahuel). Cada hallazgo se verificó leyendo el código vigente en `main` (`5fe3ca4`) y la especificación citada. Los seis se confirman. El **alcance** de cada uno es la lista cerrada de comportamientos que el arreglo tiene que fijar con un test; lo que aparezca fuera de esa lista se anota como menor y se consulta.

| Hallazgo | Resultado | Verificación | Rama | PR |
|---|---|---|---|---|
| H-01 | ✅ confirmado (bloqueante) | `FormularioCotizacion.tsx` `elegirHotel` mira `moneda` solo al agregar el hotel; no hay ningún efecto sobre el cambio del radio, y `enviar` manda `datos.moneda` con los precios tal cual. | `fix/M5-moneda-cotizacion` | — |
| H-02 | ✅ confirmado (bloqueante) | No hay `dictConfig`, `basicConfig` ni `--log-config` en `rumbo/`, el `Dockerfile` ni `pyproject.toml`; el `CMD` arranca `uvicorn rumbo.main:app` sin configurar el logger `rumbo`, que hereda `WARNING` del raíz, así que el `logger.info` se descarta. Además se loguea antes del `delete`/`flush`, no después de confirmar. | `fix/M5-log-eliminacion-resena` | — |
| H-03 | ✅ confirmado (importante) | `DetalleHotel.tsx:32` y `ResenasOcultas.tsx:11` guardan `pagina` en `useState` y nunca la ajustan; `PaginadorResenas` devuelve `null` cuando `ultima === 1`, aunque `pagina` sea 2. | `fix/M5-moderacion-web` | — |
| H-04 | ✅ confirmado (importante) | `routers/viajes.py` `listar_viajes` sigue en `raise no_implementado()`; `SelectorViaje` depende de `useViajes`. El listado es [[T-091 Listar los viajes con su situación económica|T-091]] (M6, libre). Tampoco se pueden crear viajes desde la API (`confirmar_reserva` también es stub), así que hoy solo existen los de la semilla. | pendiente de decisión | — |
| H-05 | ✅ confirmado (importante) | `editar_hotel` y `dar_de_baja_hotel` usan `_hoteles.obtener` sin `with_for_update`; `_guardar_sin_duplicado` toma `destino_id` del objeto leído, que puede estar desactualizado cuando el `PATCH` no trae el destino. El rescate busca en el destino viejo y relanza el `IntegrityError` → 500. | `fix/M5-edicion-hotel-concurrente` | — |
| H-06 | ✅ confirmado (importante) | `mocks/hoteles.ts:391` responde 204 a cualquier reseña existente; el servicio real (`eliminar_resena`) da 409 si no está `oculta`. | `fix/M5-moderacion-web` | — |

### Alcance de cada arreglo

**H-01 · `fix/M5-moneda-cotizacion`** (dinero: `reviewer-seguridad` y aprobación de otro integrante)
- Agregar un hotel con la moneda en ARS → cambiar a USD → el precio autocompletado desde el catálogo queda vacío y el concepto pierde «(ref. por noche)»; emitir sin cargarlo da el error de precio requerido y no llama a la API.
- Un precio que el empleado escribió o corrigió a mano no se toca al cambiar de moneda.
- Agregar el hotel con USD ya elegido → precio vacío, como hoy.
- Volver de USD a ARS no rellena el precio solo (no se convierte ni se restaura).

**H-02 · `fix/M5-log-eliminacion-resena`** (backend, riesgo normal)
- Con la configuración de logging que usa el arranque real (la misma que aplica el `CMD` del `Dockerfile`), el logger `rumbo` emite INFO y la línea de la eliminación sale por la salida estándar con `resena_id`, `hotel_id`, `cliente_id`, `puntaje`, `motivo_baja` y `actor_id`.
- El test no fuerza el nivel con `caplog.at_level`: verifica la salida con la configuración del arranque.
- El registro se emite después de que la eliminación se volcó a la base; si el `flush` falla, no hay línea de «eliminada».
- Eliminar una publicada (409) no deja la línea.

**H-03 · `fix/M5-moderacion-web`** (web, riesgo normal)
- Detalle: 21 publicadas, página 2, ocultar la única de esa página → la lista muestra la página 1 con 20 reseñas.
- Ocultas: 21 ocultas, página 2, restaurar la única de esa página → la lista muestra la página 1 con 20.
- Si el total no reduce las páginas, la página elegida se conserva.

**H-06 · `fix/M5-moderacion-web`**
- Mock como `admin`: `DELETE /resenas/{id}` de una publicada → 409 con «Solo se elimina una reseña oculta: ocultala primero.»; de una oculta → 204; inexistente → 404; como `empleado` → 403.

**H-05 · `fix/M5-edicion-hotel-concurrente`** (backend, riesgo normal)
- `editar_hotel` y `dar_de_baja_hotel` bloquean la fila del hotel (`with_for_update`, `populate_existing`) antes de validar estado, nombre y destino.
- Intercalación con dos sesiones contra PostgreSQL: A renombra H a «Sol» mientras B mueve H a D2, donde ya existe «Sol» → A responde 409 con `existente` (o espera a B y valida contra D2), nunca 500.
- Editar un hotel que otra sesión dio de baja en paralelo → 409 «está cerrado».
- La edición sin concurrencia se comporta como hoy.

**H-04** — la recomendación es no arreglarlo en M5: `GET /viajes` es el alcance de T-091 y una versión mínima acá duplicaría ese trabajo. Se agrega a T-091 el criterio de verificar CU-17 A1 contra la API real (registrar una reseña vinculada a un viaje desde la web). Pendiente de la aprobación de Nahuel.
