---
tipo: decision
estado: formalizado
modulo: [viajes, hoteles, clientes]
decisores: [Francisco]
fecha_aprobacion: 11/09/26
supersede:
actualizado: 21/09/26
---
# DEC-0003 Relación Viaje–Hotel y Reseña

tags:: #tipo/decision #estado/formalizado #pc/pc1

## Contexto
Las notas de dominio se contradecían sobre dos puntos (ver [[MOC — Modelo de dominio]] y [[DGM-ER]]):
- **Cardinalidad Viaje–Hotel:** el diagrama de clases usaba `Viaje * — 1..* Hotel` (obligaba a ≥1 hotel por viaje) mientras que [[Viaje]] y [[Hotel]] usaban la notación ambigua `*..1..*`.
- **Objeto de la Reseña:** [[Reseña]] decía "sobre un Hotel (o el Viaje)", sin resolver a quién pertenece.

## Decisión
1. **Viaje ⇄ Hotel = N:M**, con **tabla intermedia** `viaje_hotel`. Un [[Hotel]] aparece en muchos [[Viaje|Viajes]] (muchos pasajeros lo alojaron); un [[Viaje]] puede incluir varios hoteles (ej. tour de Europa multi-ciudad).
2. La **[[Reseña]] la deja el [[Cliente]] que viajó, sobre un [[Hotel]]**. Un hotel puede tener muchas reseñas. La Reseña pertenece a un `Hotel` (1) y a un `Cliente` (1), con `viaje_id` **opcional** para trazar de qué viaje surgió.
3. **Cardinalidades mínimas:** un `Viaje` puede tener **0** hoteles (solo aéreo, excursión, crucero) y un `Hotel` puede estar en catálogo con **0** viajes. → `Viaje 0..* — 0..* Hotel`. _(Supuesto a validar en la sync.)_

### Tabla intermedia `viaje_hotel`
- **Clave primaria: `id` propio (UUID)**, no compuesta `(viaje_id, hotel_id)` — ver refinamiento 21/09 más abajo.
- Atributos: `viaje_id` (FK), `hotel_id` (FK), `check_in` (Date), `check_out` (Date), `orden` (Int, para el itinerario).
- **`vencimiento_pago_proveedor`** (Date, opcional): fecha límite para pagar ese hotel al proveedor; genera una [[Alerta]] de tipo `pago` **un mes antes** (relevamiento: "cada hotel tiene una fecha de vencimiento"). Agregado 11/09 (Francisco).
- **`pago_proveedor_realizado`** (Bool): marca si ya se abonó al proveedor; al confirmarse, resuelve la [[Alerta]] asociada.

> [!success] Nahuel (21/09) — **Refinamiento del «a decidir» (ya resuelto) que dejó abierto esta DEC** ("clave compuesta o `id` propio, a refinar en [[DGM-ER]]"): se resuelve por **`id` propio**. Un mismo [[Hotel]] puede aparecer en **más de un tramo** del mismo [[Viaje]] (ej. Buenos Aires → Bariloche → Buenos Aires, alojándose dos veces en el mismo hotel porteño en tramos no consecutivos), y cada tramo puede tener su **propio** `vencimiento_pago_proveedor` (son obligaciones de pago distintas). La PK compuesta `(viaje_id, hotel_id)` lo impediría. Se agrega un índice no-único en `(viaje_id, hotel_id)` para las consultas habituales y unicidad en `(viaje_id, orden)` para no permitir dos tramos en la misma posición del itinerario. Propagado a [[DGM-ER]], [[Hotel]] y [[CU-09 Armar itinerario de hoteles]]. **A ratificar en sync** (no se marca `fecha_aprobacion` nueva; es un refinamiento de detalle sobre una DEC ya sellada).

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| N:M con tabla intermedia | Refleja tours multi-hotel y hoteles reutilizables; permite fechas por tramo | Una tabla más | ✅ |
| Viaje `1..*` Hotel obligatorio | Simple | Rompe viajes sin alojamiento (solo aéreo) | ❌ |
| Reseña sobre Hotel **y** Viaje (polimórfica) | Flexibilidad | Complica el ER (target polimórfico); no aporta al objetivo del catálogo | ❌ |

## Justificación
El [[Relevamiento — Fuente de verdad]] define el catálogo de hoteles para "consultar y recomendar", alimentado por reseñas → el objeto natural de la reseña es el **Hotel**. El N:M opcional evita forzar datos que el negocio no siempre tiene.

## Impacto
- Afecta: [[MOC — Modelo de dominio]], [[DGM-ER]], [[Viaje]], [[Hotel]], [[Reseña]].

## Decisores y fecha
- Decisores: Francisco (10/09/26) — **Aprobada: 11/09/26** (sync; Francisco y Nahuel presentes, Paloma notificada por Git). Incluye `vencimiento_pago_proveedor` en `viaje_hotel`.
