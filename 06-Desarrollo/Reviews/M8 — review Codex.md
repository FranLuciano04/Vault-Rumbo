---
tipo: referencia
estado: formalizado
responsable: Codex
modulo: M8
actualizado: 05/11/26
---
# M8 — review Codex

## Resumen
Revisados los diffs de los diez merges del pedido y sus versiones históricas, sin tomar código posterior como implementación del módulo. Se encontraron un hallazgo bloqueante y dos importantes: exposición de rentabilidad, pérdida de filtros al navegar y un período inicial dependiente de la zona horaria del navegador.
La revisión fue estática, con reproducción aislada del desfase horario; no se ejecutó la suite de integración ni e2e. Los casos ya conocidos del pedido quedan excluidos.

## Hallazgos

### H-01 · La API entrega ganancia y margen a empleado y freelance
- **Severidad:** bloqueante
- **Ubicación:** `src/backend/rumbo/presentacion/routers/dashboard.py:85` (merge `e4fb17a`; el comportamiento persiste en `e8a6313` y `40db989`).
- **Ticket relacionado:** entre T-121 y T-126
- **Trazabilidad:** CU-21 A1, RF-129, DEC-0008; criterio explícito del punto 1 del pedido de review: empleado y freelance no deben ver ganancia ni margen.
- **Problema:** el router serializa `ganancia_estimada` y `margen` para todos los roles. La web oculta la tarjeta mediante `veAgencia`, pero los valores quedan disponibles en la respuesta HTTP. Acotar las filas al actor no cumple la restricción sobre estos campos. CU-21 y DEC-0008 describen la vista propia; la prohibición específica de entregar ambos indicadores se toma del pedido de review.
- **Escenario:** un empleado o freelance con un viaje visible de ARS 300.000 y costo ARS 200.000 consulta `/api/dashboard` para el período de creación. Recibe ganancia `100000` y margen `0.3333`, aunque su pantalla los oculta. El test `test_rf129_acotado_por_rol_ve_solo_lo_suyo` de `e8a6313` incluso exige esos valores en vez de verificar su ocultamiento.
- **Arreglo sugerido:** aplicar la restricción de campos en el backend antes de serializar, definir su representación no autorizada en el contrato y alinear tipos y mocks. Agregar una comprobación de la respuesta HTTP para ambos roles que impida entregar ganancia y margen, conservando sus comisiones permitidas.

### H-02 · Los contadores navegan sin los filtros de su detalle
- **Severidad:** importante
- **Ubicación:** `src/apps/web/src/features/dashboard/PaginaDashboard.tsx:188` (merge `a2ee195`; contrato de detalles incorporado por `e8a6313`).
- **Ticket relacionado:** entre T-122 y T-126
- **Trazabilidad:** CU-21 paso 5, RF-128.
- **Problema:** «Presupuestos abiertos» y «Reservas confirmadas» enlazan a rutas fijas sin consumir `data.detalles`. El backend proporciona los estados `cotizada` y `confirmado`, junto con los filtros de propiedad que soporta cada listado. Las pantallas destino tampoco inicializan sus filtros a partir de la navegación. No se trata de las excepciones aceptadas para «Consultas pendientes» y «Viajes activos».
- **Escenario:** la dueña tiene una reserva confirmada y otros viajes reservados o cancelados. Pulsa «Reservas confirmadas: 1» y ve todos los viajes. Si selecciona un responsable y pulsa «Presupuestos abiertos», también pierde ese alcance y vuelve al embudo general.
- **Arreglo sugerido:** construir la navegación con los detalles provistos por la API y hacer que las pantallas destino apliquen los filtros recibidos. Verificar el recorrido completo con registros de estados y responsables diferentes, no solo el `href`.

### H-03 · Reportes elige el mes según la zona horaria del navegador
- **Severidad:** importante
- **Ubicación:** `src/apps/web/src/features/reportes/PaginaReportes.tsx:27` (merge `e285efd`).
- **Ticket relacionado:** T-127
- **Trazabilidad:** CU-22 paso 1 y A1, RF-131, DEC-0024 punto 3; punto 3 del pedido de review.
- **Problema:** `mesEnCurso()` usa `getFullYear()` y `getMonth()` locales. La web envía ese período explícitamente, reemplazando el mes por defecto calculado en Argentina por el backend. La consulta y la exportación pueden quedar en un mes distinto del dashboard y del calendario.
- **Escenario:** en un navegador configurado en UTC, a las `2026-12-01T01:00:00Z` todavía es 30/11 en Buenos Aires. Al abrir Reportes, la web consulta del 01/12 al 31/12 y exporta diciembre; el mes de negocio vigente es noviembre. La reproducción aislada con Node y zona UTC devuelve mes local `12` y fecha argentina `2026-11-30`.
- **Arreglo sugerido:** usar la fecha de Buenos Aires, como hace el calendario, o tomar el período por defecto de la respuesta del backend. Cubrir un cambio de mes con navegador en otra zona horaria y comprobar también los filtros enviados a la descarga.

## Triage de Claude

> Triage del 05/11/26, verificado contra el código y el vault.

### H-01 · La API entrega ganancia y margen a empleado y freelance
- **Resultado:** no confirmado como falla. Decisión pendiente del equipo.
- **Motivo:**
  - La prohibición sale de una frase del pedido de review («que empleado y freelance no vean ganancia, margen ni comisiones ajenas»), escrita por Claude sin respaldo en el vault. El propio hallazgo lo aclara.
  - RF-129 y CU-21 A1 le dan al empleado «su propio embudo e indicadores», y DEC-0008 solo le niega al freelance «la rentabilidad global de la agencia». La API entrega lo propio, no lo global.
  - `GET /viajes/{id}` ya devuelve `ganancia` y `margen`, y `FichaViaje` los muestra sin distinguir rol. El empleado los lee de toda la agencia (DEC-0005) y el freelance, de sus viajes. Sacarlos del dashboard no los protegería.
  - Lo que sí es cierto: la web oculta esa tarjeta a empleado y freelance, siguiendo las pantallas 46 y 47, y la API la entrega igual. Es una decisión de presentación, no una regla de seguridad.
- **Si el equipo quiere restringirlo:** es una regla nueva que abarca dashboard y viajes, y va en una `DEC-`.

### H-02 · Los contadores navegan sin los filtros de su detalle
- **Resultado:** confirmado. Importante.
- **Motivo:** `PaginaDashboard` no usa `data.detalles` y sus rutas son fijas. `PaginaViajes` y `PaginaOportunidades` guardan sus filtros en `useState` y no leen la URL. Incumple RF-128.
- **Alcance:**
  - «Reservas confirmadas» abre `/viajes` con el estado `confirmado` aplicado.
  - «Presupuestos abiertos» abre `/oportunidades` mostrando solo `cotizada`.
  - Si la dirección eligió un responsable, «Presupuestos abiertos» y «Consultas pendientes» conservan ese `responsable_id`, y «Alertas pendientes» su `propietario_id`.
  - Para el empleado, los contadores llevan a «lo mío» (`mios`).
  - Las pantallas destino sin parámetros en la URL se comportan como hoy.

### H-03 · Reportes elige el mes según la zona horaria del navegador
- **Resultado:** confirmado. Importante.
- **Motivo:** `mesEnCurso()` usa `getFullYear()` y `getMonth()` locales. `hoyEnBuenosAires()` ya existe en `@rumbo/shared`.
- **Alcance:**
  - Con el navegador en UTC a las `2026-12-01T01:00:00Z`, Reportes consulta del 2026-11-01 al 2026-11-30.
  - La descarga usa ese mismo período.
- **Menor, a consultar:** `FormularioResena.tsx:37` usa la fecha local del mismo modo. Está fuera de M8.
