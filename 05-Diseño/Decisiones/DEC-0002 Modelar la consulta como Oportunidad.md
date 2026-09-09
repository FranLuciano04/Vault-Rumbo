---
tipo: decision
estado: en-revision
modulo: [clientes, cotizaciones]
decisores: [Nahuel, Francisco]
fecha_aprobacion:
supersede:
actualizado: 09/09/26
---
# DEC-0002 Modelar la consulta como Oportunidad

tags:: #tipo/decision #estado/en-revision #pc/pc1

## Contexto
El relevamiento habla de "consulta" (paso 1 de [[CU-01 De la consulta a la venta]]). Hay que decidir si es una entidad propia o solo un estado del [[Viaje]].

## Decisión
Modelar la consulta como entidad **[[Oportunidad]]** independiente, con estados (nueva · cotizada · ganada · perdida), que puede o no derivar en un [[Viaje]].

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Oportunidad como entidad | Permite medir conversión, insistencia y consultas perdidas | Una entidad más | ✅ |
| Viaje con estado "consulta" | Menos entidades | Se pierden las consultas que no se venden; no hay dónde colgar insistencia | ❌ |

## Justificación
Objetivo del sistema: "ordenar el circuito de venta" y "más consultas que terminan en venta". Sin Oportunidad no se puede medir el embudo ni gestionar el flujo alternativo A1 (insistencia).

## Impacto
- Afecta: [[Oportunidad]], [[Cliente]], [[Cotización]], [[MOC — Modelo de dominio]].

## Decisores y fecha
- Decisores: Nahuel, Francisco — Aprobada: _(pendiente sync)_
