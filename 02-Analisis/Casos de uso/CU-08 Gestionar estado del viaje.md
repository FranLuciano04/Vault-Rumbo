---
tipo: caso-uso
estado: en-revision
modulo: [viajes]
responsable: Francisco
pc: pc1
actualizado: 11/09/26
---
# CU-08 Gestionar estado del viaje

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
El empleado sigue y hace avanzar el [[Viaje]] por su ciclo de vida (`reservado → vendido → confirmado → en curso → finalizado`) y consulta su situación (itinerario, control económico, checklist de pagos). La **cancelación** es un flujo aparte ([[CU-27 Cancelar viaje]]).

## Actor principal
[[Actores|empleado]] (el `responsable` del [[Viaje]])

## Actores secundarios
-

## Precondiciones
- El empleado está autenticado ([[CU-24 Iniciar sesión]]).
- Existe un [[Viaje]] ([[CU-07 Confirmar reserva]]).

## Flujo principal
1. El empleado abre el [[Viaje]] y ve su estado, itinerario ([[CU-09 Armar itinerario de hoteles]]), economía y **checklist de pagos** con el **% pagado** ([[CU-12 Registrar cobro de un pago]]).
   > El [[Viaje]] arranca en `reservado` al crearse la venta ([[CU-07 Confirmar reserva]]).
2. **`reservado → vendido`:** lo dispara el **cobro de la seña**; **`vendido → confirmado`:** el **pago total** al saldarse ([[CU-12 Registrar cobro de un pago]]). No son acciones manuales.
3. **`confirmado → en curso → finalizado`:** el sistema **sugiere** el cambio según las fechas de salida/regreso, pero **el empleado confirma** el paso.
4. El sistema registra el cambio y actualiza las vistas dependientes ([[CU-23 Ver calendario de viajes y vencimientos]], dashboard).
5. Al pasar a `finalizado`, el sistema habilita la **post-venta**: agenda una [[Alerta]] de tipo `reseña` ([[CU-17 Registrar reseña de hotel]]).

## Flujos alternativos
- **A1 — Sugerencia por fecha, confirmación manual:** el sistema propone `en curso`/`finalizado` según las fechas, pero **no lo fuerza**. Ej.: si el último vuelo está **retrasado**, el empleado **mantiene el viaje `en curso`** aunque la fecha de regreso ya haya pasado, y lo marca `finalizado` recién cuando realmente terminó.
- **A2 — Corrección de estado:** el empleado retrocede al estado inmediato anterior si se cargó por error (mientras sea coherente y el viaje no esté `finalizado`/`cancelado`).
- **A3 — Cancelación:** el empleado cancela el [[Viaje]] → se deriva a [[CU-27 Cancelar viaje]] (estado `cancelado`).

## Postcondiciones
- El [[Viaje]] refleja su estado operativo actual; al finalizar, queda disponible para la [[Reseña]] post-viaje y para reportes.

## Reglas de negocio aplicadas
- Estados del [[Viaje]]: `reservado · vendido · confirmado · en curso · finalizado · cancelado`. `cancelado` es terminal y se gestiona en [[CU-27 Cancelar viaje]].
- `reservado` = aceptó la cotización (sin seña); `vendido` = seña cobrada; `confirmado` = **total pagado**. Las dos primeras transiciones las dispara [[CU-12 Registrar cobro de un pago]] (seña y saldo).
- `en curso`/`finalizado` van por **fecha sugerida + confirmación del empleado**; nunca se fuerzan (caso vuelo retrasado, A1).

## Entidades del dominio involucradas
- [[Viaje]] · [[Pago]] · [[Alerta]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]] · [[EST-Viaje]] (estado) · [[DGM-ACT — Proceso automático diario]] (actividad, tarea 3: la sugerencia por fecha)

## 🔎 Revisión
> [!note] Francisco (11/09) — **definido en la sync:** ciclo `vendido → confirmado → en curso → finalizado` (+`cancelado`). (1) `vendido→confirmado` lo dispara el **pago total** ([[CU-12 Registrar cobro de un pago]]); (2) `en curso`/`finalizado` son **sugeridos por fecha pero confirmados por el empleado** — no se fuerzan (caso real: vuelo retrasado → se mantiene `en curso` aunque pase la fecha, A1); (3) retroceso solo al estado inmediato anterior (A2).
