---
tipo: decision
estado: en-revision
modulo: [viajes, alertas, hoteles]
decisores: [Nahuel]
fecha_aprobacion:
supersede:
actualizado: 10/09/26
---
# DEC-0006 Destino como entidad de catálogo

tags:: #tipo/decision #estado/en-revision #pc/pc1

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

## Impacto
- Afecta: [[Destino]] (nueva), [[Viaje]] (`destino` → FK), [[Hotel]] (`destino` → FK), [[MOC — Modelo de dominio]], [[DGM-ER]], [[CU-15 Configurar recordatorios por destino]], [[CU-26 Gestionar destinos]] y el checklist de entidades en [[Estado del proyecto]] (10 → 11).

## Decisores y fecha
- Decisores: Nahuel (10/09/26) — Aprobada: _(pendiente sync)_
