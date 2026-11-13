---
tipo: referencia
estado: formalizado
responsable: Codex
modulo: M11
actualizado: 13/11/26
---
# M11 — review Codex

## Resumen
Se revisaron los once merges indicados, sin atribuirles cambios posteriores de `main` ni repetir los problemas conocidos del pedido. Se encontraron tres hallazgos importantes de integración: concurrencia al ganar, avisos de itinerario descartados y selección de borradores fuera de vigencia.
La revisión fue estática, con una reproducción aislada de la validación de vigencia usando las funciones del merge; no se ejecutaron la suite completa ni una reproducción del bloqueo mutuo contra PostgreSQL.

## Hallazgos

### H-01 · Ganar y vencer cotizaciones adquieren los bloqueos en distinto orden
- **Severidad:** importante
- **Ubicación:** `src/backend/rumbo/datos/repositorios/oportunidades.py:113` (merge `30807660`)
- **Ticket relacionado:** T-175
- **Trazabilidad:** CU-05, CU-06 A5, RF-016, RF-025, DEC-0028 punto 1.5
- **Problema:** `listar_de_oportunidad_para_modificar` combina el orden de `_historial` (`fecha DESC`, `created_at DESC`, `id`) con `FOR UPDATE`. El proceso diario usa `enviadas_vencidas_para_modificar`, que bloquea por `id ASC` en el mismo archivo, línea 144. Pueden adquirir las mismas filas en orden inverso. Bloquear antes la oportunidad no serializa estos dos caminos, porque el vencimiento diario no la bloquea. No hay reintento del deadlock: si se aborta la petición, termina en 500; si se aborta el paso diario, queda registrado como fallido. Los tests de concurrencia agregados no cubren ganar frente a vencer.
- **Escenario:** una oportunidad tiene dos cotizaciones `enviada` con vigencia pasada: A tiene menor ID y fecha anterior a B. Se gana con un tercer borrador vigente mientras corre el proceso diario. Ganar adquiere B y el diario adquiere A; ganar espera A y el diario espera B. PostgreSQL debe abortar una transacción para resolver el bloqueo mutuo. El escenario se deriva de las consultas del merge; no se reprodujo contra una base.
- **Arreglo sugerido:** adquirir los bloqueos de cotizaciones en un orden común por ID en ambos caminos; eliminar el orden del historial antes de aplicar ese orden y ordenar los resultados después si el consumidor lo necesita. Agregar una prueba de concurrencia entre ganar y vencer con varias cotizaciones y órdenes de fecha e ID opuestos.

### H-02 · La web pierde los avisos de hoteles omitidos al reservar
- **Severidad:** importante
- **Ubicación:** `src/apps/web/src/features/oportunidades/DialogoReserva.tsx:122` (merge `fd73b10f`)
- **Ticket relacionado:** entre T-174, T-177 y T-179
- **Trazabilidad:** CU-07 A4, CU-09 A6, DEC-0028 punto 4.3
- **Problema:** el backend devuelve `advertencias_itinerario` y el hook conserva ese campo, pero el diálogo utiliza únicamente el ID de la respuesta y navega inmediatamente a la ficha. Al cierre del módulo no hay consumidores de `advertencias_itinerario` en la web. La persona no recibe el aviso necesario para corregir los tramos omitidos; la respuesta del GET del viaje tampoco conserva esas advertencias.
- **Escenario:** la cotización aceptada incluye un hotel del 10 al 15 de diciembre de 2026. Al reservar se cambia la salida al 11 de diciembre. La API crea el viaje y omite el tramo con un aviso `fuera_de_fechas`; la web abre la ficha sin ese hotel y sin explicar la omisión. Lo mismo ocurre con un hotel cerrado o un tramo superpuesto.
- **Arreglo sugerido:** mostrar las advertencias al confirmar o trasladarlas a la ficha de destino para que sean visibles después de navegar. Agregar una prueba de componente con una respuesta 201 que contenga advertencias y comprobar que la persona recibe el motivo de la omisión.

### H-03 · El selector ofrece borradores cuya vigencia ya pasó
- **Severidad:** importante
- **Ubicación:** `src/apps/web/src/features/oportunidades/ConfirmacionesCierre.tsx:51` (merge `89b310cc`)
- **Ticket relacionado:** entre T-175 y T-178
- **Trazabilidad:** CU-05, CU-06, RF-016, RF-025, DEC-0028 puntos 1.2 a 1.4
- **Problema:** el filtro de cotizaciones elegibles comprueba `validez_hasta` solo para las `enviada`, pero admite cualquier `borrador`. `ganar_con`, incorporado por T-175, ejecuta `_exigir_dentro_de_vigencia` también para un borrador y rechaza la operación si su vigencia pasó. Los borradores no pasan automáticamente a `vencida`, por lo que siguen apareciendo como opciones seleccionables.
- **Escenario:** el 13/11/26, una oportunidad abierta tiene un borrador con `validez_hasta = 2026-11-12`. El diálogo lo ofrece y permite confirmar; el backend responde 409 y la oportunidad sigue abierta. Se comprobó con las funciones de estado del merge `30807660`: ese borrador es rechazado, mientras que uno válido hasta el 13/11/26 permite ganar.
- **Arreglo sugerido:** exigir `validez_hasta >= hoy` tanto a borradores como a enviadas en el selector. Cubrir un borrador caducado y el último día de vigencia en las pruebas de la web, manteniendo los mocks alineados con la validación del backend.

## Triage de Claude

> Triage del 13/11/26 (Nahuel con Claude). Los tres hallazgos se verificaron contra el código de `main`.

### H-01: confirmado (importante, riesgo alto)
- **Verificación:** `listar_de_oportunidad_para_modificar` bloquea con el orden de `_historial` (`fecha DESC`, `created_at DESC`, `id`). En cambio, `enviadas_vencidas_para_modificar` bloquea por `id ASC` y el proceso diario no bloquea la oportunidad. Si dos cotizaciones `enviada` de la misma oportunidad tienen la fecha en un orden y el `id` en el inverso, ganar y vencer pueden tomar sus bloqueos al revés, y eso puede terminar en un bloqueo mutuo. No hay reintento.
- **Alcance:**
  1. `listar_de_oportunidad_para_modificar` toma los bloqueos en orden de `id` ascendente, el mismo del proceso diario, y devuelve las cotizaciones en el orden del historial, como hasta ahora.
  2. Un test de concurrencia contra PostgreSQL corre al mismo tiempo ganar con una cotización y el vencimiento diario, sobre una oportunidad con dos `enviada` vencidas cuyo orden de fecha es el inverso al de su `id`. Las dos transacciones terminan sin bloqueo mutuo y el estado final es coherente: la elegida queda `aceptada` y las otras dos, `rechazada` o `vencida`.
- **Rama:** `fix/M11-H01-orden-de-bloqueos`. Toca estados y concurrencia, así que la review la hace `reviewer-seguridad` y el PR necesita la aprobación de otro integrante.
- **Arreglo:** PR #218 (rojo `14584e50`, verde `a5d67f18`). Espera la aprobación de otro integrante.

### H-02: confirmado (importante)
- **Verificación:** en `src/apps/web/src` nadie lee `advertencias_itinerario`. `DialogoReserva` usa solo `viaje.id` y navega enseguida a la ficha, y el `GET` del viaje no devuelve las advertencias.
- **Alcance:**
  1. Si la reserva responde 201 con `advertencias_itinerario` no vacío, el diálogo no navega solo: muestra un aviso (`role="alert"`) con cada hotel omitido y su motivo en lenguaje natural (`fuera_de_fechas`, `superpuesto` y `hotel_cerrado`). El hotel se identifica por el concepto del ítem de la cotización, o por un texto genérico si no lo encuentra. Un botón «Ir al viaje» lleva a la ficha.
  2. Si la respuesta trae `advertencias_itinerario` vacío, el comportamiento no cambia: navega directo a la ficha.
  3. El mock de `confirmar-reserva` permite devolver advertencias, para poder probarlo.
- **Rama:** `fix/M11-H02-H03-reserva-y-ganar-web`, junto con H-03.
- **Arreglo:** PR #217, mergeado (rojo `3d3381c2`, verde `531469ca`, fix `81b9ea73`).

### H-03: confirmado (importante)
- **Verificación:** `ConfirmacionesCierre.tsx:51` filtra `c.estado === "borrador" || (c.estado === "enviada" && c.validez_hasta >= hoy)`. `ganar_con` aplica `_exigir_dentro_de_vigencia` también a los borradores, así que un borrador con la vigencia vencida aparece como opción y termina en 409.
- **Alcance:**
  1. El selector de «Ganar» solo ofrece borradores y enviadas con `validez_hasta >= hoy`, en Buenos Aires.
  2. Un borrador con la vigencia vencida no aparece. Uno que vence hoy sí aparece.
  3. El mock de `ganar` responde 409 para un borrador con la vigencia vencida, igual que el backend.
- **Rama:** `fix/M11-H02-H03-reserva-y-ganar-web`.
- **Arreglo:** PR #217, mergeado.
