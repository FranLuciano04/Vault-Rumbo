---
tipo: referencia
estado: formalizado
responsable: Codex
modulo: M4
actualizado: 28/10/26
---
# M4 — review Codex

## Resumen
Se revisaron los merges indicados y se contrastaron los hallazgos con HEAD `1712af9`: quedan tres bloqueantes y tres importantes, concentrados en aceptación de cotizaciones, edición después del cierre, consulta individual e historial de insistencias.
Pasaron los 47 tests unitarios existentes de estados de oportunidad y cotización; reproducciones adicionales en memoria confirmaron la doble aceptación y la aceptación tras reactivar. No se ejecutaron integración PostgreSQL ni e2e.
Se respetaron las aclaraciones de la especificación: lectura global del empleado (DEC-0005), versiones anteriores conservadas sin numeración persistida (T-066 / EST-Cotización) y rechazo permitido con oportunidad cerrada (T-067); no se reportan como defectos.

## Hallazgos

### H-01 · Se pueden aceptar varias versiones de la misma oportunidad
- **Severidad:** bloqueante
- **Ubicación:** `src/backend/rumbo/negocio/estados/cotizacion.py:63` (merge `89234e9`)
- **Ticket relacionado:** entre T-066 y T-067
- **Trazabilidad:** CU-06 A1 y A2, RF-024, RF-025, EST-Cotización §Huecos y ambigüedades, punto 1; pedido de review §3.
- **Problema:** `aceptar` comprueba el estado y la vigencia temporal de esa cotización, pero no que sea la versión vigente ni que otra versión ya esté aceptada. El servicio bloquea la oportunidad, pero no consulta las demás cotizaciones bajo ese bloqueo. Por eso serializar las solicitudes no impide terminar con dos aceptadas, incluso con monedas o precios diferentes. Conservar versiones anteriores `enviada` es correcto; permitir aceptarlas sin controlar cuál rige la venta es el defecto.
- **Escenario:** emitir y enviar A; emitir y enviar B más reciente, ambas sin vencer; aceptar A y luego B → las dos quedan `aceptada` y la oportunidad sigue abierta. También sucede con dos solicitudes simultáneas: la segunda espera el bloqueo, pero luego pasa las mismas guardas. La reproducción secuencial de la función real de estados confirmó ambas aceptaciones.
- **Arreglo sugerido:** dentro del bloqueo de la oportunidad, verificar que se acepta la versión vigente y que no hay otra aceptada; responder 409 cuando corresponda. Cubrir versiones con distinta fecha y empate de fecha, más una prueba concurrente que exija una sola aceptación exitosa.

### H-02 · Aceptar después de reactivar no devuelve la oportunidad a cotizada
- **Severidad:** bloqueante
- **Ubicación:** `src/backend/rumbo/negocio/estados/cotizacion.py:66` (merge `89234e9`)
- **Ticket relacionado:** entre T-064 y T-067
- **Trazabilidad:** CU-05 A3, CU-06 A2, RF-020, RF-025, EST-Cotización T3.
- **Problema:** la aceptación exige una oportunidad abierta, pero solo cambia el estado de la cotización. Supone que la oportunidad todavía está `cotizada`. Después de reactivar, esa suposición no se cumple y se omite el efecto de T3: dejarla `cotizada`, lista para confirmar la reserva.
- **Escenario:** oportunidad `cotizada` con una única cotización `enviada` aún vigente → perder → reactivar (`en_gestion`) → aceptar esa cotización. La aceptación tiene éxito, pero el embudo sigue mostrando `en_gestion`. La ejecución en memoria del código real confirmó el resultado `en_gestion / aceptada`.
- **Arreglo sugerido:** aplicar también el efecto sobre la oportunidad al aceptar, conservando el bloqueo y las guardas. Agregar una prueba del recorrido completo enviar → perder → reactivar → aceptar, que compruebe ambos estados.

### H-03 · El PATCH modifica oportunidades cerradas
- **Severidad:** bloqueante
- **Ubicación:** `src/backend/rumbo/negocio/servicios/oportunidades.py:54` (merge `3c0c361`)
- **Ticket relacionado:** entre T-063 y T-064
- **Trazabilidad:** CU-05 §Precondiciones, RF-016; pedido de review §2.
- **Problema:** `editar_oportunidad` valida permisos y fechas, pero nunca exige que la oportunidad esté abierta. El bloqueo incorporado por T-064 evita carreras, pero no agrega esa guarda. Se pueden alterar los datos de una venta cerrada o de una oportunidad perdida sin reactivarla, en contra de la restricción de edición de oportunidades cerradas indicada para esta review.
- **Escenario:** el responsable de una oportunidad `ganada` o `perdida` envía `PATCH /oportunidades/{id}` con `{"destino_consultado":"Otro destino","pasajeros":3}` → se aplican los cambios y se devuelve 200.
- **Arreglo sugerido:** exigir oportunidad abierta después de obtener el bloqueo y validar permisos, antes de aplicar cambios. Declarar el 409 en el contrato y cubrir ambos estados cerrados en los tests del PATCH.

### H-04 · La consulta individual de una cotización quedó en 501
- **Severidad:** importante
- **Ubicación:** `src/backend/rumbo/presentacion/routers/oportunidades.py:188` (merge `9437c34`)
- **Ticket relacionado:** T-061 (integración al cierre de M4)
- **Trazabilidad:** CU-06, contrato `GET /cotizaciones/{cotizacion_id}`; pedido de review §1 y §9.
- **Problema:** `obtener_cotizacion` sigue ejecutando `raise no_implementado()` al cierre del módulo. El contrato y `useCotizacion` publican la consulta, y el mock devuelve el objeto, pero el backend nunca devuelve la cotización ni aplica la visibilidad para responder 404. El stub era correcto para T-061; quedó sin implementar al integrar el módulo. Los tests de contrato todavía admiten el 501. No hay un consumidor actual de este hook en las pantallas web inspeccionadas, por lo que el problema afecta la operación pública del contrato.
- **Escenario:** crear una cotización y consultar su UUID con un usuario autenticado autorizado mediante `GET /api/cotizaciones/{id}` → 501 en lugar de 200. Un UUID inexistente o una cotización invisible también reciben 501 en lugar de 404.
- **Arreglo sugerido:** implementar la lectura mediante el repositorio y la política de visibilidad de su oportunidad, mapear al esquema y retirar la ruta de `OPERACIONES_STUB`. Probar lectura autorizada, inexistente y ajena para un freelance.

### H-05 · Las insistencias vistas desaparecen del detalle
- **Severidad:** importante
- **Ubicación:** `src/apps/web/src/features/oportunidades/InsistenciasOportunidad.tsx:30` (merge `ef53f9a`)
- **Ticket relacionado:** T-071
- **Trazabilidad:** CU-05, RF-015, CU-14 paso 5, EST-Alerta; criterio de T-071 «Línea de tiempo de interacciones e insistencias».
- **Problema:** el detalle consulta únicamente `estado=pendiente` y `estado=resuelta`; el filtro del backend es por igualdad y la etiqueta de `vista` también falta. Una insistencia vista todavía requiere resolución, pero desaparece del seguimiento de la oportunidad.
- **Escenario:** crear una única insistencia, marcarla como vista desde la agenda y volver al detalle de la oportunidad → aparece «No hay insistencias agendadas», aunque la alerta existe y aún no fue resuelta.
- **Arreglo sugerido:** incluir las insistencias `vista` en la carga y representación del historial. Agregar una prueba del recorrido agenda → marcar vista → detalle, comprobando que la insistencia siga visible con su estado.

### H-06 · El historial de insistencias se trunca sin acceso al resto
- **Severidad:** importante
- **Ubicación:** `src/apps/web/src/features/oportunidades/InsistenciasOportunidad.tsx:41` (merge `ef53f9a`)
- **Ticket relacionado:** T-071
- **Trazabilidad:** CU-05, RF-015; criterio de T-071 «Línea de tiempo de interacciones e insistencias».
- **Problema:** ambas consultas usan la primera página por defecto, de veinte registros. El componente concatena `items` e ignora `total`, sin navegación ni carga adicional. La línea de tiempo presenta como completo un subconjunto de las insistencias.
- **Escenario:** una oportunidad acumula 21 insistencias resueltas → solo se muestran veinte y no hay forma de consultar la restante desde su historial. Con 21 pendientes también queda un contacto agendado fuera del detalle.
- **Arreglo sugerido:** paginar las insistencias con carga de páginas adicionales o navegación explícita, incluyendo todos los estados relevantes. Cubrir más de veinte registros y verificar que el usuario pueda acceder al último.

## Triage de Claude

> Triage del 28/10/26 (Claude, sesión de Nahuel). Cada hallazgo se verificó leyendo el código vigente en `main` (`5f5f7f7`) y la especificación citada. Los seis se confirman. El **alcance** de cada uno es la lista cerrada de comportamientos que el arreglo tiene que fijar con un test; lo que aparezca fuera de esa lista se anota como menor y se consulta.

| Hallazgo | Resultado | Verificación | Rama | PR |
|---|---|---|---|---|
| H-01 | ✅ confirmado (bloqueante) | `estados/cotizacion.py` `aceptar` solo mira el estado `enviada`, la vigencia y que la oportunidad esté abierta; `_transicionar_cotizacion` bloquea la oportunidad pero no consulta las otras versiones. Contradice EST-Cotización hueco 1 («la vigente es la de `fecha` más reciente») y T3 (la aceptada fija la moneda de referencia del `Viaje`: con dos aceptadas no hay una sola). | `fix/M4-aceptar-cotizacion` | [#135](https://github.com/FranLuciano04/Vault-Rumbo/pull/135) |
| H-02 | ✅ confirmado (bloqueante) | `aceptar` no toca la oportunidad. EST-Cotización T3: «la Oportunidad queda `cotizada`». Después de reactivar (T8 → `en_gestion`) la aceptación la deja en `en_gestion`. | `fix/M4-aceptar-cotizacion` | [#135](https://github.com/FranLuciano04/Vault-Rumbo/pull/135) |
| H-03 | ✅ confirmado (bloqueante) | `servicios/oportunidades.py` `editar_oportunidad` llama a `exigir_escritura` pero nunca a `exigir_abierta`. CU-05 §Precondiciones: «Existe una Oportunidad abierta, en estado `nueva`, `en_gestión` o `cotizada`». | `fix/M4-editar-y-leer` | [#136](https://github.com/FranLuciano04/Vault-Rumbo/pull/136) |
| H-04 | ✅ confirmado (importante) | `routers/oportunidades.py:267` `obtener_cotizacion` sigue en `raise no_implementado()`. `useCotizacion` (shared) existe y hoy no lo usa ninguna pantalla. | `fix/M4-editar-y-leer` | [#136](https://github.com/FranLuciano04/Vault-Rumbo/pull/136) |
| H-05 | ✅ confirmado (importante) | `InsistenciasOportunidad.tsx` pide `estado=pendiente` y `estado=resuelta`; el filtro `estado` de `GET /alertas` es por igualdad y `ETIQUETA_ESTADO` no tiene `vista`. Una insistencia vista no se ve en el detalle. | `fix/M4-insistencias-detalle` | [#137](https://github.com/FranLuciano04/Vault-Rumbo/pull/137) |
| H-06 | ✅ confirmado (importante) | Las dos consultas usan la primera página (20) e ignoran `total`; no hay forma de ver el resto. | `fix/M4-insistencias-detalle` | [#137](https://github.com/FranLuciano04/Vault-Rumbo/pull/137) |

### Alcance de cada arreglo

**H-01 · `fix/M4-aceptar-cotizacion`** (estados y dinero: `reviewer-seguridad` y aprobación de otro integrante)
- Aceptar una versión cuando otra de la misma oportunidad ya está `aceptada` → 409, y la segunda sigue `enviada`.
- Aceptar una versión que no es la vigente → 409. La vigente es la primera en el orden del historial: `fecha` desc, `created_at` desc, `id` (el mismo de `paginar_de_oportunidad`), así que el empate de fecha se resuelve igual que en la pantalla.
- Aceptar la vigente `enviada`, sin otra aceptada → 200, como hoy.
- Dos aceptaciones simultáneas de versiones distintas de la misma oportunidad → una 200 y la otra 409; queda una sola `aceptada` (test de concurrencia contra PostgreSQL).
- Rechazar no cambia (T-067 permite rechazar versiones viejas y con la oportunidad cerrada).

**H-02 · `fix/M4-aceptar-cotizacion`**
- `enviar` → `perder` → `reactivar` → `aceptar` la misma versión vigente → la cotización queda `aceptada` y la oportunidad `cotizada`.
- Aceptar con la oportunidad `cotizada` la deja `cotizada`, como hoy.

**H-03 · `fix/M4-editar-y-leer`** (estados: `reviewer-seguridad` y aprobación de otro integrante)
- `PATCH /oportunidades/{id}` sobre una `ganada` → 409 y los datos no cambian.
- `PATCH /oportunidades/{id}` sobre una `perdida` → 409 y los datos no cambian.
- El 409 queda declarado en el contrato (`openapi.json`, `tipos.gen.ts`) y en el mock de shared.
- Las abiertas se siguen editando como hoy (200). El orden de las guardas queda 404 → 403 → 409.

**H-04 · `fix/M4-editar-y-leer`**
- `GET /cotizaciones/{id}` de una visible → 200 con el esquema `Cotizacion`.
- `GET /cotizaciones/{id}` inexistente → 404.
- `GET /cotizaciones/{id}` de una oportunidad ajena para un `freelance` → 404.
- La ruta sale de las operaciones stub y el test de contrato deja de admitir el 501.

**H-05 · `fix/M4-insistencias-detalle`** (web, riesgo normal)
- Una insistencia `vista` aparece en el detalle de la oportunidad con la etiqueta «Vista».
- El orden y las etiquetas de `pendiente` y `resuelta` no cambian.

**H-06 · `fix/M4-insistencias-detalle`**
- Con más de 20 insistencias de un mismo estado, el detalle permite llegar a la última (carga de más páginas o navegación) y ninguna queda oculta.
- Con 20 o menos no aparece ningún control de paginación.
