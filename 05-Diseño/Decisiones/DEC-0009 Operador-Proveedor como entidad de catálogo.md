---
tipo: decision
estado: formalizado
modulo: [economia, viajes]
decisores: [Francisco, Nahuel, Paloma]
supersede:
fecha_aprobacion: 17/09/26
actualizado: 17/09/26
---
# DEC-0009 Operador/Proveedor como entidad de catálogo

tags:: #tipo/decision #estado/formalizado #pc/pc1

> ✅ **Ratificada en la sync del 17/09/26** (Francisco, Nahuel y Paloma). Deriva de [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] y de [[Relevamiento — respuestas de la agencia (17-09)]] (bloques 2 y 3).

## Contexto
El `costo` de un [[Viaje]] lo cobra un **operador/proveedor** (mayorista, operador turístico). Hoy no está modelado: el costo es un importe suelto. Pero el dashboard y los reportes piden **ventas por operador/proveedor** y **total pendiente de pagar a operadores** ([[CU-21 Ver dashboard y embudo]], [[CU-22 Generar reportes y estadísticas]]), lo que exige identificar al operador de forma consistente y reutilizable — no como texto libre.

## Decisión
1. Se agrega **[[Operador]]** como **entidad de catálogo compartido** (**13ª entidad**), con **ABM** (mismo criterio que [[DEC-0006 Destino como entidad de catálogo]]).
2. [[Viaje]] referencia a [[Operador]] (`*..1`, opcional): el `costo` del viaje corresponde a ese operador. Habilita *ventas por operador* y *pendiente de pago a operadores*.
3. **Baja lógica** (`activo`): un operador en uso no se elimina físicamente.
4. Se distingue del [[Hotel]] (que ya es su propio catálogo con `vencimiento_pago_proveedor` por hotel): el `Operador` es la **contraparte del paquete/costo del viaje**; el hotel es un ítem del itinerario.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Operador como entidad de catálogo | Reportes por operador; pendiente de pago consistente; reutilización | Requiere ABM y FK en Viaje | ✅ |
| `operador` como `String` libre | Cero modelado | Datos inconsistentes; sin reportes fiables por operador | ❌ |

## Restricciones
- Fechas `dd/mm/aa`; los importes de costo van con la `moneda` del [[Viaje]] ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]).
- Alcance PC1: catálogo + FK + reportes. La gestión de **pagos a operadores** se apoya en [[Pago]] y en `vencimiento_pago_proveedor` de `viaje_hotel` ([[DEC-0003 Relación Viaje–Hotel y Reseña]]); su detalle fino puede ampliarse luego.

## Impacto
- Afecta: nueva entidad **[[Operador]]**, [[Viaje]] (`operador` → FK), [[MOC — Modelo de dominio]] (12 → **13 entidades**), [[DGM-ER]], [[CU-22 Generar reportes y estadísticas]] (ventas/pagos por operador), [[CU-21 Ver dashboard y embudo]] (pendiente a operadores) y el checklist de entidades en [[Estado del proyecto]]. Su **ABM** es [[CU-31 Gestionar operadores]] (análogo a [[CU-26 Gestionar destinos]]).

## Decisores y fecha
- Ratificada en la sync del 17/09/26 (Francisco, Nahuel y Paloma presentes). **Aprobada: 17/09/26.**
