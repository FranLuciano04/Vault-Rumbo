---
tipo: referencia
estado: formalizado
responsable: Codex
modulo: M3
actualizado: 26/10/26
---
# M3 — review Codex

## Resumen
Los permisos y las transiciones del backend están cubiertos en la implementación; quedan cuatro hallazgos: uno bloqueante en la paginación web y tres importantes en totales, semilla y fidelidad de los mocks. Se revisaron los merges del pedido y se comprobó que los problemas persisten en HEAD `c791841`.
La evidencia es de revisión estática de código, contrato y tests: la ejecución de tests de shared no llegó a arrancar porque `pnpm` intentó preparar dependencias y falló con `EPERM`. No se ejecutó el e2e ni se modificaron código o tests.
El alta ya rechaza varios orígenes simultáneos. `crear` no deduplica alertas: la idempotencia del proceso diario queda para M7/T-110 y sus pasos, no se considera un incumplimiento de M3.

## Hallazgos

### H-01 · La agenda web no pagina las alertas vistas
- **Severidad:** bloqueante
- **Ubicación:** `src/apps/web/src/features/alertas/PaginaAgenda.tsx:99` (merge `3b5b912`; cálculo de última página en la línea 135 del mismo merge)
- **Ticket relacionado:** T-055
- **Trazabilidad:** CU-14, RF-074, RF-076
- **Problema:** la consulta de vistas fuerza siempre `pagina: 1` con un máximo de 100 resultados. Tanto la última página como los controles de navegación se calculan exclusivamente con las pendientes. Las vistas restantes quedan fuera de la agenda, aunque siguen sin resolver y cuentan en el progreso del día. El comportamiento persiste en HEAD.
- **Escenario:** un usuario tiene cero pendientes y 101 vistas del mismo tipo y fecha de hoy. Activa «Mostrar vistas»: aparecen 100 y no existe «Siguiente». La alerta restante no se puede abrir ni resolver desde esa agenda. Si hay pendientes en varias páginas, se repiten las mismas 100 vistas al avanzar.
- **Arreglo sugerido:** paginar también las vistas, mediante una lista conjunta con paginación coherente o controles independientes. Cubrir el caso de más de 100 vistas sin pendientes y comprobar que la última alerta puede abrirse y resolverse.

### H-02 · Los totales descuentan alertas fuera del filtro activo
- **Severidad:** importante
- **Ubicación:** `src/packages/shared/src/hooks/useTotalesAgenda.ts:32` (merge `6d35f36`; introducido en `src/apps/web/src/features/alertas/useTotalesAgenda.ts:38`, merge `8f3e08d`)
- **Ticket relacionado:** entre T-164 y T-165
- **Trazabilidad:** CU-14, RF-074, RF-078, RF-154
- **Problema:** las consultas de totales aplican `tipo` y `propietario_id`, pero la resta optimista de `resueltas` solo comprueba fecha y estado. Al cambiar un filtro durante la ventana de «Deshacer», se descuenta una alerta que ya no pertenece al conjunto consultado. Afecta a los contadores web y a los chips mobile que reutilizan el hook.
- **Escenario:** una admin resuelve un recordatorio de Ana y, antes de que terminen los cinco segundos de gracia, selecciona a Tomás, que no tiene alertas. La API devuelve total 0, pero el hook resta el recordatorio de Ana y muestra −1. También sucede al resolver una manual y cambiar a otro tipo sin resultados.
- **Arreglo sugerido:** aplicar a las resoluciones en espera los mismos filtros de responsable, tipo, fecha y estado que a la consulta antes de restarlas. Verificar el cambio de filtro mientras sigue disponible «Deshacer».

### H-03 · La semilla puede asociar un cliente ajeno a la freelance
- **Severidad:** importante
- **Ubicación:** `src/backend/rumbo/datos/semillas/alertas.py:60` (merge `c0757e0`; asignación de `cliente_id` en la línea 64)
- **Ticket relacionado:** T-060
- **Trazabilidad:** CU-28, RF-081, RF-151, DEC-0008
- **Problema:** la semilla busca al cliente globalmente por contacto y lo asocia al responsable fijo del recordatorio sin comprobar su asesor. `buscar_por_contacto` elige el más antiguo si hay duplicados. La semilla de clientes conserva los registros preexistentes, de modo que no garantiza que el cliente encontrado siga perteneciendo al asesor esperado. No es una fuga de contexto en la API: esta lo filtra; es una asociación inválida que la creación normal rechazaría.
- **Escenario:** antes de la primera carga de alertas M3, el cliente con contacto `lucia.gomez@rumbo.test` fue reasignado a otro asesor. Al ejecutar la semilla, se crea para `freelance.demo@rumbo.test` un recordatorio con ese `cliente_id`. La freelance recibe una tarea asociada a un cliente que no puede consultar y el detalle devuelve el contexto del cliente nulo.
- **Arreglo sugerido:** comprobar la visibilidad o el asesor del cliente antes de asociarlo; omitir el recordatorio o la asociación si no corresponde. Agregar cobertura con un contacto preexistente de otro asesor y con duplicados de distinto asesor.

### H-04 · Los mocks de alertas no reproducen los permisos por rol
- **Severidad:** importante
- **Ubicación:** `src/packages/shared/src/mocks/alertas.ts:258` (merge `69ac2f1`; selección de agenda por `propietario_id`)
- **Ticket relacionado:** entre T-050 y T-052
- **Trazabilidad:** CU-14 A1, CU-28 A2, RF-078, DEC-0005, DEC-0008
- **Problema:** los handlers no consideran al actor. La lista agrega alertas ajenas únicamente por recibir `propietario_id`, mientras que detalle y modificaciones buscan solo en `alertasMock`. Esto permite simular lecturas que el backend impide y rechaza operaciones que dirección sí puede realizar. Tampoco reproduce el 403 al editar un recordatorio ajeno como admin/dueño. Persiste tras las modificaciones posteriores de los mocks; constituye una brecha de cobertura, no evidencia de un permiso roto en producción.
- **Escenario:** un pedido de empleado con `propietario_id` de Tomás recibe sus alertas en MSW; el backend ignora ese filtro y conserva la agenda propia. En sentido inverso, una admin puede listar una alerta ajena mediante ese filtro, pero al pedir su detalle el mock devuelve 404, cuando el backend devuelve 200; editar su recordatorio devuelve 404 en vez del 403 esperado.
- **Arreglo sugerido:** parametrizar los handlers por actor y reproducir la matriz de visibilidad y edición del backend. Probar lista, detalle y edición con empleado/freelance frente a alertas ajenas y con admin/dueño frente a recordatorios ajenos.

## Triage de Claude

> Verificado por Claude (Opus 5.5) el 26/10/26 contra `origin/main` (`c791841`). Los cuatro hallazgos se confirman en el código; se arreglan en ramas `fix/M3-…` según DEC-0019.

| Hallazgo | Resultado | Verificación | Arreglo |
|---|---|---|---|
| H-01 · Agenda web sin paginar vistas | **Confirmado** | `PaginaAgenda.tsx` pide las vistas con `{ ...filtros, pagina: 1, estado: "vista" }` y `POR_PAGINA = 100`; `ultimaPagina` sale solo de `pendientes.data.total`. Con 0 pendientes y 101 vistas no aparece «Siguiente» y la 101 queda inaccesible; con pendientes en varias páginas se repiten las mismas vistas. | PR [#104](https://github.com/FranLuciano04/Vault-Rumbo/pull/104) (`fix/M3-agenda-vistas`), mergeado |
| H-02 · Totales que descuentan fuera del filtro | **Confirmado** | En `shared/src/hooks/useTotalesAgenda.ts`, `enEspera` filtra las resueltas solo por `cuenta(a)` (fecha) y estado; no mira `filtros.responsable` ni `filtros.tipo`, que sí van a la consulta. Cambiar el filtro durante el «Deshacer» resta una alerta que el servidor ya no cuenta (puede dar −1). Afecta web y chips mobile. | PR [#105](https://github.com/FranLuciano04/Vault-Rumbo/pull/105) (`fix/M3-totales-filtro`), mergeado |
| H-03 · Semilla con cliente ajeno | **Confirmado** | `semillas/alertas.py` asocia `buscar_por_contacto(...)` (global, sin visibilidad, el más antiguo) al responsable fijo sin comprobar que el cliente sea suyo. Si el cliente cambió de asesor o hay duplicados de otro asesor, la freelance queda con un recordatorio de un cliente que no ve. Solo afecta datos de demo, pero rompe RF-151. | PR [#106](https://github.com/FranLuciano04/Vault-Rumbo/pull/106) (`fix/M3-semilla-alertas`), mergeado |
| H-04 · Mocks sin permisos por rol | **Confirmado** | `mocks/alertas.ts` no tiene en cuenta el actor: el `GET` suma `alertasAjenasMock` a cualquiera que mande `propietario_id`, y detalle y escrituras buscan solo en `alertasMock` (404 a la admin sobre una ajena, sin el 403 al editar un recordatorio ajeno). Es una brecha de fidelidad del contrato, no un permiso roto del backend. | PR [#107](https://github.com/FranLuciano04/Vault-Rumbo/pull/107) (`fix/M3-mocks-permisos`), mergeado |

Notas del arreglo (27/10/26):
- **H-01:** sin cambio de contrato; con «Mostrar vistas», las vistas usan la misma página que las pendientes y la última página es la mayor de las dos.
- **H-03:** la semilla no importa de `negocio`; replica RF-151 (la freelance solo ve sus clientes) con `buscar_por_contacto(..., asesor_id)`. Las bases donde ya corrió la semilla vieja conservan el recordatorio con el cliente ajeno.
- **Fuera de los hallazgos:** los tests web que fallaban al azar bajo carga ya los resolvió el PR #103 en `main`.
