---
tipo: decision
estado: formalizado
modulo: [clientes, cotizaciones]
decisores: [Francisco, Nahuel, Paloma]
fecha_aprobacion: 29/09/26
supersede:
actualizado: 29/09/26
---
# DEC-0002 Modelar la consulta como Oportunidad

tags:: #tipo/decision #estado/formalizado #pc/pc1

> ✅ **Ratificada en la sync del 29/09/26** (Francisco, Nahuel y Paloma).

## Contexto
El relevamiento habla de "consulta" (paso 1 de [[CU-01 De la consulta a la venta]]). Hay que decidir si es una entidad propia o solo un estado del [[Viaje]].

## Decisión
Modelar la consulta como entidad **[[Oportunidad]]** independiente, con estados (`nueva · en_gestión · cotizada · ganada · perdida`), que puede o no derivar en un [[Viaje]]. El estado `en_gestión` (atención/asesoramiento previo a la cotización) se selló en la sync del 11/09 ([[CU-05 Seguir oportunidad]]) y aplica también al embudo del [[CU-21 Ver dashboard y embudo|dashboard]].

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

> [!note] Nahuel (18/09, entrevista grill) — alineado el enunciado a los **5 estados** (`en_gestión` faltaba acá y en el embudo del [[CU-21 Ver dashboard y embudo|dashboard]], Q1). La DEC ya está **lista para ratificar**; se deja `en-revision` porque el otro decisor (Francisco) debe sellarla en la sync — no se completa `fecha_aprobacion` unilateralmente ([[CLAUDE|CLAUDE.md]]).
