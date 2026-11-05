---
tipo: referencia
estado: formalizado
responsable: Codex
modulo: M7
actualizado: 05/11/26
---
# M7 — review Codex

## Resumen
Revisión estática de los nueve diffs de merge indicados y de su integración, considerando las correcciones entre tickets y sin atribuirles código posterior de `main`. No se ejecutaron pruebas.
La integración de las decisiones de recontacto es consistente, pero falta sincronizar la generación de sugerencias con las operaciones de la API e identificar a los clientes recurrentes según RF-027. Se registran dos hallazgos importantes.

## Hallazgos

### H-01 · La API puede invalidar un candidato antes de que el proceso cree su alerta
- **Severidad:** importante
- **Ubicación:** `src/backend/rumbo/datos/repositorios/clientes.py:251` y `src/backend/rumbo/negocio/servicios/clientes.py:240` (merge `a7b2009`); `src/backend/rumbo/negocio/servicios/clientes.py:164` y `src/backend/rumbo/negocio/servicios/oportunidades.py:62` (merge `c835dda`); `src/backend/rumbo/datos/repositorios/viajes.py:120` y `src/backend/rumbo/negocio/servicios/viajes.py:356` (merge `115bceb`).
- **Ticket relacionado:** entre T-113 y T-114; también T-112.
- **Trazabilidad:** CU-30 A1/A2, RF-029, RF-030; CU-08, RF-039, EST-Viaje T6.
- **Problema:** las consultas de candidatos leen sin bloquear el cliente o viaje y los servicios conservan esos resultados hasta insertar las alertas. El advisory lock del paso solo serializa las corridas del proceso; las operaciones de la API no participan de ese bloqueo. Resolver las alertas existentes en la transacción de la API no impide que el proceso inserte otra después, basada en la lectura anterior. Las corridas siguientes tampoco limpian esas sugerencias obsoletas.
- **Escenario:** un cliente con viaje antiguo, sin oportunidad abierta ni alerta, es seleccionado por el proceso. Antes de `crear_varias`, un `PATCH /clientes/{id}` confirma `no_recontactar=true`; su resolución de alertas no encuentra ninguna. El proceso continúa y crea una sugerencia pendiente para ese cliente excluido. La misma intercalación ocurre si se registra una consulta nueva. En viajes, el proceso selecciona uno confirmado con salida cumplida; la API lo cancela y resuelve sus alertas; después el proceso inserta una sugerencia pendiente de pasarlo a `en_curso`, aunque ya está cancelado.
- **Arreglo sugerido:** coordinar generación y decisiones mediante un bloqueo compartido por entidad, adquirido tanto por el proceso como por las operaciones de la API. Releer y validar los criterios bajo ese bloqueo antes de insertar; en viajes, aprovechar el bloqueo de fila que ya usan las transiciones. No basta con agregar un lock solo al proceso de recontacto: el alta de oportunidades también debe participar. Agregar pruebas con dos transacciones y una pausa entre selección e inserción para verificar opt-out, alta de consulta y cancelación concurrentes.

### H-02 · Las sugerencias no identifican ni priorizan a los clientes recurrentes
- **Severidad:** importante
- **Ubicación:** `src/backend/rumbo/datos/repositorios/clientes.py:223` y `src/backend/rumbo/datos/repositorios/clientes.py:249` (merge `a7b2009`).
- **Ticket relacionado:** T-113.
- **Trazabilidad:** CU-30, RF-027.
- **Problema:** RF-027 exige identificar especialmente a los clientes con dos o más viajes y CU-30 pide priorizarlos/identificarlos. La consulta solo calcula la fecha del último regreso, devuelve cliente y asesor y ordena por UUID; no calcula recurrencia. Las alertas generadas tampoco incorporan una distinción ni las pantallas de recontacto la presentan. La nota de T-113 reconoce este pendiente, pero no constituye una decisión que cambie el requisito ni aparece entre las exclusiones del pedido de review.
- **Escenario:** dos clientes con el mismo asesor cumplen el umbral de inactividad; uno tiene un viaje y el otro tres. Ambos reciben la misma sugerencia sin indicador de recurrencia y sin prioridad comercial garantizada. El asesor debe abrir y contar el historial por su cuenta para distinguir al recurrente.
- **Arreglo sugerido:** calcular la recurrencia y exponer una identificación explícita en el contexto autorizado de la sugerencia, o implementar una prioridad visible basada en ella. Mantener elegibles a los clientes de un solo viaje. Agregar un caso con ambos perfiles que compruebe la distinción; los tests actuales solo verifican que los dos generan alerta. Evitar agregar información del cliente a la descripción sin filtro de visibilidad.

## Triage de Claude

> Triage del 05/11/26 (Nahuel, Claude Opus 5.5). Los dos hallazgos se verificaron leyendo el código en `main`.

### H-01 · Confirmado (importante)
- **Verificación:** `inactivos_para_recontacto` y `para_sugerir_avance` leen sin `FOR UPDATE`, y `crear_varias` inserta después con esa lectura. `pg_advisory_xact_lock` solo serializa las corridas del proceso entre sí: `editar_cliente`, `crear_oportunidad` y la cancelación del viaje no lo toman. Si la API confirma entre la lectura y la inserción, `resolver_de_origen` no encuentra ninguna alerta y queda una sugerencia pendiente que ya no corresponde.
- **Contexto:** la ventana es chica, porque el proceso corre a las 00:00. El daño es una sugerencia de más, sin cambio de estado ni de dinero. Igual contradice RF-030 para un cliente excluido.
- **Alcance:**
  1. Si un `PATCH /clientes/{id}` confirma `no_recontactar=true` entre la selección y la inserción, ese cliente no queda con una alerta `recontacto` pendiente.
  2. Si se registra una consulta para el cliente entre la selección y la inserción, no queda con una alerta `recontacto` pendiente.
  3. Si un viaje se cancela entre la selección y la inserción, no queda con una alerta `viaje` pendiente.
  4. Sin operaciones concurrentes, los candidatos y la idempotencia siguen igual.
- **Riesgo:** toca el proceso diario y estados: review con `reviewer-seguridad` y aprobación de otro integrante.
- **PR:** pendiente.

### H-02 · Confirmado (importante)
- **Verificación:** `inactivos_para_recontacto` solo calcula el último regreso y ordena por `Cliente.id`. CU-30 pide priorizar o identificar a los recurrentes (≥ 2 viajes). `TarjetaRecontacto.tsx` lista el historial, así que los viajes se ven en la web, pero nada distingue al recurrente. La nota de T-113 lo dejó como candidato a ticket sin una decisión que cambie el requisito.
- **Alcance:**
  1. La alerta `recontacto` de un cliente con 2 o más viajes no cancelados lo identifica como recurrente en `contexto.cliente`; la de un cliente con 1 viaje, no.
  2. La sugerencia en la web muestra esa identificación.
  3. La sugerencia en la app mobile muestra esa identificación.
  4. Un cliente con 1 viaje sigue siendo candidato.
  5. El dato va en `contexto`, con su filtro de visibilidad, y no en la `descripcion`.
- **Riesgo:** normal. Cambia el contrato (`openapi.json` y tipos de `@rumbo/shared`).
- **PR:** pendiente.
