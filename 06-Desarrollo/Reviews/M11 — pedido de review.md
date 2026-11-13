---
tipo: referencia
estado: formalizado
responsable: equipo
modulo: M11
actualizado: 13/11/26
---
# M11 — pedido de review

tags:: #tipo/referencia #estado/formalizado #pc/pc2

> Pedido de review del módulo **M11 — Ajustes de la revisión del equipo** para Codex, según [[Review de módulo — rol de Codex]] y [[DEC-0014 Flujo de implementación con agentes|DEC-0014]]. Los hallazgos van en `06-Desarrollo/Reviews/M11 — review Codex.md`.

## Alcance
M11 aplica los 8 cambios de producto de la revisión del equipo del 10/11/26. El núcleo es [[DEC-0028 Cotizaciones alternativas y reserva con el primer pago|DEC-0028]], aprobada el 11/11/26.

**Ajustes de la web, sin backend:**
- **Embudo con arrastre** (T-171, CU-05): las tarjetas se arrastran entre columnas con `@dnd-kit/core`, que es una dependencia nueva. Para el teclado, cada tarjeta tiene un menú «Mover». Los dos caminos validan contra `transiciones.ts` y usan los endpoints de siempre.
- **Puntaje con estrellas** (T-172, CU-17): un `SelectorEstrellas` con rol `radiogroup`. La API no cambia.
- **Comisión en %** (T-173, CU-10): muestra en vivo el importe equivalente, calculado sobre la ganancia (DEC-0007 y DEC-0028 punto 5).

**Cotizaciones alternativas y reserva** (DEC-0028):
- **Contrato** (T-174):
  - `ItemCotizacion` suma `hotel_id`, `check_in` y `check_out`.
  - `POST /oportunidades/{id}/ganar` acepta `{ cotizacion_id }` opcional. Sin cuerpo sigue siendo la venta directa. El `operation_id` pasó a `ganar_oportunidad`.
  - La reserva responde `ReservaConfirmada`, que trae `advertencias_itinerario`.
- **Ganar con la cotización elegida** (T-175, riesgo alto):
  - `ganar_con` acepta la elegida, aunque sea un `borrador`, y pasa las demás `enviada` a `rechazada`.
  - Bloquea la oportunidad y sus cotizaciones con `FOR UPDATE`.
  - `exigir_vigente_sin_aceptada` pasó a `exigir_sin_otra_aceptada`.
- **Reserva con el primer pago** (T-176, riesgo alto): `exigir_plan_de_reserva_valido` pide al menos un pago, cada uno mayor que 0, y un total que no supere el precio. El `PUT` del plan sigue exigiendo que sume exacto.
- **Itinerario desde la cotización** (T-177):
  - `armar_desde_cotizacion` crea los tramos en la misma transacción de la reserva.
  - El tramo que no entra se omite y se avisa (`fuera_de_fechas`, `superpuesto` o `hotel_cerrado`).
  - `emitir_cotizacion` valida que el hotel exista.
- **Web:**
  - Al ganar se elige la cotización o la venta directa, y las versiones pasaron a llamarse «Cotización N» (T-178).
  - La reserva se precarga desde la cotización aceptada y pide solo el primer pago (T-179).
  - El formulario de la cotización guarda hotel y fechas por ítem (T-180).
- **e2e** (T-181): `cu01-reserva-cotizacion.spec.ts` recorre el circuito completo y la venta directa.

Mobile no cambia. Revisá **solo los diffs de los merges de abajo** (`git diff <merge>^1 <merge>`). `main` tiene código posterior encima: si un archivo cambió después, el código vigente puede no ser el del merge.

## Tickets y merges

| Ticket | Capa | Riesgo | Trazabilidad | Merge |
|---|---|---|---|---|
| [[T-171 Arrastrar las tarjetas del embudo para cambiar el estado]] | web | normal | CU-05, RF-016, RF-017, RF-020 | `bcaa4468` Merge pull request #206 |
| [[T-172 Elegir el puntaje de la reseña con estrellas]] | web | normal | CU-17, RF-101 | `ab167414` Merge pull request #207 |
| [[T-173 Mostrar la comisión en porcentaje con su importe]] | web | normal | CU-10, RN-01, DEC-0007 | `e3cf9ba6` Merge pull request #208 |
| [[T-174 Ajustar el contrato de cotizaciones y reserva]] | contrato | normal | CU-05, CU-06, CU-07, CU-09, CU-11 | `b2101b27` Merge pull request #209 |
| [[T-175 Ganar la oportunidad con la cotización que eligió el cliente]] | backend | ⚠️ alto | CU-05, CU-06, CU-07, RF-016, RF-025 | `30807660` Merge pull request #211 |
| [[T-176 Confirmar la reserva con el primer pago]] | backend | ⚠️ alto | CU-07, CU-11, RF-032, RF-059, DEC-0026 | `541773a4` Merge pull request #210 |
| [[T-177 Armar el itinerario con los hoteles de la cotización]] | backend | normal | CU-06, CU-07, CU-09, RF-043, RF-106, DEC-0003 | `7c074f23` Merge pull request #212 |
| [[T-178 Elegir la cotización al ganar la oportunidad en la web]] | web | normal | CU-05, CU-06, RF-016, RF-024, RF-025 | `89b310cc` Merge pull request #213 |
| [[T-179 Precargar la reserva con la cotización y pedir el primer pago]] | web | normal | CU-07, CU-11, RF-032, RF-033, RF-059 | `fd73b10f` Merge pull request #215 |
| [[T-180 Guardar los hoteles elegidos en la cotización]] | web | normal | CU-06, CU-09, RF-021, RF-106 | `f72596a6` Merge pull request #214 |
| [[T-181 Probar de punta a punta la reserva desde la cotización elegida]] | e2e | normal | CU-01, CU-05, CU-06, CU-07, CU-09, CU-11 | `5d7403fd` Merge pull request #216 |

Todas las decisiones de M11 salen de [[DEC-0028 Cotizaciones alternativas y reserva con el primer pago|DEC-0028]].

**Tamaño:** los 11 merges suman 81 archivos distintos y unas +5.650 / −600 líneas. La cuenta incluye las notas de los tickets, los archivos generados y `pnpm-lock.yaml`.

**Migraciones:** M11 no agrega ninguna. Hotel y fechas van en el JSONB `items` de la cotización.

**Riesgo:** T-175 (estados de la oportunidad y de la cotización) y T-176 (dinero) son de riesgo alto. Pasaron por `reviewer-seguridad` y los aprobó otro integrante.

## Archivos tocados por el módulo
Es la unión de `git diff --name-only <merge>^1 <merge>` de los 11 merges, sin las notas de tickets ni de bitácoras.

**Backend (`src/backend/`)**
- Datos: `rumbo/datos/repositorios/oportunidades.py`.
- Negocio:
  - `rumbo/negocio/estados/{cotizacion,oportunidad}.py`;
  - `rumbo/negocio/servicios/{economia,itinerario,oportunidades,viajes}.py`.
- Presentación:
  - `rumbo/presentacion/esquemas/{oportunidades,viajes}.py`;
  - `rumbo/presentacion/routers/{oportunidades,viajes}.py`.
- Tests:
  - `tests/api/test_{cobros,confirmar_reserva,contrato_m11,contrato_m6,cotizaciones,cotizaciones_respuesta}.py`;
  - `tests/api/test_{ganar_con_cotizacion,itinerario_de_cotizacion,oportunidades_concurrencia}.py`.

**Contrato compartido (`src/packages/shared/`)**
- Generados: `openapi.json` y `src/tipos.gen.ts`.
- `src/modelos.ts`.
- Hooks: `src/hooks/{oportunidades,viajes}.ts`.
- Mocks: `src/mocks/{hoteles,oportunidades,viajes}.ts`.

**Web (`src/apps/web/`)**
- Dependencias: `package.json` (`@dnd-kit/core`) y `../../pnpm-lock.yaml`.
- Componentes: `src/components/{CampoFormulario,SelectorEstrellas}.tsx`.
- Hoteles: `src/features/hoteles/FormularioResena.tsx`, con los tests `PaginaHoteles` y `RegistrarResena`.
- Oportunidades:
  - `src/features/oportunidades/{AccionesOportunidad,ColumnaEmbudo,ConfirmacionesCierre,DialogoReserva,MenuMoverOportunidad,PaginaOportunidades,TarjetaOportunidad}.tsx`;
  - `src/features/oportunidades/{esquemas,sinAcentos,transiciones,useTransicionesOportunidad}.ts`;
  - tests: `ArrastreEmbudo`, `ConfirmarReserva` y `GanarConCotizacion`.
- Cotizaciones:
  - `src/features/oportunidades/cotizaciones/{AccionesCotizacion,AlternativasCotizacion,BuscadorHoteles,CotizacionesOportunidad,FormularioCotizacion}.tsx`;
  - `src/features/oportunidades/cotizaciones/{calculos,esquemas}.ts`;
  - tests: `AlternativasCotizacion`, `CotizacionesOportunidad`, `RecomendarHoteles` y `RespuestaCotizacion`.
- Viajes:
  - `src/features/viajes/SeccionEconomia.tsx`;
  - `src/features/viajes/{calculos,esquemas,itinerario/esquemas}.ts`;
  - tests: `FichaViaje` y `calculos`.
- e2e: `e2e/{cu01-reserva-cotizacion,cu01,hoteles,oportunidades}.spec.ts`.

## Puntos que conviene mirar entre tickets
1. **Ganar con cotización y estados (T-174, T-175, T-178; DEC-0028 punto 1).**
   - Que `ganar_con` deje una sola `aceptada`, rechace solo las `enviada` y no toque los borradores, las vencidas ni las rechazadas.
   - Que la venta directa (sin `cotizacion_id`) no cambie el estado de ninguna cotización.
   - El orden de los bloqueos (oportunidad y después cotizaciones) frente al vencimiento diario, que bloquea cotizaciones sin bloquear la oportunidad.
   - Que el 422 no revele si existe una cotización de otra oportunidad o que el actor no puede ver.
   - Que la web ofrezca solo las cotizaciones que el backend acepta. Con una `aceptada` previa (CU-06 A2), que ofrezca solo esa.
2. **Reserva con el primer pago y dinero (T-176, T-179; DEC-0028 punto 3, DEC-0026).**
   - Que `exigir_plan_de_reserva_valido` rechace un total mayor que el precio, montos ≤ 0 y un plan vacío, y que el `PUT` del plan siga exigiendo el total exacto.
   - Que el estado del viaje con un plan descalzado (reservado, vendido o confirmado) se mantenga coherente al completar el plan y cobrarlo.
   - Que la moneda y el precio del viaje salgan de la cotización aceptada y que la web no permita cambiar la moneda en ese caso.
   - La comparación del monto con `Number` en la web, frente a centésimas en el backend (ver punto 6).
3. **Itinerario desde la cotización (T-177, T-180; DEC-0028 punto 4).**
   - Que los tramos se creen en la misma transacción de la reserva y que un tramo omitido no la haga fallar.
   - Los bordes de `_fuera_del_viaje` y `_solapa`, que ahora comparten el alta manual y la reserva.
   - La validación de `check_in` ≤ `check_out` en el esquema de la API y en el formulario web.
   - Las fechas ISO dentro del JSONB: zona horaria y formato al leerlas.
4. **Contrato backend ↔ shared ↔ web (T-174 y todos los de web).**
   - Que `openapi.json`, `tipos.gen.ts` y los mocks coincidan con el backend: `OportunidadGanar`, `ItemCotizacion` y `ReservaConfirmada`.
   - Que el cambio de `operation_id` no deje a ningún consumidor con el nombre viejo.
   - Que los mocks de `ganar` y `confirmar-reserva` respondan con los mismos códigos que el backend real.
5. **Embudo con arrastre (T-171).**
   - Que soltar en una columna inválida no dispare ninguna mutación y que, mientras hay una transición pendiente, no se pueda arrastrar otra vez.
   - Que «Ganar» desde el arrastre pase por el mismo diálogo de elegir la cotización (T-178).
   - Accesibilidad del menú «Mover» y de `SelectorEstrellas` (T-172).
6. **Ya conocido, no hace falta reportarlo:**
   - `05-Diseño/API/openapi.json`, el contrato de diseño del PC1, no se actualizó. La referencia es `src/packages/shared/openapi.json` (T-174).
   - El aviso de tramo omitido solo trae `hotel_id`. Si un hotel se repite, no se sabe qué tramo se omitió, y un hotel que ya no existe se informa como `hotel_cerrado` (T-177).
   - `plan_desbalanceado` solo sale en `PUT /viajes/{id}/economia`. Ni la reserva ni el `GET` del viaje lo devuelven: la web lo calcula (T-176, T-181).
   - Con `precio_venta == 0` no se puede confirmar una reserva, como antes (T-176, DEC-0026).
   - `ganar_con` no tiene tests puros en `tests/negocio/`; lo cubren los de API (T-175).
   - En la web (T-179):
     - el error de monto mayor que el precio aparece recién cuando el resto del formulario es válido;
     - el monto se compara con `Number`;
     - el aviso dice «rebalanceá».
   - `FormularioTramo` no revalida el check-out al cambiar el check-in (T-180).
   - El arrastre se probó con tests de componente y no a mano en un navegador (T-171).
   - Ningún e2e cubre la venta directa con cotizaciones ya enviadas (CU-05 A4). Conviene un test de servicio (T-181).
   - `cu01-reserva-cotizacion.spec.ts` usa una espera de 20 s, porque con el Compose recién levantado algunos GET posteriores a una escritura tardaron más de 5 s. La review no encontró una causa en el backend (T-181).
   - En Windows, los e2e necesitan detener el stack de demo `rumbo`, y los PDF del backend fallan sin GTK. Las dos cosas son del entorno local, no del CI.
