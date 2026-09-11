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
El empleado hace avanzar el [[Viaje]] por su ciclo de vida operativo (`armado → confirmado → en curso → finalizado`) y consulta su situación (itinerario, control económico, checklist de pagos). La **cancelación** es un flujo aparte ([[CU-27 Cancelar viaje]]).

## Actor principal
[[Actores|empleado]] (el `responsable` del [[Viaje]])

## Actores secundarios
-

## Precondiciones
- El empleado está autenticado ([[CU-24 Iniciar sesión]]).
- Existe un [[Viaje]] ([[CU-07 Confirmar reserva]]).

## Flujo principal
1. El empleado abre el [[Viaje]] y ve su estado, itinerario ([[CU-09 Armar itinerario de hoteles]]), economía y **checklist de pagos** con el **% pagado** ([[CU-12 Registrar cobro de un pago]]).
2. Hace avanzar el `estado` según los hitos: `confirmado` → `en curso` (al llegar la fecha de salida) → `finalizado` (al pasar la fecha de regreso).
3. El sistema registra el cambio de estado y actualiza las vistas dependientes ([[CU-23 Ver calendario de viajes y vencimientos]], dashboard).
4. Al pasar a `finalizado`, el sistema habilita la **post-venta**: agenda una [[Alerta]] de tipo `reseña` para registrar la [[Reseña]] del hotel ([[CU-17 Registrar reseña de hotel]]).

## Flujos alternativos
- **A1 — Transición automática por fecha:** el sistema puede pasar el [[Viaje]] a `en curso`/`finalizado` automáticamente según las fechas de salida/regreso; el empleado puede ajustarlo manualmente.
- **A2 — Corrección de estado:** el empleado retrocede un estado cargado por error (mientras sea coherente con las fechas).
- **A3 — Cancelación:** el empleado cancela el [[Viaje]] → se deriva a [[CU-27 Cancelar viaje]] (estado `cancelado`).

## Postcondiciones
- El [[Viaje]] refleja su estado operativo actual; al finalizar, queda disponible para la [[Reseña]] post-viaje y para reportes.

## Reglas de negocio aplicadas
- Estados del [[Viaje]]: `armado · confirmado · en curso · finalizado · cancelado`. `cancelado` es terminal y se gestiona en [[CU-27 Cancelar viaje]].
- El estado operativo es independiente del estado económico (un [[Viaje]] puede estar `finalizado` con saldo pendiente — ver [[CU-12 Registrar cobro de un pago]] A2).

## Entidades del dominio involucradas
- [[Viaje]] · [[Pago]] · [[Alerta]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]] · (pendiente) diagrama de **estado** de [[Viaje]].

## 🔎 Revisión
> [!note] Francisco (11/09) — **definido:** (1) transiciones **mixtas** — el sistema auto-avanza `en curso`/`finalizado` según las fechas de salida/regreso y el empleado puede **ajustar manualmente** (A1); (2) el retroceso se permite **solo al estado inmediato anterior**, mientras sea coherente con las fechas y el viaje no esté `finalizado` ni `cancelado` (A2).
