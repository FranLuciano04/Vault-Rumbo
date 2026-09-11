---
tipo: decision
estado: formalizado
modulo: [viajes, alertas, hoteles]
decisores: [Nahuel]
fecha_aprobacion: 11/09/26
supersede:
actualizado: 10/09/26
---
# DEC-0006 Destino como entidad de catálogo

tags:: #tipo/decision #estado/formalizado #pc/pc1

## Contexto
`destino` estaba modelado como un atributo `String` libre en [[Viaje]] y en [[Hotel]]. El pedido de un **ABM de destinos** ([[CU-26 Gestionar destinos]]) y las reglas de **recordatorio por destino** ([[CU-15 Configurar recordatorios por destino]]) necesitan un destino **identificable, reutilizable y consistente**, no una cadena escrita a mano en cada registro.

## Decisión
1. Se agrega **[[Destino]]** como **entidad de catálogo compartido** (pasa de 10 a **11 entidades**).
2. [[Viaje]] referencia a [[Destino]] (`*..1`): un [[Viaje]] tiene un destino del catálogo.
3. [[Hotel]] referencia a [[Destino]] (`*..1`): la ubicación del hotel deja de ser texto libre. _(Toca la entidad [[Hotel]] — módulo de Paloma; ratificar.)_
4. Baja **lógica** (`activo`): un destino en uso no se elimina físicamente ([[CU-26 Gestionar destinos]], A2).
5. Las reglas de recordatorio por destino se asocian a [[Destino]] (base de [[CU-15 Configurar recordatorios por destino]]).

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Destino como entidad de catálogo | Consistencia, reutilización, ABM y reglas por destino | Requiere migrar `destino` de [[Viaje]] y [[Hotel]] y un ABM | ✅ |
| `destino` como `String` libre | Cero modelado | Datos inconsistentes ("Bariloche" vs "bariloche"), sin ABM ni reglas | ❌ |

## Restricciones
- Fechas `dd/mm/aa`, moneda ARS (sin impacto directo aquí).
- No se define aún la geografía fina (país/región) como entidades separadas: quedan como atributos de [[Destino]].
- **`Oportunidad.destino` queda como `String` (texto libre)** por ahora: en la etapa de consulta el destino puede ser exploratorio y aún no estar en el catálogo; se normaliza a [[Destino]] al derivar la [[Oportunidad]] en un [[Viaje]]. _(A ratificar en la sync; toca módulo de Francisco.)_

## Impacto
- Afecta: [[Destino]] (nueva), [[Viaje]] (`destino` → FK), [[Hotel]] (`destino` → FK), [[MOC — Modelo de dominio]], [[DGM-ER]], [[CU-15 Configurar recordatorios por destino]], [[CU-26 Gestionar destinos]] y el checklist de entidades en [[Estado del proyecto]] (10 → 11).

## Decisores y fecha
- Decisores: Nahuel (10/09/26) — **Aprobada: 11/09/26** (sync; Francisco y Nahuel presentes, Paloma notificada por Git). Confirmado: `Oportunidad.destino` queda **texto libre** y se **normaliza a [[Destino]] al derivar en [[Viaje]]** ([[CU-07 Confirmar reserva]]).
