---
tipo: decision
estado: en-revision
modulo: [viajes, hoteles, clientes]
decisores: [Francisco]
fecha_aprobacion:
supersede:
actualizado: 10/09/26
---
# DEC-0003 Relación Viaje–Hotel y Reseña

tags:: #tipo/decision #estado/en-revision #pc/pc1

## Contexto
Las notas de dominio se contradecían sobre dos puntos (ver [[MOC — Modelo de dominio]] y [[DGM-ER]]):
- **Cardinalidad Viaje–Hotel:** el diagrama de clases usaba `Viaje * — 1..* Hotel` (obligaba a ≥1 hotel por viaje) mientras que [[Viaje]] y [[Hotel]] usaban la notación ambigua `*..1..*`.
- **Objeto de la Reseña:** [[Reseña]] decía "sobre un Hotel (o el Viaje)", sin resolver a quién pertenece.

## Decisión
1. **Viaje ⇄ Hotel = N:M**, con **tabla intermedia** `viaje_hotel`. Un [[Hotel]] aparece en muchos [[Viaje|Viajes]] (muchos pasajeros lo alojaron); un [[Viaje]] puede incluir varios hoteles (ej. tour de Europa multi-ciudad).
2. La **[[Reseña]] la deja el [[Cliente]] que viajó, sobre un [[Hotel]]**. Un hotel puede tener muchas reseñas. La Reseña pertenece a un `Hotel` (1) y a un `Cliente` (1), con `viaje_id` **opcional** para trazar de qué viaje surgió.
3. **Cardinalidades mínimas:** un `Viaje` puede tener **0** hoteles (solo aéreo, excursión, crucero) y un `Hotel` puede estar en catálogo con **0** viajes. → `Viaje 0..* — 0..* Hotel`. _(Supuesto a validar en la sync.)_

### Tabla intermedia `viaje_hotel`
- Clave primaria compuesta `(viaje_id, hotel_id)` o `id` propio si se repite el hotel en tramos distintos.
- Atributos sugeridos: `check_in` (Date), `check_out` (Date), `orden` (Int, para el itinerario). _(A refinar en [[DGM-ER]].)_

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
- Decisores: Francisco (10/09/26) — Aprobada: _(pendiente sync)_
