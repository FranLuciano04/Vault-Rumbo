---
tipo: referencia
estado: formalizado
responsable: Codex
modulo: M6
actualizado: 01/11/26
---
# M6 — review Codex

## Resumen
La revisión identifica cinco hallazgos: tres bloqueantes y dos importantes; los riesgos principales son el importe registrado al cobrar ARS en USD, la coherencia del estado después de modificar el precio y el bloqueo del cobro propio del freelance en la web.
Se contrastaron los diffs de los merges del pedido con las especificaciones enlazadas y se comprobó que los hallazgos persisten en `faae626`. Validación estática de código, contrato y tests existentes; no se ejecutó la suite ni se modificó código.
No se reporta cancelar desde `en_curso`: CU-27 A4 lo permite expresamente. Las alertas de pagos con `viaje_id = null` respetan el origen exclusivo del esquema (`pago_id`); la falta de filtro por viaje en GET /alertas es una limitación del contrato para consultar una ficha, no un error en la generación de esas alertas.

## Hallazgos

### H-01 · El cobro de ARS en USD registra un importe distinto del mostrado
- **Severidad:** bloqueante
- **Ubicación:** `src/backend/rumbo/negocio/calculos.py:40` (merge `9622928`); `src/apps/web/src/features/viajes/plan/CobroDePago.tsx:26` (merge `949cb3b`).
- **Ticket relacionado:** entre T-094 y T-104
- **Trazabilidad:** CU-12, RF-068, DEC-0007, DEC-0013
- **Problema:** la web interpreta el tipo de cambio como pesos por dólar y divide al cobrar en USD; envía esa misma tasa sin invertirla. El backend conserva la tasa en `_tipo_cambio` y siempre calcula `monto × tipo_cambio`, sin considerar la dirección de la conversión. El mock sigue el cálculo de la web, por lo que no revela la divergencia con la API real.
- **Escenario:** viaje en ARS, pago pendiente de `100000.00`, cobro en USD y tipo de cambio `1000.00` → la vista previa muestra USD 100, pero el backend guarda `monto_cobrado = 100000000.00` en USD. El valor pasa la validación de rango y queda registrado como cobro válido.
- **Arreglo sugerido:** fijar una única convención de cotización en el contrato y aplicarla en backend, web y mocks. Si se mantiene ARS por USD, dividir con Decimal al convertir ARS a USD y multiplicar en la dirección inversa. Agregar una prueba de integración con la API real para ambas direcciones y comprobar el importe persistido.

### H-02 · Aumentar el precio de un viaje confirmado bloquea el cobro de la diferencia
- **Severidad:** bloqueante
- **Ubicación:** `src/backend/rumbo/negocio/servicios/economia.py:59` (merge `effb881`); `src/backend/rumbo/negocio/estados/viaje.py:30` (merge `9622928`).
- **Ticket relacionado:** entre T-090, T-092 y T-094
- **Trazabilidad:** CU-10 A4, CU-11 A5, CU-12 A2, RF-059, RF-038, EST-Viaje
- **Problema:** editar el precio y rebalancear el plan no reconcilia el estado económico del viaje. Se admite modificar un `confirmado`, pero el cobro posterior solo admite `reservado` o `vendido`. A su vez, iniciar el viaje comprueba únicamente que esté `confirmado`, sin verificar que siga totalmente pagado.
- **Escenario:** precio 100, pago de 100 ya cobrado y viaje `confirmado` → se cambia el precio a 150 y se rebalancea agregando un pago de 50. El plan suma correctamente 150, pero el viaje sigue `confirmado` con saldo 50. Cobrar esa diferencia devuelve 409; en cambio, iniciar el viaje permite pasarlo a `en_curso` sin haber pagado el total, contra la secuencia estricta de EST-Viaje.
- **Arreglo sugerido:** definir en la máquina de estados cómo reconciliar el estado al editar la economía y el plan, y aplicarlo dentro de la misma transacción. Una deuda nueva debe poder cobrarse y debe impedir el inicio; cubrir con una prueba el circuito completo de aumento, rebalanceo, cobro e inicio.

### H-03 · La ficha impide al freelance cobrar los viajes que tiene a cargo
- **Severidad:** bloqueante
- **Ubicación:** `src/apps/web/src/features/viajes/FichaViaje.tsx:96` (merge `b686c6f`).
- **Ticket relacionado:** entre T-102, T-103 y T-104
- **Trazabilidad:** CU-11, CU-12, RF-067, RF-151, DEC-0005, DEC-0008 §3
- **Problema:** el plan recibe el mismo `editable` usado para la economía, que vale false para cualquier freelance sin comprobar `viaje.responsable_id`. Esa bandera también oculta los controles de cobro incorporados por T-104. DEC-0008 permite operar las operaciones propias y los servicios del backend autorizan al responsable. La vista de economía de solo lectura anotada en T-102 no justifica extender esa restricción al registro de cobros.
- **Escenario:** un freelance abre un viaje `reservado` del que es responsable, con un pago pendiente → puede consultar la ficha, pero no aparece la acción para cobrarlo ni ajustar el plan. El mismo usuario y pago son autorizados por la API. El circuito de venta propio queda detenido en la web.
- **Arreglo sugerido:** separar el permiso de operar el plan/cobros del permiso de editar la economía o la comisión; calcularlo con la misma regla de responsable/admin/dueño que aplica el backend. Verificar en la ficha completa un freelance responsable y un usuario que solo tiene permiso de lectura.

### H-04 · El rebalanceo exige un pago nuevo aunque lo cobrado ya cubra el precio
- **Severidad:** importante
- **Ubicación:** `src/backend/rumbo/presentacion/esquemas/economia.py:58` (merge `0fd328c`).
- **Ticket relacionado:** entre T-086, T-090 y T-092
- **Trazabilidad:** CU-10 A4, CU-11 A5, RF-059, RF-061
- **Problema:** `PlanDePagos.pagos` exige al menos un elemento, aunque en un rebalanceo esos elementos son únicamente los pagos nuevos: el servicio conserva los cobrados. Por eso no puede expresarse un rebalanceo válido que solo conserve cobros anteriores y anule todos los pendientes. No se trata de dejar el viaje sin pagos: los cobrados permanecen.
- **Escenario:** viaje de 100 con un pago de 50 cobrado y otro de 50 pendiente → se corrige el precio a 50. El rebalanceo correcto es `{"pagos": []}`, conservando el cobro y anulando el pendiente, pero el esquema devuelve 422. Un pago nuevo positivo excede el precio y uno de cero es rechazado por el servicio. Anular manualmente el pendiente permite retirar la deuda, pero no ofrece el rebalanceo solicitado ni reconcilia por sí solo el viaje `vendido` con el saldo cero.
- **Arreglo sugerido:** admitir una lista de nuevos pagos vacía al rebalancear cuando los cobrados ya suman el precio, manteniendo la validación del plan resultante y el requisito de al menos un pago en la reserva inicial. Alinear contrato, editor web y reconciliación del estado; probar la reducción del precio al importe ya cobrado.

### H-05 · El buscador del itinerario no puede encontrar hoteles fuera de la primera página
- **Severidad:** importante
- **Ubicación:** `src/apps/web/src/features/viajes/itinerario/BuscadorHoteles.tsx:31` (merge `740a2ee`).
- **Ticket relacionado:** T-106
- **Trazabilidad:** CU-09, RF-043, RF-044
- **Problema:** el componente carga únicamente los primeros 100 hoteles del destino, ordenados por nombre, y aplica la búsqueda sobre esa lista local. No envía el texto como filtro a la API ni ofrece paginación. El aviso que recomienda buscar por nombre cuando hay más resultados no permite acceder a esos resultados.
- **Escenario:** un destino tiene 101 hoteles activos y el que se necesita ocupa el puesto 101 por nombre → al escribir su nombre exacto se muestra que no hay coincidencias y no se puede seleccionarlo para el tramo, aunque existe en el catálogo y el backend permite usarlo.
- **Arreglo sugerido:** buscar por nombre en el servidor y permitir recorrer las páginas de resultados, conservando el filtro de destino. Cubrir un hotel que quede fuera de los primeros 100 de la consulta inicial.

## Triage de Claude

Verificado por Claude el 01/11/26 contra `main` (posterior a `faae626`). Los cinco hallazgos se confirman en el código vigente. H-01 y H-02 pedían una definición de negocio: Nahuel eligió las dos propuestas el 01/11/26 y quedaron en [[DEC-0026 Tipo de cambio y deuda nueva en un viaje confirmado|DEC-0026]] (en revisión hasta que la ratifique el equipo).

### H-01 · Confirmado (bloqueante)
`calculos.monto_cobrado` (`src/backend/rumbo/negocio/calculos.py:35`) siempre hace `monto × tipo_cambio`; `CobroDePago.tsx:23` divide cuando el cobro es en USD y el viaje en ARS. El contrato (`CobroRegistrar.tipo_cambio`) no dice en qué sentido se cotiza. Con viaje ARS 100000, cobro USD y tipo 1000, la API guarda USD 100000000.
- **Definición (DEC-0026):** `tipo_cambio` son siempre **pesos por dólar** (ARS por USD), como la cotización del día que usa la agencia y como ya asume la web. Va a una `DEC-` y a la descripción del campo en el contrato.
- **Alcance:**
  1. Viaje ARS, pago `100000.00`, cobro en USD con `tipo_cambio = 1000` → `monto_cobrado = 100.00`.
  2. Viaje USD, pago `100.00`, cobro en ARS con `tipo_cambio = 1000` → `monto_cobrado = 100000.00`.
  3. Redondeo al centavo con `ROUND_HALF_UP` en las dos direcciones (por ejemplo, ARS `100000.00` / `3` → USD `33333.33`).
  4. Un tipo de cambio que deja la equivalencia en cero o fuera de la columna sigue dando 422 sobre `tipo_cambio`.
  5. El mock MSW de `POST /pagos/{id}/cobro` calcula igual que la API (las dos direcciones).

### H-02 · Confirmado (bloqueante)
`registrar_economia` y `definir_plan_de_pagos` (`src/backend/rumbo/negocio/servicios/economia.py`) admiten un viaje `confirmado` y no tocan su estado; `al_registrar_cobro` (`estados/viaje.py:30`) exige `reservado` o `vendido`, e `iniciar` solo mira el estado. Aumentar el precio de un `confirmado` y rebalancear deja una deuda que da 409 al cobrarla, y el viaje puede iniciarse sin el total pagado.
- **Definición (DEC-0026):** EST-Viaje no tiene una transición para esto. Se propone una nueva **T11 `confirmado → vendido` (automática)**: cuando el plan de pagos o la economía de un `confirmado` dejan saldo, el viaje vuelve a `vendido` en la misma transacción; y su contracara: al rebalancear un `vendido` con saldo cero y plan balanceado, pasa a `confirmado` (T3). Además, `iniciar` exige saldo cero y plan balanceado. Desde `en_curso` no se retrocede: ahí la deuda nueva se cobra con el viaje `en_curso` (también a decidir). Requiere `DEC-` y actualizar EST-Viaje.
- **Alcance:**
  1. Viaje `confirmado` (precio 100, cobrado 100) → precio 150 y rebalanceo con un pago de 50 → el viaje queda `vendido`.
  2. Sobre ese viaje, cobrar el pago de 50 → 200 y el viaje pasa a `confirmado`.
  3. Iniciar un viaje con saldo distinto de cero o con el plan descalzado → 409.
  4. Viaje `confirmado` → bajar el precio sin tocar el plan → sigue `confirmado`, con la advertencia `plan_desbalanceado`, y no se puede iniciar hasta rebalancear.
  5. Todo en la transacción del pedido, con el viaje bloqueado (como el cobro).

### H-03 · Confirmado (bloqueante)
`FichaViaje.tsx:67` calcula `editable = usuario.rol !== "freelance" && …` y lo pasa a `PlanDePagos` e `ItinerarioViaje`; el backend (`politicas._escribe_operacion`) deja escribir al responsable, sea cual sea su rol. El freelance responsable no ve los controles de cobro ni del plan.
- **Alcance:**
  1. Freelance responsable de un viaje `reservado` con un pago pendiente → ve «Registrar cobro» y puede ajustar el plan y el itinerario.
  2. Freelance responsable → la economía sigue en solo lectura (pantalla 43, T-102).
  3. Usuario que no es responsable ni admin ni dueño (freelance o empleado) → plan, cobros e itinerario en solo lectura.
  4. Admin o dueño → todo editable; viaje `finalizado` o `cancelado` → nada editable.
- **Menor, fuera del alcance (a consultar):** el punto 3 también cambia lo que ve un **empleado** que no es responsable: hoy la web le muestra todo editable y la API le devuelve 403.

### H-04 · Confirmado (importante)
`PlanDePagos.pagos` tiene `min_length=1` (`src/backend/rumbo/presentacion/esquemas/economia.py:58`), pero en un rebalanceo esa lista son solo los pagos nuevos. Con lo cobrado igual al precio no se puede rebalancear: `{"pagos": []}` da 422.
- **Alcance:**
  1. Viaje de 100 con 50 cobrado y 50 pendiente → precio 50 y `PUT …/pagos` con `{"pagos": []}` → 200, el pendiente queda `anulado` y su alerta resuelta.
  2. Ese mismo rebalanceo deja el viaje `vendido` en `confirmado` (lo que se decida en H-02).
  3. `{"pagos": []}` sin cobros que sumen el precio → 422.
  4. El contrato y los tipos de `@rumbo/shared` admiten la lista vacía; el editor web permite guardar un rebalanceo sin pagos nuevos cuando lo cobrado cubre el precio.
- Se arregla en la misma rama que H-02 (misma zona y misma reconciliación).

### H-05 · Confirmado (importante)
`BuscadorHoteles.tsx:26` pide `por_pagina: 100` y filtra en el cliente; `GET /hoteles` (`routers/hoteles.py:97`) no tiene filtro por nombre.
- **Alcance:**
  1. `GET /hoteles?nombre=…` filtra por nombre sin distinguir mayúsculas, combinado con `destino_id` y el resto de los filtros.
  2. Con 101 hoteles activos en el destino, el que queda 101.º por nombre aparece al buscarlo en el buscador del itinerario y se puede elegir.
  3. El buscador manda el texto a la API (con espera entre teclas) y sigue acotado al destino del viaje.
  4. Contrato, tipos y mock MSW de `GET /hoteles` admiten el filtro.

### Plan de arreglo
| Rama | Hallazgos | Review |
|---|---|---|
| `fix/M6-tipo-de-cambio` | H-01 | `reviewer-seguridad` (dinero) + aprobación de otro integrante · PR [#170](https://github.com/FranLuciano04/Vault-Rumbo/pull/170), abierto el 01/11/26 |
| `fix/M6-estado-con-deuda-nueva` | H-02, H-04 | `reviewer-seguridad` (dinero y estados) + aprobación de otro integrante |
| `fix/M6-cobro-del-freelance` | H-03 | `reviewer-seguridad` (permisos) + aprobación de otro integrante |
| `fix/M6-buscar-hotel-por-nombre` | H-05 | `reviewer-ticket` |
