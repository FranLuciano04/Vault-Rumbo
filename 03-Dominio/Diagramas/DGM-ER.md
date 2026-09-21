---
tipo: diagrama
estado: borrador
modulo: []
responsable: Guardián del dominio
pc: pc1
actualizado: 21/09/26
---
# DGM-ER

tags:: #tipo/diagrama #estado/borrador #pc/pc1

> Modelo entidad-relación para **PostgreSQL**. Salida del [[MOC — Modelo de dominio|modelo de dominio]]; mantener sincronizado con las notas de entidad.

```mermaid
erDiagram
    USUARIO ||--o{ VIAJE : gestiona
    USUARIO ||--o{ VIAJE : vende
    USUARIO ||--o{ CONTENIDO_RED : crea
    CLIENTE ||--o{ OPORTUNIDAD : genera
    CLIENTE ||--o{ VIAJE : realiza
    CLIENTE ||--o{ RESENA : deja
    OPORTUNIDAD ||--o{ COTIZACION : produce
    OPORTUNIDAD ||--o| VIAJE : deriva
    DESTINO ||--o{ VIAJE : ubica
    DESTINO ||--o{ HOTEL : agrupa
    OPERADOR ||--o{ VIAJE : provee
    VIAJE ||--o{ PAGO : tiene
    VIAJE ||--o{ ALERTA : dispara
    VIAJE ||--o{ VIAJE_HOTEL : incluye
    HOTEL ||--o{ VIAJE_HOTEL : figura_en
    HOTEL ||--o{ RESENA : recibe
    CLIENTE ||--o{ RESENA : deja
    VIAJE ||--o{ RESENA : contextualiza
```

> Relación N:M Viaje–Hotel modelada con la tabla intermedia `VIAJE_HOTEL`, y objeto de la Reseña (Hotel + Cliente, con Viaje opcional): ver [[DEC-0003 Relación Viaje–Hotel y Reseña]].
> `VIAJE.destino_id` y `HOTEL.destino_id` son FK a `DESTINO` (antes texto libre): ver [[DEC-0006 Destino como entidad de catálogo]].
> `VIAJE` suma `operador_id` (FK a `OPERADOR`), `vendedor_id` (FK a `USUARIO`), `moneda`, `costo`, `ganancia`, `margen`, `comision_vendedor` — ver [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] y [[DEC-0009 Operador-Proveedor como entidad de catálogo]] (sync 17/09).
> `PAGO` lleva `monto` (en la moneda del viaje), `tipo`, `vencimiento`, `estado` (`pendiente · pagado · vencido · anulado`) y, cargados al cobrar, `forma_pago`, `moneda_pago`, `tipo_cambio` y `monto_cobrado` (multimoneda por pago, Q6.1/Q4/Q7 del 18/09 — ver [[Pago]]).

## Tabla intermedia VIAJE_HOTEL
- **PK: `id` propio (UUID)** — no compuesta (ver "Resuelto 21/09" más abajo).
- FK `viaje_id` → VIAJE, FK `hotel_id` → HOTEL (índice no-único en el par, para consultas).
- Atributos: `check_in` (date), `check_out` (date), `orden` (int, itinerario; único junto a `viaje_id`), `vencimiento_pago_proveedor` (date, nullable) y `pago_proveedor_realizado` (bool) — vencimiento de pago al proveedor por hotel, con [[Alerta]] un mes antes ([[CU-09 Armar itinerario de hoteles]], [[DEC-0003 Relación Viaje–Hotel y Reseña]]).
- La RESENA lleva FK `cliente_id`, `hotel_id` y `viaje_id` **nullable** (trazabilidad opcional).

## Resuelto 21/09 (Nahuel, a ratificar en sync)
- **`VIAJE_HOTEL` usa `id` propio, no PK compuesta `(viaje_id, hotel_id)`.** Motivo: un mismo `HOTEL` puede aparecer en **más de un tramo** del mismo `VIAJE` (ej. Buenos Aires → Bariloche → Buenos Aires, con el mismo hotel porteño en ida y vuelta), y cada tramo puede llevar su propio `vencimiento_pago_proveedor` — la PK compuesta lo impedía. Detalle y justificación completa en [[DEC-0003 Relación Viaje–Hotel y Reseña]] (refinamiento sobre el `#accion/decidir` que esa DEC había dejado abierto).
