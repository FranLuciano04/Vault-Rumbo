---
tipo: analisis
estado: en-revision
modulo: [clientes, cotizaciones, viajes, economia, alertas, configuracion, hoteles, redes, dashboard, calendario, seguridad]
responsable: Nahuel
pc: pc1
actualizado: 21/09/26
---
# Requisitos funcionales y no funcionales

tags:: #tipo/analisis #estado/en-revision #pc/pc1 #accion/revisar

> Catálogo de requisitos de Rumbo. Los **requisitos funcionales (RF)** se obtuvieron por **ingeniería inversa** desde los 31 casos de uso ya especificados: cada RF nace de un paso del flujo principal, un flujo alternativo, una precondición, una postcondición o una regla explícita de su caso de uso, y declara de cuál. Los **requisitos no funcionales (RNF)** no se derivan de los casos de uso: salen del relevamiento, de las decisiones de arquitectura y del alcance acordado.
>
> **Nada de este catálogo agrega funcionalidad nueva.** Si un requisito no estaba escrito en el vault, no está acá: los huecos se listan al final, en *Requisitos no funcionales todavía sin definir* y *Requisitos con dependencias abiertas*.

## Cómo se derivó este catálogo

1. Se recorrieron los 31 casos de uso de [[MOC — Casos de uso]] de punta a punta.
2. De cada uno se extrajo **qué debe hacer el sistema**, separando la capacidad funcional del guion de interacción del caso de uso.
3. Cuando dos casos de uso describen la misma capacidad, se escribió **un solo RF** y ambos lo referencian en la matriz de trazabilidad (por ejemplo, la generación de alertas por requisito de destino, que [[CU-07 Confirmar reserva]] dispara y [[CU-15 Configurar recordatorios por destino]] configura).
4. [[CU-01 De la consulta a la venta]] es el **flujo núcleo** y no genera requisitos propios: compone los de los casos de uso atómicos.
5. Los RNF se tomaron de [[Relevamiento — Fuente de verdad]], [[Relevamiento — respuestas de la agencia (17-09)]], [[Alcance y fuera de alcance]], [[ARQ — Vista general]] y las decisiones de stack, roles y autenticación del proyecto; cada RNF cita su fuente puntual.

## Convenciones de este catálogo

- **Identificación:** `RF-###` correlativo, agrupado por módulo; `RNF-##` para los no funcionales. El número no se reutiliza: si un requisito se retira, su ID queda vacante.
- **Origen:** caso de uso del que se derivó y el punto exacto (paso del flujo principal o flujo alternativo `A#`).
- **Tipo:** *alta/baja/modificación* · *consulta* · *validación* · *cálculo* · *automático* (lo ejecuta el sistema sin intervención) · *seguridad*.
- **Prioridad:** derivada con un criterio explícito, porque el vault no registra prioridades de negocio —
  **alta** = el requisito pertenece al flujo principal de su caso de uso;
  **media** = proviene de un flujo alternativo, una validación o una corrección;
  **baja** = el vault lo marca como opcional, futuro o de conveniencia.
  Los 31 casos de uso son todos de alcance PC1, así que la prioridad ordena el trabajo dentro de PC1, no decide qué entra.
- **Actor:** el rol que dispara el requisito, según [[Actores]]. *Sistema* cuando no lo dispara una persona.

## Índice por módulo

| # | Módulo | Requisitos | Casos de uso de origen |
|---|---|---|---|
| 1 | Clientes | RF-001 → RF-009 | CU-02, CU-03 |
| 2 | Oportunidades y cotización | RF-010 → RF-031 | CU-04, CU-05, CU-06, CU-30 |
| 3 | Viajes | RF-032 → RF-053 | CU-07, CU-08, CU-09, CU-27 |
| 4 | Economía y pagos | RF-054 → RF-072 | CU-10, CU-11, CU-12 |
| 5 | Alertas | RF-073 → RF-082 | CU-14, CU-28 |
| 6 | Configuración y catálogos | RF-083 → RF-096 | CU-13, CU-15, CU-26, CU-31 |
| 7 | Catálogo de hoteles | RF-097 → RF-112 | CU-16, CU-17, CU-18, CU-29 |
| 8 | Redes | RF-113 → RF-122 | CU-19, CU-20 |
| 9 | Dashboard y reportes | RF-123 → RF-135 | CU-21, CU-22 |
| 10 | Calendario | RF-136 → RF-139 | CU-23 |
| 11 | Usuarios, seguridad y transversales | RF-140 → RF-153 | CU-24, CU-25 |

**Total: 153 requisitos funcionales y 13 requisitos no funcionales.**

# 1. Clientes

> Casos de uso de origen: [[CU-02 Registrar cliente]] y [[CU-03 Gestionar ficha del cliente]]. El [[Cliente]] es la memoria del negocio: no es un [[Usuario]] y no opera el sistema.

#### RF-001 — Registrar un cliente nuevo
- **Descripción:** el sistema permite dar de alta un [[Cliente]] con nombre, datos de contacto (teléfono/WhatsApp, Instagram, email), segmento (familia · amigos · individual · pareja), preferencias y, opcionalmente, un asesor asignado.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** alta
- **Origen:** [[CU-02 Registrar cliente]] — pasos 2 y 4
- **Entidades:** [[Cliente]] · [[Usuario]]

#### RF-002 — Validar los datos mínimos del cliente
- **Descripción:** el sistema exige nombre y al menos un contacto válido (teléfono/WhatsApp o email), tanto en el alta como en la edición. Si faltan, no guarda y pide completarlos; en la edición conserva los datos previos.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** alta
- **Origen:** [[CU-02 Registrar cliente]] — paso 3, A3 · [[CU-03 Gestionar ficha del cliente]] — paso 4, A2
- **Entidades:** [[Cliente]]

#### RF-003 — Detectar posibles clientes duplicados
- **Descripción:** al registrar un [[Cliente]], el sistema busca fichas con el mismo contacto o un nombre muy similar; si encuentra alguna, lo advierte y ofrece abrir la ficha existente en lugar de crear una nueva.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** media
- **Origen:** [[CU-02 Registrar cliente]] — paso 3, A1
- **Entidades:** [[Cliente]]

#### RF-004 — Dar de alta un cliente desde una consulta
- **Descripción:** el sistema permite crear la ficha del [[Cliente]] con los datos mínimos en el medio del registro de una consulta, para completarla más tarde sin interrumpir la atención.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** media
- **Origen:** [[CU-02 Registrar cliente]] — A2 · [[CU-04 Registrar consulta]] — paso 2, A1
- **Entidades:** [[Cliente]] · [[Oportunidad]]

#### RF-005 — Buscar un cliente y abrir su ficha
- **Descripción:** el sistema permite buscar un [[Cliente]] por nombre o por contacto y abrir su ficha. Si la búsqueda no arroja resultados, ofrece darlo de alta.
- **Actor:** empleado · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-03 Gestionar ficha del cliente]] — paso 1, A1
- **Entidades:** [[Cliente]]

#### RF-006 — Mostrar el historial del cliente
- **Descripción:** la ficha muestra, además de los datos, el segmento y las preferencias, el historial del [[Cliente]]: sus [[Oportunidad|Oportunidades]], [[Viaje|Viajes]] y [[Reseña|Reseñas]].
- **Actor:** empleado · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-03 Gestionar ficha del cliente]] — paso 2, A3
- **Entidades:** [[Cliente]] · [[Oportunidad]] · [[Viaje]] · [[Reseña]]

#### RF-007 — Editar la ficha del cliente
- **Descripción:** el sistema permite modificar nombre, contacto, segmento, preferencias y asesor asignado. Cualquier empleado autenticado puede editar la ficha; no hay campos restringidos por rol.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** alta
- **Origen:** [[CU-03 Gestionar ficha del cliente]] — pasos 3 y 5
- **Entidades:** [[Cliente]] · [[Usuario]]

#### RF-008 — Conservar la ficha del cliente
- **Descripción:** el sistema no permite eliminar ni archivar un [[Cliente]]: la ficha solo se consulta y se edita, para no perder la memoria del cliente. El [[Cliente]] no tiene estado.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** alta
- **Origen:** [[CU-03 Gestionar ficha del cliente]] — reglas de negocio y postcondiciones
- **Entidades:** [[Cliente]]

#### RF-009 — Ofrecer la vista personal de clientes
- **Descripción:** el asesor asignado de un [[Cliente]] habilita la vista personal "mis clientes" y marca responsabilidad, sin restringir el acceso del resto de la agencia, que lo ve y lo edita igual.
- **Actor:** empleado · **Tipo:** consulta · **Prioridad:** media
- **Origen:** [[CU-02 Registrar cliente]] — paso 2 y postcondiciones
- **Entidades:** [[Cliente]] · [[Usuario]]

# 2. Oportunidades y cotización

> Casos de uso de origen: [[CU-04 Registrar consulta]], [[CU-05 Seguir oportunidad]], [[CU-06 Emitir cotización]] y [[CU-30 Sugerir recontacto de clientes]]. La consulta del cliente se modela como [[Oportunidad]] y recorre el embudo `nueva · en_gestión · cotizada · ganada · perdida`.

#### RF-010 — Registrar una consulta como oportunidad
- **Descripción:** el sistema crea una [[Oportunidad]] en estado `nueva` a partir de una consulta entrante, registrando canal (Instagram · WhatsApp · presencial), destino tentativo, fechas tentativas, cantidad de pasajeros y notas, asociada al [[Cliente]] y al empleado que la registra como responsable.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** alta
- **Origen:** [[CU-04 Registrar consulta]] — pasos 3 y 4
- **Entidades:** [[Oportunidad]] · [[Cliente]] · [[Usuario]]

#### RF-011 — Identificar al cliente de la consulta
- **Descripción:** antes de crear la [[Oportunidad]], el sistema exige identificar al [[Cliente]], buscándolo en la base o creándolo en el momento.
- **Actor:** empleado · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-04 Registrar consulta]] — paso 2, A1
- **Entidades:** [[Cliente]] · [[Oportunidad]]

#### RF-012 — Advertir una oportunidad abierta del mismo cliente
- **Descripción:** si el [[Cliente]] ya tiene una [[Oportunidad]] abierta, el sistema lo advierte y ofrece retomarla en lugar de crear una nueva.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** media
- **Origen:** [[CU-04 Registrar consulta]] — A2
- **Entidades:** [[Oportunidad]] · [[Cliente]]

#### RF-013 — Guardar una oportunidad con datos mínimos
- **Descripción:** el sistema permite guardar la [[Oportunidad]] en estado `nueva` con lo mínimo (canal y cliente) y completar el resto de los datos más tarde.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** media
- **Origen:** [[CU-04 Registrar consulta]] — A3
- **Entidades:** [[Oportunidad]]

#### RF-014 — Registrar interacciones de seguimiento
- **Descripción:** el sistema permite registrar interacciones y notas de seguimiento sobre una [[Oportunidad]] (qué se habló y cuáles son los próximos pasos), junto con su contexto: [[Cliente]], destino, fechas y [[Cotización|Cotizaciones]] emitidas.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** alta
- **Origen:** [[CU-05 Seguir oportunidad]] — pasos 1 y 3
- **Entidades:** [[Oportunidad]] · [[Cliente]] · [[Cotización]]

#### RF-015 — Agendar una insistencia
- **Descripción:** el sistema crea una [[Alerta]] de tipo `insistencia` para volver a contactar al cliente en una cantidad de días indicada por el empleado.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** alta
- **Origen:** [[CU-05 Seguir oportunidad]] — paso 4
- **Entidades:** [[Alerta]] · [[Oportunidad]]

#### RF-016 — Gestionar el estado de la oportunidad
- **Descripción:** el sistema administra el ciclo `nueva · en_gestión · cotizada · ganada · perdida`: la [[Oportunidad]] pasa a `en_gestión` cuando el empleado empieza a atenderla y a `cotizada` al emitirse una [[Cotización]].
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** alta
- **Origen:** [[CU-05 Seguir oportunidad]] — pasos 2 y 5, reglas de negocio
- **Entidades:** [[Oportunidad]] · [[Cotización]]

#### RF-017 — Cerrar la oportunidad
- **Descripción:** el sistema permite cerrar la [[Oportunidad]] como `ganada` —con o sin [[Cotización]] formal previa— o como `perdida`, exigiendo en este último caso un motivo de una lista fija: precio · fechas/disponibilidad · desistió · compró en otra agencia · sin respuesta · otro (con texto libre). El motivo queda en el historial para el embudo y los reportes.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** alta
- **Origen:** [[CU-05 Seguir oportunidad]] — paso 6, A2, A4
- **Entidades:** [[Oportunidad]]

#### RF-018 — Resolver las insistencias al cerrar la oportunidad
- **Descripción:** al cerrarse una [[Oportunidad]], el sistema resuelve automáticamente sus [[Alerta|Alertas]] de insistencia pendientes.
- **Actor:** sistema · **Tipo:** automático · **Prioridad:** alta
- **Origen:** [[CU-05 Seguir oportunidad]] — paso 7
- **Entidades:** [[Alerta]] · [[Oportunidad]]

#### RF-019 — Reagendar una insistencia sin respuesta
- **Descripción:** si vence la insistencia y el cliente no respondió, el sistema la reagenda o permite al empleado reprogramar un nuevo contacto.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** media
- **Origen:** [[CU-05 Seguir oportunidad]] — A1
- **Entidades:** [[Alerta]] · [[Oportunidad]]

#### RF-020 — Reactivar una oportunidad perdida
- **Descripción:** si un cliente que había desistido retoma el contacto, el sistema permite reabrir la [[Oportunidad]] `perdida`, que vuelve al estado `en_gestión`, o registrar una consulta nueva.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** media
- **Origen:** [[CU-05 Seguir oportunidad]] — A3
- **Entidades:** [[Oportunidad]]

#### RF-021 — Emitir una cotización desde plantilla
- **Descripción:** el sistema genera una [[Cotización]] a partir de una plantilla y un formulario donde el empleado carga la moneda de la operación (ARS/USD) y los ítems o conceptos (aéreo, alojamiento, traslados, excursiones) con sus precios; el sistema calcula el total, produce el documento y lo guarda en estado `borrador`. Los precios los carga el empleado: es un cotizador asistido, sin integración con proveedores.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** alta
- **Origen:** [[CU-06 Emitir cotización]] — pasos 1, 2 y 3, reglas de negocio
- **Entidades:** [[Cotización]] · [[Oportunidad]]

#### RF-022 — Calcular la vigencia de la cotización
- **Descripción:** al emitirse, el sistema calcula la fecha de vigencia (`validez_hasta`) de la [[Cotización]] aplicando un parámetro configurable por el administrador, con valor por defecto de un mes desde la emisión.
- **Actor:** sistema · **Tipo:** cálculo · **Prioridad:** media
- **Origen:** [[CU-06 Emitir cotización]] — paso 3
- **Entidades:** [[Cotización]]

#### RF-023 — Registrar el envío de la cotización
- **Descripción:** el sistema permite marcar la [[Cotización]] como `enviada` y la asocia a la [[Oportunidad]], que pasa a `cotizada`. El envío al cliente ocurre fuera del sistema, por WhatsApp o email.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** alta
- **Origen:** [[CU-06 Emitir cotización]] — pasos 4 y 5
- **Entidades:** [[Cotización]] · [[Oportunidad]]

#### RF-024 — Versionar las cotizaciones
- **Descripción:** una [[Oportunidad]] admite varias [[Cotización|Cotizaciones]]. Cuando el cliente pide cambios, el sistema permite generar una versión nueva y reenviarla, conservando las anteriores en el historial.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** media
- **Origen:** [[CU-06 Emitir cotización]] — A1, reglas de negocio
- **Entidades:** [[Cotización]] · [[Oportunidad]]

#### RF-025 — Registrar la aceptación o el rechazo de la cotización
- **Descripción:** el sistema permite marcar la [[Cotización]] como `aceptada` —lo que habilita confirmar la reserva— o como `rechazada`, con lo que el seguimiento continúa o la [[Oportunidad]] se cierra como perdida.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** alta
- **Origen:** [[CU-06 Emitir cotización]] — A2, A3
- **Entidades:** [[Cotización]] · [[Oportunidad]] · [[Viaje]]

#### RF-026 — Vencer automáticamente las cotizaciones enviadas
- **Descripción:** un proceso automático pasa a `vencida` toda [[Cotización]] `enviada` cuya vigencia expiró sin respuesta del cliente; los precios dejan de sostenerse y para retomar hay que emitir una cotización nueva. Los `borrador` no vencen y la [[Oportunidad]] no cambia de estado.
- **Actor:** sistema · **Tipo:** automático · **Prioridad:** media
- **Origen:** [[CU-06 Emitir cotización]] — A5
- **Entidades:** [[Cotización]]

#### RF-027 — Detectar clientes fieles inactivos
- **Descripción:** el sistema evalúa periódicamente el historial de cada [[Cliente]] y detecta a los candidatos a recontacto: los que llevan aproximadamente seis meses sin una nueva compra o viaje —umbral configurable— y no tienen marcado el opt-out. El criterio aplica a todos los clientes, identificando especialmente a los recurrentes (dos o más [[Viaje|Viajes]] con la agencia).
- **Actor:** sistema · **Tipo:** automático · **Prioridad:** alta
- **Origen:** [[CU-30 Sugerir recontacto de clientes]] — paso 1, reglas de negocio
- **Entidades:** [[Cliente]] · [[Viaje]]

#### RF-028 — Sugerir el recontacto
- **Descripción:** para cada candidato, el sistema genera una [[Alerta]] de tipo `recontacto` o lo lista en un panel de clientes a recontactar, y muestra el contexto del [[Cliente]] (último viaje, preferencias, historial). El sistema sugiere; el contacto lo hace una persona, sin envío automático.
- **Actor:** sistema · **Tipo:** automático · **Prioridad:** alta
- **Origen:** [[CU-30 Sugerir recontacto de clientes]] — pasos 2 y 3, reglas de negocio
- **Entidades:** [[Alerta]] · [[Cliente]]

#### RF-029 — Registrar la decisión sobre la sugerencia
- **Descripción:** el empleado resuelve la sugerencia recontactando —típicamente registrando una consulta nueva, que saca al cliente de la lista de inactivos—, posponiéndola para más adelante o marcando el opt-out; el sistema registra la acción y resuelve o actualiza la [[Alerta]].
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** alta
- **Origen:** [[CU-30 Sugerir recontacto de clientes]] — pasos 4 y 5, A2, A3
- **Entidades:** [[Alerta]] · [[Cliente]] · [[Oportunidad]]

#### RF-030 — Excluir clientes del recontacto
- **Descripción:** el sistema permite marcar un [[Cliente]] como `no_recontactar`, con lo que deja de aparecer como candidato en las sugerencias de recontacto.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** media
- **Origen:** [[CU-30 Sugerir recontacto de clientes]] — A1, reglas de negocio
- **Entidades:** [[Cliente]]

#### RF-031 — Generar segmentos comerciales de clientes
- **Descripción:** el sistema permite agrupar [[Cliente|Clientes]] en segmentos para acciones comerciales dirigidas, por destino o producto (Brasil, Caribe, Europa, cruceros, viajes nacionales) o por tipo (familias, parejas). La segmentación se modela con etiquetas libres, múltiples y combinables.
- **Actor:** empleado · **Tipo:** consulta · **Prioridad:** media
- **Origen:** [[CU-30 Sugerir recontacto de clientes]] — reglas de negocio
- **Entidades:** [[Cliente]]

# 3. Viajes

> Casos de uso de origen: [[CU-07 Confirmar reserva]], [[CU-08 Gestionar estado del viaje]], [[CU-09 Armar itinerario de hoteles]] y [[CU-27 Cancelar viaje]]. El [[Viaje]] recorre el ciclo `reservado → vendido → confirmado → en curso → finalizado`, más `cancelado`.

#### RF-032 — Confirmar la reserva creando el viaje
- **Descripción:** desde una [[Oportunidad]] `ganada`, el sistema crea el [[Viaje]] en estado `reservado` con destino del catálogo, fechas de salida y regreso, categoría y responsable, vinculado al [[Cliente]] y a la [[Oportunidad]] de origen, que queda cerrada como ganada. La reserva también puede confirmarse sin [[Cotización]] formal previa.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** alta
- **Origen:** [[CU-07 Confirmar reserva]] — pasos 1, 2 y 3, A1
- **Entidades:** [[Viaje]] · [[Oportunidad]] · [[Cliente]] · [[Destino]] · [[Usuario]]

#### RF-033 — Exigir destino y fechas para confirmar la reserva
- **Descripción:** si faltan el destino o las fechas, el sistema no confirma el [[Viaje]] y pide completarlos.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** alta
- **Origen:** [[CU-07 Confirmar reserva]] — A3
- **Entidades:** [[Viaje]] · [[Destino]]

#### RF-034 — Generar las alertas de requisitos del destino
- **Descripción:** al crearse o confirmarse un [[Viaje]], el sistema genera automáticamente una [[Alerta]] de tipo `formulario` por cada [[RequisitoDestino]] activo del destino, con la anticipación configurada en cada requisito. Si el destino no tiene requisitos configurados, no genera ninguna.
- **Actor:** sistema · **Tipo:** automático · **Prioridad:** alta
- **Origen:** [[CU-07 Confirmar reserva]] — paso 4, A2 · [[CU-15 Configurar recordatorios por destino]] — paso 5
- **Entidades:** [[Alerta]] · [[RequisitoDestino]] · [[Viaje]] · [[Destino]]

#### RF-035 — Generar la alerta de próxima salida
- **Descripción:** al confirmarse la reserva, el sistema genera una [[Alerta]] de tipo `salida` con aviso previo a la fecha de salida del [[Viaje]]. La anticipación es un parámetro de configuración global, con valor por defecto de siete días.
- **Actor:** sistema · **Tipo:** automático · **Prioridad:** alta
- **Origen:** [[CU-07 Confirmar reserva]] — paso 4
- **Entidades:** [[Alerta]] · [[Viaje]]

#### RF-036 — Encadenar la economía y el plan de cuotas
- **Descripción:** al confirmar la reserva, el sistema encadena el registro del control económico y la definición del plan de cuotas con su seña, y ofrece armar el itinerario de hoteles. El [[Viaje]] no queda cerrado sin su economía y su plan cargados.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** alta
- **Origen:** [[CU-07 Confirmar reserva]] — paso 5 y postcondiciones
- **Entidades:** [[Viaje]] · [[Pago]]

#### RF-037 — Consultar la situación del viaje
- **Descripción:** el sistema muestra, en la ficha del [[Viaje]], su estado actual, el itinerario, la economía y el checklist de pagos con el porcentaje pagado.
- **Actor:** empleado · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-08 Gestionar estado del viaje]] — paso 1
- **Entidades:** [[Viaje]] · [[Pago]] · [[Hotel]]

#### RF-038 — Avanzar el estado del viaje por el cobro
- **Descripción:** el sistema pasa el [[Viaje]] de `reservado` a `vendido` al cobrarse la seña y de `vendido` a `confirmado` al saldarse el total. Son transiciones automáticas disparadas por el cobro, no acciones manuales.
- **Actor:** sistema · **Tipo:** automático · **Prioridad:** alta
- **Origen:** [[CU-08 Gestionar estado del viaje]] — paso 2, reglas de negocio · [[CU-12 Registrar cobro de un pago]] — A0, A2
- **Entidades:** [[Viaje]] · [[Pago]]

#### RF-039 — Sugerir el avance a en curso y finalizado
- **Descripción:** el sistema sugiere el paso a `en curso` y a `finalizado` según las fechas de salida y regreso, pero exige que el empleado lo confirme y nunca lo fuerza: si el regreso se demora, el viaje se mantiene `en curso` aunque la fecha ya haya pasado.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** alta
- **Origen:** [[CU-08 Gestionar estado del viaje]] — paso 3, A1, reglas de negocio
- **Entidades:** [[Viaje]]

#### RF-040 — Propagar el cambio de estado del viaje
- **Descripción:** al registrarse un cambio de estado, el sistema actualiza las vistas dependientes: el calendario de viajes y vencimientos y el dashboard.
- **Actor:** sistema · **Tipo:** automático · **Prioridad:** media
- **Origen:** [[CU-08 Gestionar estado del viaje]] — paso 4
- **Entidades:** [[Viaje]] · [[Alerta]] · [[Pago]]

#### RF-041 — Agendar la reseña post-viaje
- **Descripción:** al pasar el [[Viaje]] a `finalizado`, el sistema habilita la post-venta agendando una [[Alerta]] de tipo `reseña`.
- **Actor:** sistema · **Tipo:** automático · **Prioridad:** alta
- **Origen:** [[CU-08 Gestionar estado del viaje]] — paso 5
- **Entidades:** [[Alerta]] · [[Viaje]] · [[Reseña]]

#### RF-042 — Corregir el estado del viaje cargado por error
- **Descripción:** el sistema permite retroceder el [[Viaje]] al estado inmediato anterior cuando se cargó por error, siempre que el retroceso sea coherente y el viaje no esté `finalizado` ni `cancelado`.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** media
- **Origen:** [[CU-08 Gestionar estado del viaje]] — A2
- **Entidades:** [[Viaje]]

#### RF-043 — Armar el itinerario de hoteles
- **Descripción:** el sistema permite asociar [[Hotel|Hoteles]] del catálogo al [[Viaje]], cargando por cada tramo el check-in, el check-out, el orden dentro del itinerario y, opcionalmente, la fecha de vencimiento de pago al proveedor. Un [[Viaje]] puede no tener hoteles (solo aéreo, excursión o crucero), en cuyo caso el itinerario queda vacío.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** alta
- **Origen:** [[CU-09 Armar itinerario de hoteles]] — pasos 2, 3 y 4, A1, A2
- **Entidades:** [[Viaje]] · [[Hotel]]

#### RF-044 — Repetir un hotel en varios tramos
- **Descripción:** el sistema admite el mismo [[Hotel]] en más de un tramo del mismo [[Viaje]], incluso no consecutivos, y trata cada tramo como un registro propio con su check-in, check-out, orden y vencimiento de pago al proveedor.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** media
- **Origen:** [[CU-09 Armar itinerario de hoteles]] — A5, reglas de negocio
- **Entidades:** [[Viaje]] · [[Hotel]]

#### RF-045 — Generar la alerta de vencimiento de pago a proveedor
- **Descripción:** cuando un tramo del itinerario tiene cargada una fecha de vencimiento de pago al proveedor, el sistema genera una [[Alerta]] de tipo `pago` un mes antes de esa fecha.
- **Actor:** sistema · **Tipo:** automático · **Prioridad:** alta
- **Origen:** [[CU-09 Armar itinerario de hoteles]] — paso 5, reglas de negocio
- **Entidades:** [[Alerta]] · [[Hotel]] · [[Viaje]]

#### RF-046 — Editar o quitar un tramo del itinerario
- **Descripción:** el sistema permite modificar las fechas o el orden de un tramo, o quitar un [[Hotel]] del itinerario, reagendando o cerrando la [[Alerta]] de pago asociada.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** media
- **Origen:** [[CU-09 Armar itinerario de hoteles]] — A3
- **Entidades:** [[Viaje]] · [[Hotel]] · [[Alerta]]

#### RF-047 — Registrar el pago al proveedor
- **Descripción:** el sistema permite marcar el pago al proveedor de un tramo como realizado, y resuelve su [[Alerta]] de vencimiento.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** alta
- **Origen:** [[CU-09 Armar itinerario de hoteles]] — A4
- **Entidades:** [[Hotel]] · [[Viaje]] · [[Alerta]]

#### RF-048 — Cancelar un viaje
- **Descripción:** el sistema permite cancelar un [[Viaje]] en estado `reservado`, `vendido`, `confirmado` o `en curso`, registrando el motivo y la fecha de cancelación, y pasándolo a `cancelado`. El viaje permanece en el historial: la baja es lógica, nunca se elimina.
- **Actor:** empleado · **Tipo:** baja · **Prioridad:** alta
- **Origen:** [[CU-27 Cancelar viaje]] — precondiciones, pasos 1, 2, 3 y 6
- **Entidades:** [[Viaje]] · [[Cliente]]

#### RF-049 — Impedir la cancelación de un viaje finalizado
- **Descripción:** si el [[Viaje]] ya está `finalizado`, el sistema impide cancelarlo.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** alta
- **Origen:** [[CU-27 Cancelar viaje]] — A1
- **Entidades:** [[Viaje]]

#### RF-050 — Anular los pagos y cerrar las alertas al cancelar
- **Descripción:** al cancelarse un [[Viaje]], el sistema pasa a `anulado` todos sus [[Pago|Pagos]] no cobrados —tanto `pendiente` como `vencido`— como baja lógica que los vuelve no exigibles pero conserva el registro, y resuelve las [[Alerta|Alertas]] vigentes del viaje.
- **Actor:** sistema · **Tipo:** automático · **Prioridad:** alta
- **Origen:** [[CU-27 Cancelar viaje]] — paso 4
- **Entidades:** [[Pago]] · [[Alerta]] · [[Viaje]]

#### RF-051 — Registrar el efecto de la cancelación sobre la comisión
- **Descripción:** si el [[Viaje]] se cancela antes de empezar (`reservado`, `vendido` o `confirmado`), el sistema deja constancia de que la comisión proyectada no se realiza. Si el [[Viaje]] estaba `en curso`, el servicio ya se prestó: la cancelación es una interrupción, la comisión del vendedor se mantiene y los cobros registrados quedan como están, con lo que la suma de los pagos pasa a reflejar lo efectivamente cobrado.
- **Actor:** sistema · **Tipo:** automático · **Prioridad:** alta
- **Origen:** [[CU-27 Cancelar viaje]] — paso 5, A4, reglas de negocio
- **Entidades:** [[Viaje]] · [[Pago]] · [[Usuario]]

#### RF-052 — Informar los cobros ya registrados al cancelar
- **Descripción:** si el [[Viaje]] tiene [[Pago|Pagos]] ya cobrados, el sistema informa el importe cobrado y documenta el saldo. Los reembolsos y las penalidades quedan fuera de alcance: el sistema registra, no procesa devoluciones.
- **Actor:** sistema · **Tipo:** consulta · **Prioridad:** media
- **Origen:** [[CU-27 Cancelar viaje]] — A2
- **Entidades:** [[Viaje]] · [[Pago]]

#### RF-053 — Revertir la cancelación de un viaje
- **Descripción:** si la cancelación fue un error y el [[Viaje]] no está `finalizado`, el sistema permite reactivarlo: vuelve al estado que tenía justo antes de cancelarse, sus [[Pago|Pagos]] vuelven a `pendiente` o `vencido` según su fecha y sus [[Alerta|Alertas]] se reabren.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** media
- **Origen:** [[CU-27 Cancelar viaje]] — A3
- **Entidades:** [[Viaje]] · [[Pago]] · [[Alerta]]

# 4. Economía y pagos

> Casos de uso de origen: [[CU-10 Registrar economía del viaje]], [[CU-11 Definir plan de cuotas]] y [[CU-12 Registrar cobro de un pago]]. El modelo económico está fijado en [[RN-01 Comisión automática]]: `ganancia = precioVenta − costo`, `margen% = ganancia / precioVenta` y comisión del vendedor como concepto separado.

#### RF-054 — Registrar la economía del viaje
- **Descripción:** el sistema permite cargar, para cada [[Viaje]], la moneda de la operación (ARS o USD), el [[Operador]] proveedor, el precio de venta, el costo, el vendedor y su comisión, expresada como importe fijo o porcentaje.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** alta
- **Origen:** [[CU-10 Registrar economía del viaje]] — pasos 1 a 4 y 6
- **Entidades:** [[Viaje]] · [[Operador]] · [[Usuario]]

#### RF-055 — Calcular la ganancia y el margen
- **Descripción:** el sistema calcula automáticamente la ganancia como precio de venta menos costo, y el margen porcentual como ganancia sobre precio de venta. Ambos quedan disponibles para el dashboard y los reportes.
- **Actor:** sistema · **Tipo:** cálculo · **Prioridad:** alta
- **Origen:** [[CU-10 Registrar economía del viaje]] — paso 5, postcondiciones · [[RN-01 Comisión automática]]
- **Entidades:** [[Viaje]]

#### RF-056 — Precargar y sobrescribir la comisión del vendedor
- **Descripción:** el sistema precarga la comisión del vendedor con el valor por defecto configurado para esa persona y permite editarla para ese [[Viaje]] puntual; el override prevalece sobre el default y se conserva para la liquidación.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** alta
- **Origen:** [[CU-10 Registrar economía del viaje]] — paso 4, A1
- **Entidades:** [[Viaje]] · [[Usuario]]

#### RF-057 — Registrar un viaje sin vendedor
- **Descripción:** el sistema admite [[Viaje|Viajes]] sin vendedor asignado (venta directa de la agencia): la comisión queda en cero y solo se registran ganancia y margen.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** media
- **Origen:** [[CU-10 Registrar economía del viaje]] — A2
- **Entidades:** [[Viaje]] · [[Usuario]]

#### RF-058 — Advertir ganancia y margen negativos
- **Descripción:** si el costo supera el precio de venta, el sistema advierte que la ganancia y el margen son negativos, pero permite guardar, porque es un dato de gestión válido.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** media
- **Origen:** [[CU-10 Registrar economía del viaje]] — A3
- **Entidades:** [[Viaje]]

#### RF-059 — Exigir el rebalanceo del plan al cambiar el precio de venta
- **Descripción:** si se modifica el precio de venta de un [[Viaje]] que ya tiene plan de [[Pago|Pagos]], el sistema advierte que el plan quedó descalzado y exige rebalancear los pagos pendientes hasta volver a cumplir que su suma iguale el precio de venta, antes de confirmar el cambio.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** alta
- **Origen:** [[CU-10 Registrar economía del viaje]] — A4 · [[CU-11 Definir plan de cuotas]] — A5
- **Entidades:** [[Viaje]] · [[Pago]]

#### RF-060 — Definir el plan de pagos del viaje
- **Descripción:** el sistema permite definir la cantidad de cuotas y, opcionalmente, una seña inicial, cargando por cada [[Pago]] su monto en la moneda de referencia del [[Viaje]], su tipo (seña · cuota · saldo) y su vencimiento.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** alta
- **Origen:** [[CU-11 Definir plan de cuotas]] — pasos 1, 2 y 3
- **Entidades:** [[Viaje]] · [[Pago]]

#### RF-061 — Validar que el plan iguale el precio de venta
- **Descripción:** el sistema valida que la suma de los [[Pago|Pagos]] no anulados del plan coincida con el precio de venta del [[Viaje]], en su moneda de referencia. Si no coincide, rechaza el guardado y muestra la diferencia hasta que se corrija.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** alta
- **Origen:** [[CU-11 Definir plan de cuotas]] — paso 4, A1, reglas de negocio
- **Entidades:** [[Pago]] · [[Viaje]]

#### RF-062 — Crear los pagos en estado pendiente
- **Descripción:** el sistema guarda todos los [[Pago|Pagos]] del plan en estado `pendiente`.
- **Actor:** sistema · **Tipo:** automático · **Prioridad:** alta
- **Origen:** [[CU-11 Definir plan de cuotas]] — paso 5
- **Entidades:** [[Pago]]

#### RF-063 — Generar la alerta de vencimiento de cada pago
- **Descripción:** el sistema genera una [[Alerta]] de vencimiento por cada [[Pago]] del plan, con aviso un mes antes de la fecha.
- **Actor:** sistema · **Tipo:** automático · **Prioridad:** alta
- **Origen:** [[CU-11 Definir plan de cuotas]] — paso 6
- **Entidades:** [[Alerta]] · [[Pago]]

#### RF-064 — Crear un pago único cuando no hay cuotas
- **Descripción:** si el [[Viaje]] se paga de una vez, el sistema crea un único [[Pago]] de tipo `saldo` por el total.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** media
- **Origen:** [[CU-11 Definir plan de cuotas]] — A2
- **Entidades:** [[Pago]]

#### RF-065 — Reprogramar un pago no cobrado
- **Descripción:** mientras un [[Pago]] no esté cobrado ni anulado —es decir, `pendiente` o `vencido`—, el sistema permite editar su monto o su vencimiento y reagenda su [[Alerta]]. Si estaba `vencido` y la fecha nueva es futura, vuelve a `pendiente`.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** alta
- **Origen:** [[CU-11 Definir plan de cuotas]] — A3
- **Entidades:** [[Pago]] · [[Alerta]]

#### RF-066 — Anular un pago del plan
- **Descripción:** mientras el [[Pago]] no esté cobrado, el sistema permite anularlo: lo pasa a estado `anulado` como baja lógica que conserva el registro, cierra su [[Alerta]] y vuelve a exigir que la suma de los pagos no anulados iguale el precio de venta.
- **Actor:** empleado · **Tipo:** baja · **Prioridad:** alta
- **Origen:** [[CU-11 Definir plan de cuotas]] — A4
- **Entidades:** [[Pago]] · [[Alerta]] · [[Viaje]]

#### RF-067 — Registrar el cobro de un pago
- **Descripción:** el sistema permite marcar un [[Pago]] `pendiente` o `vencido` como cobrado, registrando la fecha efectiva y la forma de pago, y lo pasa a estado `pagado`, resolviendo su [[Alerta]] de vencimiento. El sistema registra el cobro; no procesa pagos online.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** alta
- **Origen:** [[CU-12 Registrar cobro de un pago]] — precondiciones, pasos 1 a 4, A1
- **Entidades:** [[Pago]] · [[Alerta]] · [[Viaje]]

#### RF-068 — Registrar el cobro en otra moneda
- **Descripción:** al cobrar, el sistema permite indicar la moneda real del cobro (ARS o USD). Si difiere de la moneda de referencia del [[Viaje]], exige el tipo de cambio del día y calcula el monto cobrado real. Un mismo viaje puede cobrarse parte en ARS y parte en USD.
- **Actor:** empleado · **Tipo:** cálculo · **Prioridad:** alta
- **Origen:** [[CU-12 Registrar cobro de un pago]] — paso 2, reglas de negocio
- **Entidades:** [[Pago]] · [[Viaje]]

#### RF-069 — Actualizar el saldo y el porcentaje pagado
- **Descripción:** tras cada cobro, el sistema actualiza el saldo pendiente del [[Viaje]] —suma de los montos planificados de los pagos no cobrados, en la moneda de referencia—, el porcentaje pagado del total y el checklist de pagos.
- **Actor:** sistema · **Tipo:** cálculo · **Prioridad:** alta
- **Origen:** [[CU-12 Registrar cobro de un pago]] — paso 5
- **Entidades:** [[Viaje]] · [[Pago]]

#### RF-070 — Revertir un cobro registrado por error
- **Descripción:** el sistema permite revertir un cobro: el [[Pago]] vuelve a `pendiente` o `vencido` según su fecha, su [[Alerta]] se reabre y, si el [[Viaje]] había pasado a `confirmado` por saldo cero, vuelve a `vendido`.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** media
- **Origen:** [[CU-12 Registrar cobro de un pago]] — A3
- **Entidades:** [[Pago]] · [[Alerta]] · [[Viaje]]

#### RF-071 — Capturar la forma de pago al cobrar
- **Descripción:** la forma de pago se captura en el momento del cobro, no al definir el plan, y alimenta el reporte de formas de pago utilizadas.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** media
- **Origen:** [[CU-12 Registrar cobro de un pago]] — paso 2, reglas de negocio
- **Entidades:** [[Pago]]

#### RF-072 — Cobrar cada pago de forma íntegra
- **Descripción:** el [[Pago]] es indivisible: se cobra completo, sin cobros parciales. Un esquema de cobro distinto se modela cambiando el plan de cuotas, no partiendo un pago.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** alta
- **Origen:** [[CU-12 Registrar cobro de un pago]] — nota de revisión del responsable, 10/09
- **Entidades:** [[Pago]]

# 5. Alertas

> Casos de uso de origen: [[CU-14 Ver y atender alertas del día]] y [[CU-28 Crear recordatorio manual]]. La mayoría de las [[Alerta|Alertas]] las genera el sistema desde otros módulos; este módulo las consolida en una agenda y permite crearlas a mano.

#### RF-073 — Clasificar las alertas por tipo
- **Descripción:** el sistema clasifica cada [[Alerta]] según su origen, con los tipos `pago`, `formulario`, `salida`, `insistencia`, `reseña`, `manual` y `recontacto`, y ofrece la acción correspondiente a cada uno.
- **Actor:** sistema · **Tipo:** automático · **Prioridad:** alta
- **Origen:** [[CU-14 Ver y atender alertas del día]] — paso 4
- **Entidades:** [[Alerta]]

#### RF-074 — Listar la agenda de alertas vigentes
- **Descripción:** el sistema lista las [[Alerta|Alertas]] vigentes —las que están en estado `pendiente`, incluidas las que ya pasaron su fecha—, ordenadas por fecha y filtradas por propietario. Si no hay ninguna, muestra el día sin pendientes. El atraso es un criterio de orden y filtro de la vista, no un estado de la [[Alerta]].
- **Actor:** empleado · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-14 Ver y atender alertas del día]] — pasos 1 y 2, A3
- **Entidades:** [[Alerta]] · [[Usuario]]

#### RF-075 — Mostrar el contexto de una alerta
- **Descripción:** al abrir una [[Alerta]], el sistema muestra el registro que la originó: el [[Viaje]], el [[Pago]] o la [[Oportunidad]] asociada.
- **Actor:** empleado · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-14 Ver y atender alertas del día]] — paso 3
- **Entidades:** [[Alerta]] · [[Viaje]] · [[Pago]] · [[Oportunidad]]

#### RF-076 — Marcar una alerta como vista o resuelta
- **Descripción:** el sistema permite marcar la [[Alerta]] como `vista` o como `resuelta` una vez atendida.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** alta
- **Origen:** [[CU-14 Ver y atender alertas del día]] — paso 5, postcondiciones
- **Entidades:** [[Alerta]]

#### RF-077 — Posponer una alerta
- **Descripción:** el sistema permite reprogramar la fecha de una [[Alerta]] a un día posterior.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** media
- **Origen:** [[CU-14 Ver y atender alertas del día]] — A4
- **Entidades:** [[Alerta]]

#### RF-078 — Mostrar la agenda de toda la empresa a los roles de gestión
- **Descripción:** para los roles `admin` y `dueño`, el sistema muestra las [[Alerta|Alertas]] de toda la empresa y no solo la cartera propia.
- **Actor:** admin · **Tipo:** consulta · **Prioridad:** media
- **Origen:** [[CU-14 Ver y atender alertas del día]] — A1, reglas de negocio
- **Entidades:** [[Alerta]] · [[Usuario]]

#### RF-079 — Resolver la alerta al atenderse su origen
- **Descripción:** cuando la acción que la [[Alerta]] pedía se ejecuta en su módulo —por ejemplo, al registrarse el cobro de un [[Pago]]—, el sistema la resuelve solo, sin que el empleado tenga que cerrarla a mano.
- **Actor:** sistema · **Tipo:** automático · **Prioridad:** alta
- **Origen:** [[CU-14 Ver y atender alertas del día]] — A2
- **Entidades:** [[Alerta]] · [[Pago]]

#### RF-080 — Crear un recordatorio manual
- **Descripción:** el sistema permite crear una [[Alerta]] de tipo `manual` con fecha y descripción de la tarea, en estado `pendiente`, que aparece en la agenda del día. El recordatorio pertenece al empleado que lo creó.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** alta
- **Origen:** [[CU-28 Crear recordatorio manual]] — pasos 1, 2, 4 y 5, reglas de negocio
- **Entidades:** [[Alerta]] · [[Usuario]]

#### RF-081 — Asociar el recordatorio manual a un registro
- **Descripción:** el sistema permite asociar opcionalmente el recordatorio manual a un [[Viaje]], un [[Cliente]] o una [[Oportunidad]]; si no se asocia a nada, queda como tarea suelta del empleado.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** media
- **Origen:** [[CU-28 Crear recordatorio manual]] — paso 3, A1
- **Entidades:** [[Alerta]] · [[Viaje]] · [[Cliente]] · [[Oportunidad]]

#### RF-082 — Editar un recordatorio pendiente
- **Descripción:** mientras la [[Alerta]] manual esté `pendiente`, el sistema permite cambiar su fecha o su descripción.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** media
- **Origen:** [[CU-28 Crear recordatorio manual]] — A2
- **Entidades:** [[Alerta]]

# 6. Configuración y catálogos

> Casos de uso de origen: [[CU-13 Configurar porcentaje de comisión]], [[CU-15 Configurar recordatorios por destino]], [[CU-26 Gestionar destinos]] y [[CU-31 Gestionar operadores]]. Es el módulo de parámetros de negocio y catálogos compartidos; su actor es `admin`, con `dueño` habilitado.

#### RF-083 — Definir la comisión por defecto de un vendedor
- **Descripción:** el sistema permite fijar, por vendedor o freelance, la comisión con la que se precargan sus [[Viaje|Viajes]]: un importe fijo o un porcentaje, que se calcula sobre la ganancia.
- **Actor:** admin · **Tipo:** modificación · **Prioridad:** alta
- **Origen:** [[CU-13 Configurar porcentaje de comisión]] — pasos 1, 2 y 4
- **Entidades:** [[Usuario]] · [[Viaje]]

#### RF-084 — Validar el valor de la comisión por defecto
- **Descripción:** el sistema valida que el importe no sea negativo y que el porcentaje esté entre 0 y 100; si el valor es inválido o no numérico, lo rechaza y conserva el anterior.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** alta
- **Origen:** [[CU-13 Configurar porcentaje de comisión]] — paso 3, A1
- **Entidades:** [[Usuario]]

#### RF-085 — Aplicar el cambio de comisión solo a los viajes nuevos
- **Descripción:** el nuevo valor por defecto se aplica a los [[Viaje|Viajes]] que ese vendedor registre a partir de entonces; el sistema no recalcula los ya registrados.
- **Actor:** sistema · **Tipo:** automático · **Prioridad:** alta
- **Origen:** [[CU-13 Configurar porcentaje de comisión]] — paso 5
- **Entidades:** [[Usuario]] · [[Viaje]]

#### RF-086 — Definir los requisitos de un destino
- **Descripción:** el sistema permite definir, por destino, uno o más [[RequisitoDestino|requisitos]] a recordar, con nombre, tipo (visa · vacunación · documentación · seguro · formulario · otro), carácter obligatorio o recomendado, una descripción o instrucciones opcional y la anticipación en días antes de la salida.
- **Actor:** admin · **Tipo:** alta · **Prioridad:** alta
- **Origen:** [[CU-15 Configurar recordatorios por destino]] — pasos 1 a 4
- **Entidades:** [[RequisitoDestino]] · [[Destino]]

#### RF-087 — Editar un requisito sin reescribir alertas emitidas
- **Descripción:** el sistema aplica la modificación de un [[RequisitoDestino]] a los [[Viaje|Viajes]] futuros, sin reescribir las [[Alerta|Alertas]] ya emitidas.
- **Actor:** admin · **Tipo:** modificación · **Prioridad:** media
- **Origen:** [[CU-15 Configurar recordatorios por destino]] — A1
- **Entidades:** [[RequisitoDestino]] · [[Alerta]]

#### RF-088 — Dar de baja un requisito de destino
- **Descripción:** el sistema permite la baja lógica de un [[RequisitoDestino]], que deja de generar su [[Alerta]] en los viajes nuevos y conserva el registro.
- **Actor:** admin · **Tipo:** baja · **Prioridad:** media
- **Origen:** [[CU-15 Configurar recordatorios por destino]] — A3
- **Entidades:** [[RequisitoDestino]]

#### RF-089 — Gestionar el catálogo de destinos
- **Descripción:** el sistema ofrece el alta, la modificación y la baja de [[Destino|Destinos]] del catálogo compartido, con nombre y, opcionalmente, país o región y notas, y lista los existentes.
- **Actor:** admin · **Tipo:** alta/baja/modificación · **Prioridad:** alta
- **Origen:** [[CU-26 Gestionar destinos]] — pasos 1 a 6
- **Entidades:** [[Destino]]

#### RF-090 — Impedir destinos duplicados
- **Descripción:** si el nombre del destino ya existe en el catálogo, el sistema rechaza el alta.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** media
- **Origen:** [[CU-26 Gestionar destinos]] — A1
- **Entidades:** [[Destino]]

#### RF-091 — Aplicar baja lógica a un destino en uso
- **Descripción:** si hay [[Viaje|Viajes]], [[Hotel|Hoteles]] o requisitos asociados a un destino, el sistema impide su baja física y aplica una baja lógica que conserva el historial.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** alta
- **Origen:** [[CU-26 Gestionar destinos]] — A2, reglas de negocio
- **Entidades:** [[Destino]] · [[Viaje]] · [[Hotel]] · [[RequisitoDestino]]

#### RF-092 — Reactivar un destino
- **Descripción:** el sistema permite reactivar un [[Destino]] dado de baja lógica.
- **Actor:** admin · **Tipo:** modificación · **Prioridad:** baja
- **Origen:** [[CU-26 Gestionar destinos]] — A3
- **Entidades:** [[Destino]]

#### RF-093 — Gestionar el catálogo de operadores
- **Descripción:** el sistema ofrece el alta, la modificación y la baja de [[Operador|Operadores]] o proveedores del catálogo compartido, con nombre y, opcionalmente, contacto o ejecutivo de cuentas, y lista los existentes.
- **Actor:** admin · **Tipo:** alta/baja/modificación · **Prioridad:** alta
- **Origen:** [[CU-31 Gestionar operadores]] — pasos 1 a 6
- **Entidades:** [[Operador]]

#### RF-094 — Impedir operadores duplicados
- **Descripción:** si el nombre del operador ya existe en el catálogo, el sistema rechaza el alta.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** media
- **Origen:** [[CU-31 Gestionar operadores]] — A1
- **Entidades:** [[Operador]]

#### RF-095 — Aplicar baja lógica a un operador en uso
- **Descripción:** si hay [[Viaje|Viajes]] asociados a un operador, el sistema impide su baja física y aplica una baja lógica que conserva el historial y los reportes.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** alta
- **Origen:** [[CU-31 Gestionar operadores]] — A2, reglas de negocio
- **Entidades:** [[Operador]] · [[Viaje]]

#### RF-096 — Reactivar un operador
- **Descripción:** el sistema permite reactivar un [[Operador]] dado de baja lógica.
- **Actor:** admin · **Tipo:** modificación · **Prioridad:** baja
- **Origen:** [[CU-31 Gestionar operadores]] — A3
- **Entidades:** [[Operador]]

# 7. Catálogo de hoteles

> Casos de uso de origen: [[CU-16 Gestionar hotel en catálogo]], [[CU-17 Registrar reseña de hotel]], [[CU-18 Buscar y recomendar hoteles]] y [[CU-29 Eliminar reseña]]. El catálogo es compartido por toda la agencia y alimenta la recomendación al cliente.

#### RF-097 — Dar de alta y editar un hotel
- **Descripción:** el sistema permite crear un [[Hotel]] en el catálogo compartido, o abrir uno existente para editarlo, con nombre, destino (ciudad o país) y categoría (estrellas o tipo). El catálogo lo gestiona cualquier empleado, sin restricción por rol.
- **Actor:** empleado · **Tipo:** alta/modificación · **Prioridad:** alta
- **Origen:** [[CU-16 Gestionar hotel en catálogo]] — pasos 1, 2, 4 y 5, A1, postcondiciones
- **Entidades:** [[Hotel]] · [[Destino]]

#### RF-098 — Validar los datos mínimos del hotel
- **Descripción:** el sistema exige nombre y destino; si falta alguno, no guarda y pide completarlos.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** alta
- **Origen:** [[CU-16 Gestionar hotel en catálogo]] — paso 3, A3
- **Entidades:** [[Hotel]]

#### RF-099 — Detectar hoteles duplicados
- **Descripción:** si ya existe un [[Hotel]] con el mismo nombre y destino, el sistema lo advierte y ofrece abrir el existente en lugar de crear uno nuevo.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** media
- **Origen:** [[CU-16 Gestionar hotel en catálogo]] — paso 3, A2
- **Entidades:** [[Hotel]]

#### RF-100 — Dar de baja un hotel
- **Descripción:** la baja de un [[Hotel]] que dejó de operar es siempre lógica: el sistema lo marca como cerrado y lo oculta del catálogo activo, pero lo conserva. Nunca se elimina físicamente, para no perder historial ni trazabilidad.
- **Actor:** empleado · **Tipo:** baja · **Prioridad:** alta
- **Origen:** [[CU-16 Gestionar hotel en catálogo]] — A4
- **Entidades:** [[Hotel]]

#### RF-101 — Registrar una reseña de hotel
- **Descripción:** el sistema permite cargar la [[Reseña]] de un [[Cliente]] sobre un [[Hotel]], con puntaje de 1 a 5, comentario y fecha; nace en estado `publicada` y pasa a alimentar el catálogo y la recomendación.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** alta
- **Origen:** [[CU-17 Registrar reseña de hotel]] — pasos 1 a 5
- **Entidades:** [[Reseña]] · [[Cliente]] · [[Hotel]]

#### RF-102 — Asociar la reseña al viaje de origen
- **Descripción:** el sistema permite vincular opcionalmente la [[Reseña]] al [[Viaje]] del que surgió, para trazabilidad; si no se vincula, el campo queda vacío.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** media
- **Origen:** [[CU-17 Registrar reseña de hotel]] — paso 2, A1, A2
- **Entidades:** [[Reseña]] · [[Viaje]]

#### RF-103 — Validar la reseña
- **Descripción:** el sistema exige un puntaje entero entre 1 y 5 y la presencia del [[Cliente]] y del [[Hotel]]; si algo no cumple, no guarda y pide corregir.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** alta
- **Origen:** [[CU-17 Registrar reseña de hotel]] — paso 4, A3, reglas de negocio
- **Entidades:** [[Reseña]]

#### RF-104 — Admitir varias reseñas del mismo cliente sobre el mismo hotel
- **Descripción:** un mismo [[Cliente]] puede dejar varias [[Reseña|Reseñas]] sobre el mismo [[Hotel]], correspondientes a estadías distintas.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** media
- **Origen:** [[CU-17 Registrar reseña de hotel]] — reglas de negocio
- **Entidades:** [[Reseña]] · [[Cliente]] · [[Hotel]]

#### RF-105 — Editar una reseña
- **Descripción:** el sistema permite corregir una [[Reseña]] ya cargada. No se elimina físicamente: la baja es una moderación que la deja oculta.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** media
- **Origen:** [[CU-17 Registrar reseña de hotel]] — reglas de negocio
- **Entidades:** [[Reseña]]

#### RF-106 — Buscar hoteles del catálogo
- **Descripción:** el sistema permite filtrar el catálogo de [[Hotel|Hoteles]] por destino, categoría, rango de precio y servicios, y lista los que coinciden. Es una consulta de solo lectura: no modifica el catálogo.
- **Actor:** empleado · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-18 Buscar y recomendar hoteles]] — pasos 1 y 2, postcondiciones
- **Entidades:** [[Hotel]]

#### RF-107 — Calcular el puntaje promedio del hotel
- **Descripción:** el sistema calcula el puntaje promedio de cada [[Hotel]] a partir de sus [[Reseña|Reseñas]] y lo muestra en el listado. El promedio se calcula, no se almacena como atributo.
- **Actor:** sistema · **Tipo:** cálculo · **Prioridad:** alta
- **Origen:** [[CU-18 Buscar y recomendar hoteles]] — paso 2, reglas de negocio
- **Entidades:** [[Hotel]] · [[Reseña]]

#### RF-108 — Ver el detalle del hotel y sus reseñas
- **Descripción:** el sistema permite abrir un [[Hotel]] del resultado para ver su detalle y las [[Reseña|Reseñas]] que recibió, y usar eso para recomendar al [[Cliente]] al cotizar o al armar el itinerario.
- **Actor:** empleado · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-18 Buscar y recomendar hoteles]] — pasos 3 y 4
- **Entidades:** [[Hotel]] · [[Reseña]]

#### RF-109 — Ordenar los resultados por valoración
- **Descripción:** el sistema permite ordenar la lista de [[Hotel|Hoteles]] por puntaje promedio, para priorizar los mejor valorados.
- **Actor:** empleado · **Tipo:** consulta · **Prioridad:** media
- **Origen:** [[CU-18 Buscar y recomendar hoteles]] — A2
- **Entidades:** [[Hotel]] · [[Reseña]]

#### RF-110 — Ofrecer alternativas cuando no hay resultados
- **Descripción:** si ningún [[Hotel]] coincide con los filtros, el sistema ofrece ampliarlos o dar de alta un hotel nuevo.
- **Actor:** sistema · **Tipo:** consulta · **Prioridad:** media
- **Origen:** [[CU-18 Buscar y recomendar hoteles]] — A1
- **Entidades:** [[Hotel]]

#### RF-111 — Ocultar una reseña
- **Descripción:** el sistema permite al administrador dar de baja una [[Reseña]] inapropiada o errónea indicando el motivo: aplica una baja lógica que la deja oculta, deja de mostrarse en el catálogo y deja de contar para la recomendación, conservando el registro. La eliminación física es excepcional y solo si no rompe la integridad referencial.
- **Actor:** admin · **Tipo:** baja · **Prioridad:** alta
- **Origen:** [[CU-29 Eliminar reseña]] — pasos 1 a 4, A2, reglas de negocio
- **Entidades:** [[Reseña]] · [[Hotel]]

#### RF-112 — Restaurar una reseña oculta
- **Descripción:** el sistema permite al administrador revertir una baja y devolver la [[Reseña]] al estado publicada.
- **Actor:** admin · **Tipo:** modificación · **Prioridad:** baja
- **Origen:** [[CU-29 Eliminar reseña]] — A1
- **Entidades:** [[Reseña]]

# 8. Redes

> Casos de uso de origen: [[CU-19 Planificar contenido en redes]] y [[CU-20 Generar propuesta de contenido con IA]]. El sistema planifica y asiste, pero no publica: la publicación en la red la hace una persona.

#### RF-113 — Crear una pieza de contenido
- **Descripción:** el sistema permite crear una pieza de [[ContenidoRed]] con título o idea, canal (Instagram · TikTok · canal de ventas de WhatsApp) y fecha de publicación programada; nace en la columna `idea` del tablero.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** alta
- **Origen:** [[CU-19 Planificar contenido en redes]] — pasos 1 y 2
- **Entidades:** [[ContenidoRed]]

#### RF-114 — Mover la pieza por el tablero kanban
- **Descripción:** el sistema permite mover la pieza entre las columnas `idea`, `en producción`, `listo` y `publicado`, en las dos direcciones: una pieza `listo` que hay que rehacer vuelve a `en producción`.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** alta
- **Origen:** [[CU-19 Planificar contenido en redes]] — pasos 3 y 5, A5
- **Entidades:** [[ContenidoRed]]

#### RF-115 — Editar y reprogramar una pieza
- **Descripción:** el sistema permite modificar el título, el canal o la fecha de una pieza; al cambiar la fecha, el calendario de publicaciones se actualiza.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** media
- **Origen:** [[CU-19 Planificar contenido en redes]] — paso 4, A2
- **Entidades:** [[ContenidoRed]]

#### RF-116 — Consultar el calendario de publicaciones
- **Descripción:** el sistema muestra un calendario con las publicaciones programadas, junto al tablero kanban.
- **Actor:** empleado · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-19 Planificar contenido en redes]] — paso 4, postcondiciones
- **Entidades:** [[ContenidoRed]]

#### RF-117 — Descartar una pieza de contenido
- **Descripción:** el sistema permite descartar una idea que no va más, desde cualquier columna previa a `publicado`. Es una baja lógica: la pieza se conserva, no se borra.
- **Actor:** empleado · **Tipo:** baja · **Prioridad:** media
- **Origen:** [[CU-19 Planificar contenido en redes]] — A4
- **Entidades:** [[ContenidoRed]]

#### RF-118 — No publicar automáticamente en las redes
- **Descripción:** el sistema organiza y planifica el contenido, pero no publica por sí mismo en ninguna red. El paso a `publicado` lo hace el empleado después de haber publicado manualmente.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** alta
- **Origen:** [[CU-19 Planificar contenido en redes]] — A3, reglas de negocio
- **Entidades:** [[ContenidoRed]]

#### RF-119 — Generar borradores de contenido con IA
- **Descripción:** el sistema permite pedir a la IA uno o varios borradores de texto o idea para una pieza, indicando el tema o destino, el canal y el tono u objetivo. Puede invocarse desde cero o desde una pieza ya creada en el tablero.
- **Actor:** empleado · **Tipo:** alta · **Prioridad:** alta
- **Origen:** [[CU-20 Generar propuesta de contenido con IA]] — pasos 1, 2 y 3, A3
- **Entidades:** [[ContenidoRed]]

#### RF-120 — Limitar el contexto entregado a la IA
- **Descripción:** la IA genera usando únicamente lo que indicó el empleado (tema, canal y tono). El sistema no le da acceso a datos del negocio: ni clientes, ni catálogo, ni ventas.
- **Actor:** sistema · **Tipo:** seguridad · **Prioridad:** alta
- **Origen:** [[CU-20 Generar propuesta de contenido con IA]] — paso 3
- **Entidades:** [[ContenidoRed]]

#### RF-121 — Revisar y guardar el borrador generado
- **Descripción:** el sistema exige que una persona revise y edite el borrador antes de guardarlo; el elegido se guarda en una pieza de [[ContenidoRed]] en la columna `idea` o `en producción`.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** alta
- **Origen:** [[CU-20 Generar propuesta de contenido con IA]] — pasos 4 y 5, postcondiciones
- **Entidades:** [[ContenidoRed]]

#### RF-122 — Regenerar o descartar la propuesta
- **Descripción:** si el borrador no convence, el sistema permite ajustar el tema o el tono y pedir otra propuesta; si ninguna sirve, no se guarda nada.
- **Actor:** empleado · **Tipo:** modificación · **Prioridad:** media
- **Origen:** [[CU-20 Generar propuesta de contenido con IA]] — A1, A2
- **Entidades:** [[ContenidoRed]]

# 9. Dashboard y reportes

> Casos de uso de origen: [[CU-21 Ver dashboard y embudo]] y [[CU-22 Generar reportes y estadísticas]]. Los indicadores y las métricas se derivan de los datos operativos: se calculan sobre el período, no se almacenan. Ambas vistas son de solo lectura.

#### RF-123 — Mostrar el embudo de ventas
- **Descripción:** el dashboard muestra las [[Oportunidad|Oportunidades]] agrupadas por estado (`nueva · en_gestión · cotizada · ganada · perdida`) y la tasa de conversión.
- **Actor:** dueño · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-21 Ver dashboard y embudo]] — paso 2
- **Entidades:** [[Oportunidad]]

#### RF-124 — Mostrar los indicadores económicos y de cobranza
- **Descripción:** el dashboard muestra las ventas del mes con su comparación contra meses anteriores, la ganancia estimada del mes, el total cobrado y el pendiente de cobrar a pasajeros, el pendiente de pagar a operadores y los próximos vencimientos de pagos.
- **Actor:** dueño · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-21 Ver dashboard y embudo]] — paso 3
- **Entidades:** [[Viaje]] · [[Pago]] · [[Operador]]

#### RF-125 — Mostrar los indicadores operativos y de agenda
- **Descripción:** el dashboard muestra la cantidad de pasajeros y viajes próximos a salir, las consultas y presupuestos pendientes de seguimiento, las reservas confirmadas, los presupuestos abiertos y las [[Alerta|Alertas]] de pasajeros próximos a viajar (documentación, pagos y requisitos de ingreso).
- **Actor:** dueño · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-21 Ver dashboard y embudo]] — paso 3
- **Entidades:** [[Viaje]] · [[Oportunidad]] · [[Alerta]]

#### RF-126 — Mostrar la analítica comercial
- **Descripción:** el dashboard muestra los destinos más vendidos, la cantidad de pasajeros por destino, el ticket promedio y las ventas por vendedor o freelance.
- **Actor:** dueño · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-21 Ver dashboard y embudo]] — paso 3
- **Entidades:** [[Viaje]] · [[Destino]] · [[Cliente]] · [[Usuario]]

#### RF-127 — Filtrar el dashboard por período y responsable
- **Descripción:** el sistema permite filtrar el tablero por período y, opcionalmente, por empleado responsable. Si el rango elegido no tiene actividad, el tablero se muestra vacío para ese período.
- **Actor:** dueño · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-21 Ver dashboard y embudo]] — paso 4, A2
- **Entidades:** [[Viaje]] · [[Oportunidad]] · [[Pago]] · [[Usuario]]

#### RF-128 — Navegar desde un indicador a su detalle
- **Descripción:** desde cualquier indicador del dashboard, el sistema permite saltar al detalle correspondiente: el seguimiento de la oportunidad, la gestión del viaje o la agenda de alertas.
- **Actor:** dueño · **Tipo:** consulta · **Prioridad:** media
- **Origen:** [[CU-21 Ver dashboard y embudo]] — paso 5
- **Entidades:** [[Oportunidad]] · [[Viaje]] · [[Alerta]]

#### RF-129 — Acotar el dashboard según el rol
- **Descripción:** el tablero de la empresa completa es de `admin` y `dueño`. El `empleado` ve su propio embudo e indicadores y el `freelance` ve solo lo suyo, por diseño de su visibilidad restringida.
- **Actor:** sistema · **Tipo:** seguridad · **Prioridad:** alta
- **Origen:** [[CU-21 Ver dashboard y embudo]] — A1, reglas de negocio
- **Entidades:** [[Usuario]] · [[Viaje]] · [[Oportunidad]]

#### RF-130 — Calcular los indicadores en vivo
- **Descripción:** los indicadores se derivan de [[Oportunidad]], [[Viaje]], [[Pago]] y [[Cliente]] y se calculan en el momento; no se almacenan. El dashboard no modifica datos: es solo lectura y navegación.
- **Actor:** sistema · **Tipo:** cálculo · **Prioridad:** alta
- **Origen:** [[CU-21 Ver dashboard y embudo]] — reglas de negocio y postcondiciones
- **Entidades:** [[Oportunidad]] · [[Viaje]] · [[Pago]] · [[Cliente]]

#### RF-131 — Generar un reporte del período
- **Descripción:** el sistema genera reportes consolidados eligiendo tipo y período —por defecto, el mes— sobre el catálogo acordado con la agencia: ventas totales del mes; ganancia y rentabilidad; cobrado contra pendiente de cobro; pagos realizados y pendientes a operadores; ventas por destino, por operador y por vendedor con sus comisiones; cantidad de pasajeros; formas de pago utilizadas; y comparación con meses anteriores.
- **Actor:** dueño · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-22 Generar reportes y estadísticas]] — pasos 1 y 2, A1
- **Entidades:** [[Viaje]] · [[Pago]] · [[Oportunidad]] · [[Cliente]] · [[Destino]] · [[Operador]] · [[Usuario]]

#### RF-132 — Visualizar el reporte
- **Descripción:** el sistema muestra el reporte generado con sus métricas y comparativas, en tablas y gráficos.
- **Actor:** dueño · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-22 Generar reportes y estadísticas]] — paso 3
- **Entidades:** [[Viaje]] · [[Pago]]

#### RF-133 — Exportar el reporte
- **Descripción:** el sistema exporta el reporte a Excel como formato principal, para trabajar los datos, y a PDF resumido para visualizar o compartir.
- **Actor:** dueño · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-22 Generar reportes y estadísticas]] — paso 4
- **Entidades:** [[Viaje]] · [[Pago]]

#### RF-134 — Comparar dos períodos
- **Descripción:** el sistema permite contrastar dos períodos, por ejemplo el mes actual contra el anterior.
- **Actor:** dueño · **Tipo:** consulta · **Prioridad:** media
- **Origen:** [[CU-22 Generar reportes y estadísticas]] — A2
- **Entidades:** [[Viaje]] · [[Pago]]

#### RF-135 — Resolver períodos sin datos
- **Descripción:** si el período elegido no tiene actividad, el sistema genera el reporte vacío o avisa que no hay datos.
- **Actor:** sistema · **Tipo:** consulta · **Prioridad:** media
- **Origen:** [[CU-22 Generar reportes y estadísticas]] — A3
- **Entidades:** [[Viaje]] · [[Pago]]

# 10. Calendario

> Caso de uso de origen: [[CU-23 Ver calendario de viajes y vencimientos]]. Es una vista consolidada de fechas de toda la agencia, de solo lectura, con navegación a la gestión de cada ítem.

#### RF-136 — Mostrar el calendario consolidado
- **Descripción:** el sistema ubica por fecha, en un calendario, los [[Viaje|Viajes]] según su rango de salida y regreso, los vencimientos de [[Pago|Pagos]] y las [[Alerta|Alertas]] programadas de toda la agencia. Es una vista de solo lectura: los cambios se hacen en el caso de uso de gestión de cada entidad.
- **Actor:** empleado · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-23 Ver calendario de viajes y vencimientos]] — pasos 1 y 2, postcondiciones
- **Entidades:** [[Viaje]] · [[Pago]] · [[Alerta]]

#### RF-137 — Navegar el calendario por mes, semana y día
- **Descripción:** el sistema permite recorrer el calendario en vistas de mes, semana y día. Si no hay ítems en el rango elegido, se muestra vacío para ese período.
- **Actor:** empleado · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-23 Ver calendario de viajes y vencimientos]] — paso 3, A2
- **Entidades:** [[Viaje]] · [[Pago]] · [[Alerta]]

#### RF-138 — Filtrar el calendario
- **Descripción:** el sistema permite filtrar por tipo de ítem (viajes, pagos o alertas) o por estado, por ejemplo solo pagos pendientes o vencidos, o viajes en curso.
- **Actor:** empleado · **Tipo:** consulta · **Prioridad:** media
- **Origen:** [[CU-23 Ver calendario de viajes y vencimientos]] — A1
- **Entidades:** [[Viaje]] · [[Pago]] · [[Alerta]]

#### RF-139 — Abrir un evento y navegar a su gestión
- **Descripción:** el sistema permite abrir un evento del calendario para ver su detalle y saltar a la gestión correspondiente: el viaje, el pago o la alerta.
- **Actor:** empleado · **Tipo:** consulta · **Prioridad:** alta
- **Origen:** [[CU-23 Ver calendario de viajes y vencimientos]] — paso 4, A3
- **Entidades:** [[Viaje]] · [[Pago]] · [[Alerta]]

# 11. Usuarios, seguridad y requisitos transversales

> Casos de uso de origen: [[CU-24 Iniciar sesión]] y [[CU-25 Gestionar usuarios y roles]]. Los tres últimos requisitos son transversales: no pertenecen a un caso de uso puntual, sino que se aplican a todos los módulos.

#### RF-140 — Autenticar al usuario
- **Descripción:** el sistema valida las credenciales del [[Usuario]] —usuario y contraseña individuales— y abre una sesión. Solo pueden iniciar sesión los usuarios dados de alta y activos.
- **Actor:** empleado · **Tipo:** seguridad · **Prioridad:** alta
- **Origen:** [[CU-24 Iniciar sesión]] — precondiciones, pasos 1, 2 y 3
- **Entidades:** [[Usuario]]

#### RF-141 — Cargar el contexto de trabajo según el rol
- **Descripción:** al abrir la sesión, el sistema carga el alcance de visibilidad del rol: `empleado`, lectura global de [[Cliente|Clientes]], [[Oportunidad|Oportunidades]], [[Viaje|Viajes]] y [[Pago|Pagos]] de toda la agencia con vista personal por defecto y agenda de [[Alerta|Alertas]] propias; `admin` y `dueño`, toda la empresa —incluidas todas las alertas— más configuración y reportes; `freelance`, solo sus clientes, oportunidades, viajes, pagos y comisiones, más el catálogo compartido y sus alertas propias.
- **Actor:** sistema · **Tipo:** seguridad · **Prioridad:** alta
- **Origen:** [[CU-24 Iniciar sesión]] — paso 4, postcondiciones
- **Entidades:** [[Usuario]]

#### RF-142 — Rechazar credenciales inválidas
- **Descripción:** si las credenciales no son válidas, el sistema rechaza el acceso y no abre sesión.
- **Actor:** sistema · **Tipo:** seguridad · **Prioridad:** alta
- **Origen:** [[CU-24 Iniciar sesión]] — A1
- **Entidades:** [[Usuario]]

#### RF-143 — Cerrar la sesión
- **Descripción:** el sistema permite al [[Usuario]] cerrar su sesión y descarta su contexto de trabajo.
- **Actor:** empleado · **Tipo:** seguridad · **Prioridad:** alta
- **Origen:** [[CU-24 Iniciar sesión]] — A3
- **Entidades:** [[Usuario]]

#### RF-144 — Listar y dar de alta usuarios
- **Descripción:** el sistema lista los [[Usuario|Usuarios]] con su rol y su estado, y permite dar de alta uno nuevo con nombre, email, rol (`empleado` · `admin` · `dueño` · `freelance`) y sus credenciales de acceso individuales.
- **Actor:** admin · **Tipo:** alta · **Prioridad:** alta
- **Origen:** [[CU-25 Gestionar usuarios y roles]] — pasos 1, 2, 3 y 5
- **Entidades:** [[Usuario]]

#### RF-145 — Asignar el acceso al módulo de redes
- **Descripción:** el sistema permite asignar a un [[Usuario]] la capacidad de acceder al módulo de redes. No es un rol: es un permiso que se otorga por separado.
- **Actor:** admin · **Tipo:** modificación · **Prioridad:** media
- **Origen:** [[CU-25 Gestionar usuarios y roles]] — paso 4
- **Entidades:** [[Usuario]] · [[ContenidoRed]]

#### RF-146 — Impedir usuarios con email duplicado
- **Descripción:** si el email ya existe en el padrón, el sistema rechaza el alta del [[Usuario]].
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** alta
- **Origen:** [[CU-25 Gestionar usuarios y roles]] — A1
- **Entidades:** [[Usuario]]

#### RF-147 — Editar el rol y los accesos de un usuario
- **Descripción:** el sistema permite cambiar el rol o la capacidad de acceso a redes de un [[Usuario]]; el cambio aplica en su próximo inicio de sesión.
- **Actor:** admin · **Tipo:** modificación · **Prioridad:** alta
- **Origen:** [[CU-25 Gestionar usuarios y roles]] — A2
- **Entidades:** [[Usuario]]

#### RF-148 — Dar de baja lógica un usuario
- **Descripción:** la baja de un [[Usuario]] es lógica: se lo desactiva y se conserva el historial de lo que gestionó. No se elimina físicamente.
- **Actor:** admin · **Tipo:** baja · **Prioridad:** alta
- **Origen:** [[CU-25 Gestionar usuarios y roles]] — A3
- **Entidades:** [[Usuario]]

#### RF-149 — Proteger al último administrador
- **Descripción:** el sistema impide quitar el rol `admin` al último [[Usuario]] que lo tiene, o darlo de baja, para no dejar la empresa sin administración.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** alta
- **Origen:** [[CU-25 Gestionar usuarios y roles]] — A4
- **Entidades:** [[Usuario]]

#### RF-150 — Asignar al freelance los clientes que crea
- **Descripción:** los [[Cliente|Clientes]] creados por un [[Usuario]] con rol `freelance` quedan con él como asesor asignado, coherente con su visibilidad restringida.
- **Actor:** sistema · **Tipo:** automático · **Prioridad:** alta
- **Origen:** [[CU-25 Gestionar usuarios y roles]] — paso 5
- **Entidades:** [[Usuario]] · [[Cliente]]

#### RF-151 — Aplicar la visibilidad por propiedad y rol *(transversal)*
- **Descripción:** el sistema aplica autorización a nivel de fila en todos los módulos, según la matriz de visibilidad del proyecto: lectura global para colaborar, propiedad para responsabilidad y filtro personal, escritura mayormente abierta salvo configuración y moderación, que quedan en `admin`. La [[Alerta]] es personal por defecto y el rol `freelance` es la excepción, con bloqueo de lectura fuera de lo propio.
- **Actor:** sistema · **Tipo:** seguridad · **Prioridad:** alta
- **Origen:** modelo de roles y visibilidad del proyecto ([[DEC-0005 Autenticación y modelo de roles]], [[DEC-0008 Autenticación propia y rol de vendedor freelance]]); aplicado en todos los casos de uso
- **Entidades:** [[Usuario]] · [[Cliente]] · [[Oportunidad]] · [[Viaje]] · [[Pago]] · [[Alerta]]

#### RF-152 — Registrar autor y fecha de cada cambio *(transversal)*
- **Descripción:** el sistema registra quién creó y quién modificó por última vez cada registro, junto con la fecha, para poder identificar quién realizó cada acción dentro del CRM. Un log de acciones completo queda para una fase posterior.
- **Actor:** sistema · **Tipo:** seguridad · **Prioridad:** alta
- **Origen:** requisito de auditoría del negocio: [[Relevamiento — respuestas de la agencia (17-09)]], bloque 6, y la decisión de autenticación del proyecto ([[DEC-0008 Autenticación propia y rol de vendedor freelance]])
- **Entidades:** todas las entidades operativas

#### RF-153 — Conservar los registros mediante baja lógica *(transversal)*
- **Descripción:** ninguna baja del sistema borra información: [[Hotel]], [[Reseña]], [[Destino]], [[Operador]], [[Usuario]], [[Pago]], [[Viaje]] y [[ContenidoRed]] se dan de baja marcándolos como inactivos, cerrados, ocultos, anulados, cancelados o descartados, conservando el historial y la trazabilidad. La eliminación física es excepcional y solo procede si no rompe la integridad referencial.
- **Actor:** sistema · **Tipo:** validación · **Prioridad:** alta
- **Origen:** criterio transversal presente en CU-16 A4, CU-25 A3, CU-26 A2, CU-27, CU-29, CU-31 A2, [[CU-11 Definir plan de cuotas]] A4 y [[CU-19 Planificar contenido en redes]] A4
- **Entidades:** [[Hotel]] · [[Reseña]] · [[Destino]] · [[Operador]] · [[Usuario]] · [[Pago]] · [[Viaje]] · [[ContenidoRed]]

# Requisitos no funcionales

> Los RNF **no se derivan de los casos de uso**: describen cómo debe comportarse el sistema, no qué hace. Los que siguen son los que el proyecto ya tiene decididos y escritos; cada uno declara de dónde sale. Los atributos de calidad que todavía no tienen valor acordado están listados aparte, al final de esta sección, y **no se completaron con valores estimados**.

#### RNF-01 — Autenticación individual
- **Descripción:** cada persona accede con usuario y contraseña propios. No se admiten cuentas compartidas, porque el objetivo del negocio es poder identificar quién realizó cada acción dentro del CRM.
- **Categoría:** seguridad
- **Origen:** decisión de autenticación del proyecto ([[DEC-0008 Autenticación propia y rol de vendedor freelance]]) y [[Relevamiento — respuestas de la agencia (17-09)]], bloque 6
- **Verificación:** no existe ningún usuario compartido en el padrón; cada sesión se asocia a una persona física.

#### RNF-02 — Autorización a nivel de fila
- **Descripción:** el control de acceso se aplica sobre cada registro, combinando el rol del usuario con la propiedad del registro, y no solo a nivel de pantalla o menú.
- **Categoría:** seguridad
- **Origen:** modelo de visibilidad del proyecto ([[DEC-0005 Autenticación y modelo de roles]], [[DEC-0008 Autenticación propia y rol de vendedor freelance]])
- **Verificación:** un usuario con rol `freelance` no obtiene registros ajenos por ninguna vía, incluida la API.

#### RNF-03 — Trazabilidad de la autoría
- **Descripción:** los registros conservan quién los creó y quién los modificó por última vez, con su fecha. Para esta etapa alcanza con ese nivel; el log de acciones completo queda para una fase posterior.
- **Categoría:** auditoría
- **Origen:** decisión de autenticación y auditoría del proyecto ([[DEC-0008 Autenticación propia y rol de vendedor freelance]])
- **Verificación:** todo registro operativo expone autor y fecha de alta y de última modificación.

#### RNF-04 — Análisis de seguridad automatizado
- **Descripción:** el pipeline de integración analiza vulnerabilidades de dependencias, código estático y presencia de secretos en cada push, con las herramientas definidas para el proyecto.
- **Categoría:** seguridad
- **Origen:** stack tecnológico del proyecto ([[DEC-0001 Stack tecnológico]]) y [[ARQ — Vista general]]
- **Verificación:** el pipeline ejecuta y reporta las cuatro categorías de control en cada push.

#### RNF-05 — Disponibilidad en web y mobile
- **Descripción:** el sistema se usa desde una aplicación web —el back-office del asesor y del administrador— y desde una aplicación mobile para el acceso rápido a agenda, alertas y clientes. El relevamiento pide explícitamente el acceso mobile.
- **Categoría:** portabilidad
- **Origen:** stack tecnológico del proyecto ([[DEC-0001 Stack tecnológico]]), [[ARQ — Vista general]] y [[Relevamiento — Fuente de verdad]]
- **Verificación:** las funcionalidades de agenda, alertas y clientes están disponibles en ambas plataformas.

#### RNF-06 — Acceso al dominio por una única API
- **Descripción:** toda la funcionalidad se expone mediante una API REST con contrato publicado, que es la única puerta al dominio; web y mobile consumen esa misma API.
- **Categoría:** interoperabilidad y arquitectura
- **Origen:** [[ARQ — Vista general]] y el stack tecnológico del proyecto ([[DEC-0001 Stack tecnológico]])
- **Verificación:** ninguna aplicación cliente accede a la base de datos directamente.

#### RNF-07 — Contrato compartido entre cliente y servidor
- **Descripción:** los tipos y las validaciones de web y mobile se generan y comparten a partir del contrato de la API, de modo que una diferencia entre el backend y los clientes se detecte al compilar y no en producción.
- **Categoría:** mantenibilidad
- **Origen:** stack tecnológico del proyecto ([[DEC-0001 Stack tecnológico]])
- **Verificación:** el chequeo de tipos falla si el contrato y los clientes divergen.

#### RNF-08 — Persistencia relacional
- **Descripción:** los datos se guardan en una base relacional, coherente con el modelo de entidades y sus relaciones.
- **Categoría:** arquitectura
- **Origen:** stack tecnológico del proyecto ([[DEC-0001 Stack tecnológico]]), [[DGM-ER]]
- **Verificación:** el modelo físico corresponde con el modelo de entidades y relaciones documentado.

#### RNF-09 — Integridad referencial e histórica
- **Descripción:** el sistema preserva los vínculos entre registros: no permite eliminar un registro en uso y resuelve las bajas de forma lógica, para no romper el historial ni la trazabilidad de viajes, reseñas, pagos y reportes.
- **Categoría:** integridad
- **Origen:** criterio transversal del modelo de dominio; ver RF-153 y las decisiones de catálogo y de relación entre viaje, hotel y reseña
- **Verificación:** ninguna operación del sistema deja registros huérfanos ni pierde historial.

#### RNF-10 — Idioma, moneda y formatos del negocio
- **Descripción:** el sistema trabaja en español de Argentina, usa el lenguaje ubicuo del dominio (Cliente, Oportunidad, Cotización, Viaje, Pago, Alerta, Hotel, Reseña, Usuario, Destino, Operador y ContenidoRed), admite importes en pesos argentinos y dólares por operación, y muestra las fechas de negocio en formato día/mes/año.
- **Categoría:** localización
- **Origen:** convenciones del proyecto y modelo económico multimoneda ([[RN-01 Comisión automática]] y la decisión de modelo económico del proyecto, [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]])
- **Verificación:** no aparecen términos ajenos al lenguaje ubicuo ni formatos de fecha o moneda distintos a los acordados.

#### RNF-11 — Calidad continua
- **Descripción:** cada push ejecuta análisis estático, chequeo de tipos y pruebas automatizadas de backend, web y mobile antes de habilitar el despliegue.
- **Categoría:** mantenibilidad
- **Origen:** stack tecnológico del proyecto ([[DEC-0001 Stack tecnológico]]), [[ARQ — Vista general]]
- **Verificación:** el pipeline corre en cada push y bloquea el avance ante un fallo.

#### RNF-12 — Distribución interna de la aplicación mobile
- **Descripción:** los binarios de la aplicación mobile se distribuyen de forma interna, sin publicación en tiendas públicas.
- **Categoría:** distribución
- **Origen:** stack tecnológico del proyecto ([[DEC-0001 Stack tecnológico]])
- **Verificación:** la instalación se realiza por distribución directa.

#### RNF-13 — Confidencialidad frente al servicio de IA
- **Descripción:** la generación asistida de contenido se limita a lo que el empleado escribe en el pedido. El sistema no envía al servicio de IA datos del negocio: ni clientes, ni catálogo, ni ventas.
- **Categoría:** privacidad
- **Origen:** [[CU-20 Generar propuesta de contenido con IA]] — paso 3; ver también RF-120
- **Verificación:** el pedido enviado al servicio de IA contiene únicamente tema, canal y tono.

## Restricciones del sistema

No son requisitos, sino límites acordados que condicionan a todos los anteriores. Su fuente es [[Alcance y fuera de alcance]]:

- El sistema **registra** pagos, no los **procesa**: no hay cobro online, ni reembolsos, ni penalidades.
- El sistema **no publica** en redes por sí mismo: propone y organiza.
- El sistema **no se integra** con mayoristas ni con sistemas de distribución global.
- El cotizador es **asistido**: no hay scraping de precios de proveedores ni detección automática de ofertas.
- El sistema **no reemplaza** el asesoramiento del agente: lo asiste.
- La **facturación** queda para una fase posterior.
- El aviso al pasajero por WhatsApp es **manual** en esta etapa: el sistema genera el aviso internamente y la persona decide cuándo escribirle.

## Requisitos no funcionales todavía sin definir

Estos atributos de calidad **no tienen valor acordado** en el proyecto. Se listan para que el equipo los cierre antes de comprometerlos; ninguno se completó con un número estimado, porque no surgiría del relevamiento:

| Atributo | Qué falta definir |
|---|---|
| Rendimiento | Tiempo de respuesta esperado de las pantallas de uso frecuente (agenda, dashboard, búsqueda de hoteles). |
| Volumen y concurrencia | Cantidad de usuarios simultáneos, y volumen de clientes, viajes y pagos que debe sostener. |
| Disponibilidad | Nivel de servicio esperado y ventana de mantenimiento aceptable. |
| Resguardo y recuperación | Política de copias de seguridad, retención e indicadores de recuperación. |
| Usabilidad y accesibilidad | Criterios concretos a cumplir y cómo se verifican. |
| Compatibilidad | Navegadores y versiones de sistema operativo mobile soportadas. |
| Política de credenciales | Requisitos de contraseña, bloqueo por intentos fallidos y expiración de la sesión. |
| Infraestructura de despliegue | Sigue pendiente en [[ARQ — Vista general]] y en el stack del proyecto; el servidor propio es una alternativa, no una decisión tomada. |

# Matriz de trazabilidad

Cada caso de uso especificado genera al menos un requisito funcional; ningún requisito existe sin un caso de uso o una decisión que lo respalde.

| Caso de uso | Requisitos funcionales derivados |
|---|---|
| [[CU-01 De la consulta a la venta]] | *Flujo núcleo: no genera requisitos propios.* Compone CU-02, CU-04, CU-05, CU-06, CU-07, CU-10, CU-11, CU-12, CU-15, CU-17 |
| [[CU-02 Registrar cliente]] | RF-001, RF-002, RF-003, RF-004, RF-009 |
| [[CU-03 Gestionar ficha del cliente]] | RF-002, RF-005, RF-006, RF-007, RF-008 |
| [[CU-04 Registrar consulta]] | RF-004, RF-010, RF-011, RF-012, RF-013 |
| [[CU-05 Seguir oportunidad]] | RF-014, RF-015, RF-016, RF-017, RF-018, RF-019, RF-020 |
| [[CU-06 Emitir cotización]] | RF-021, RF-022, RF-023, RF-024, RF-025, RF-026, RF-106 |
| [[CU-07 Confirmar reserva]] | RF-032, RF-033, RF-034, RF-035, RF-036 |
| [[CU-08 Gestionar estado del viaje]] | RF-037, RF-038, RF-039, RF-040, RF-041, RF-042 |
| [[CU-09 Armar itinerario de hoteles]] | RF-043, RF-044, RF-045, RF-046, RF-047, RF-106 |
| [[CU-10 Registrar economía del viaje]] | RF-054, RF-055, RF-056, RF-057, RF-058, RF-059 |
| [[CU-11 Definir plan de cuotas]] | RF-059, RF-060, RF-061, RF-062, RF-063, RF-064, RF-065, RF-066 |
| [[CU-12 Registrar cobro de un pago]] | RF-038, RF-067, RF-068, RF-069, RF-070, RF-071, RF-072 |
| [[CU-13 Configurar porcentaje de comisión]] | RF-083, RF-084, RF-085, RF-056 |
| [[CU-14 Ver y atender alertas del día]] | RF-073, RF-074, RF-075, RF-076, RF-077, RF-078, RF-079 |
| [[CU-15 Configurar recordatorios por destino]] | RF-034, RF-086, RF-087, RF-088 |
| [[CU-16 Gestionar hotel en catálogo]] | RF-097, RF-098, RF-099, RF-100 |
| [[CU-17 Registrar reseña de hotel]] | RF-101, RF-102, RF-103, RF-104, RF-105 |
| [[CU-18 Buscar y recomendar hoteles]] | RF-106, RF-107, RF-108, RF-109, RF-110 |
| [[CU-19 Planificar contenido en redes]] | RF-113, RF-114, RF-115, RF-116, RF-117, RF-118 |
| [[CU-20 Generar propuesta de contenido con IA]] | RF-119, RF-120, RF-121, RF-122 |
| [[CU-21 Ver dashboard y embudo]] | RF-123, RF-124, RF-125, RF-126, RF-127, RF-128, RF-129, RF-130 |
| [[CU-22 Generar reportes y estadísticas]] | RF-131, RF-132, RF-133, RF-134, RF-135 |
| [[CU-23 Ver calendario de viajes y vencimientos]] | RF-136, RF-137, RF-138, RF-139 |
| [[CU-24 Iniciar sesión]] | RF-140, RF-141, RF-142, RF-143 |
| [[CU-25 Gestionar usuarios y roles]] | RF-144, RF-145, RF-146, RF-147, RF-148, RF-149, RF-150 |
| [[CU-26 Gestionar destinos]] | RF-089, RF-090, RF-091, RF-092 |
| [[CU-27 Cancelar viaje]] | RF-048, RF-049, RF-050, RF-051, RF-052, RF-053 |
| [[CU-28 Crear recordatorio manual]] | RF-080, RF-081, RF-082 |
| [[CU-29 Eliminar reseña]] | RF-111, RF-112 |
| [[CU-30 Sugerir recontacto de clientes]] | RF-027, RF-028, RF-029, RF-030, RF-031 |
| [[CU-31 Gestionar operadores]] | RF-093, RF-094, RF-095, RF-096 |

Los requisitos transversales **RF-151**, **RF-152** y **RF-153** no cuelgan de un caso de uso puntual: se aplican a todos los módulos y su origen son las decisiones de roles, autenticación y baja lógica del proyecto.

# Requisitos con dependencias abiertas

Los siguientes requisitos están escritos con el valor o el criterio que hoy figura en el vault, pero ese valor **todavía no está cerrado**. Se listan para que el equipo los ratifique; ninguno bloquea la especificación, pero todos pueden cambiar de valor sin cambiar el requisito:

| Requisito | Qué falta cerrar |
|---|---|
| RF-022 | La vigencia por defecto de la cotización (un mes) es una propuesta del equipo, no un dato validado con la agencia. |
| RF-026 | El vencimiento automático de cotizaciones es un cambio de modelo reciente, pendiente de ratificar. |
| RF-035 | La anticipación por defecto del aviso de salida (siete días) no está validada con la agencia. |
| RF-051 | El tratamiento de la comisión al cancelar un viaje ya iniciado es una resolución reciente, pendiente de ratificar. |
| RF-067, RF-071 | El conjunto de formas de pago es una propuesta del equipo: no surgió del relevamiento y falta confirmar si incluye medios digitales. |
| RF-072 | La indivisibilidad del pago está validada por el responsable del módulo, pendiente de ratificación del equipo. |
| RF-106 | El filtro por rango de precio y por servicios requiere atributos que todavía no se agregaron a la entidad Hotel. |
| RF-117 | El descarte de una pieza de contenido es un cambio de modelo reciente, pendiente de ratificar. |
| RF-152 | Falta definir el alcance exacto de las columnas de auditoría sobre las tablas operativas. |

Además, quedan **dos ideas planteadas y no modeladas**, que por lo tanto no generan requisitos: el **recargo por mora** al vencer una cuota y el **inicio de sesión con Google**, registrado como conveniencia opcional y futura, no como requisito de esta etapa.

## 🔎 Revisión

> [!note] Nahuel (21/09) — **catálogo creado por ingeniería inversa desde los 31 CU.** Método: se recorrió cada CU entero (flujo principal, alternativos, precondiciones, postcondiciones y reglas) y se extrajo la capacidad funcional, no el guion de interacción. **No se agregó ninguna funcionalidad que no estuviera escrita en el vault**: los huecos quedaron listados en *Requisitos no funcionales todavía sin definir* y en *Requisitos con dependencias abiertas*, sin completar con valores estimados. **Borrador a ratificar en la sync**, junto con el resto del batch.
>
> [!note] Decisiones de derivación que conviene mirar en la sync:
> 1. **La prioridad se derivó con un criterio explícito** (flujo principal = alta; alternativo, validación o corrección = media; marcado como opcional o futuro = baja), porque el vault **no registra prioridades de negocio** y los 31 CU son todos de alcance PC1. Si el equipo quiere priorizar de verdad para PC2, hay que hacerlo con la agencia y reemplazar la columna.
> 2. **Los requisitos compartidos se escribieron una sola vez.** Tres casos: RF-034 (lo dispara CU-07 y lo configura CU-15), RF-059 (CU-10 A4 y CU-11 A5 son el mismo rebalanceo) y RF-038 (CU-08 describe la transición y CU-12 la dispara). La matriz los referencia desde ambos CU.
> 3. **CU-01 no genera requisitos propios.** Es el flujo núcleo y sus tres alternativos ya están cubiertos: A1 por RF-015, A2 por RF-060 y RF-068, A3 por RF-034.
> 4. **RF-072 sale de una nota de revisión, no del cuerpo del CU.** La indivisibilidad del pago está en la sección Revisión de CU-12 (Nahuel, 10/09), no en sus reglas de negocio. Se incluyó igual porque es una restricción real del dominio, pero conviene **subirla al cuerpo del CU** si se ratifica.
> 5. **RF-151, RF-152 y RF-153 son transversales** y salen de las DEC, no de un CU. RF-153 es el criterio de baja lógica que el vault aplica en ocho entidades sin tenerlo escrito en un solo lugar; si se ratifica, quizá merezca una **RN propia**, como RN-01.
> 6. **El inicio de sesión con Google (CU-24 A2) no se convirtió en requisito**, porque la decisión de autenticación lo registra como conveniencia opcional y futura, no requerida. Queda mencionado al final, entre las ideas no modeladas.
>
> [!question] Nahuel (21/09) — dos cosas que este catálogo deja a la vista y que el equipo debería resolver:
> 1. El checklist de PC1 en [[Estado del proyecto]] proponía esta nota en `01-Relevamiento/`. Se creó en `02-Analisis/` porque los RF son **producto del análisis** (derivados de los CU), no del relevamiento. Si el equipo prefiere la ubicación original, hay que mover la nota y actualizar los punteros.
> 2. Los **RNF sin definir** son ocho y ninguno es exótico: rendimiento, volumen, disponibilidad, backup, usabilidad, compatibilidad, política de contraseñas e infraestructura. Varios se responden con **una pregunta a la agencia** (volumen de operaciones, cuántas personas en simultáneo) y el resto son **decisiones del equipo**. Conviene llevarlos a la próxima ronda antes de que PC2 los decida por omisión.
