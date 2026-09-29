---
tipo: analisis
estado: borrador
modulo: []
responsable: Nahuel
pc: pc1
actualizado: 29/09/26
---
# Modelo de datos SQL

tags:: #tipo/analisis #estado/borrador #pc/pc1

> Responde a la lámina del PC1 «Modelo de datos SQL» (paso **F2** del plan). El script es [`rumbo.sql`](rumbo.sql), en esta misma carpeta. Se deriva del [[DGM-ER]], que es la fuente: si cambia el ER, se cambia primero el ER y después el script.

## Qué contiene
- **15 tablas:** las 13 entidades del dominio, la tabla asociativa `viaje_hotel` y la tabla de parámetros `configuracion` (una sola fila, [[DEC-0013 Datos que faltaban en el ER|DEC-0013]]), con los mismos nombres del [[DGM-ER]] en minúscula.
- **19 enumeraciones nativas** (`CREATE TYPE … AS ENUM`), con los valores del ER.
- **Claves:** toda clave primaria es `uuid` con `gen_random_uuid()`, que viene incluida en PostgreSQL 13 o superior sin extensiones.
- **Auditoría** ([[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]]): las 13 tablas de entidad y `configuracion` llevan `created_by`, `updated_by`, `created_at` y `updated_at`. `created_by` y `updated_by` son **nullable**: vacío significa «lo hizo el proceso automático». `viaje_hotel` no las lleva porque hereda la auditoría del viaje. Las completa `core.db` en la API ([[ARQ — Vista general]]).
- **Restricciones del modelo:**
  - `alerta`: a lo sumo un origen (`viaje_id`, `pago_id`, `oportunidad_id` o `cliente_id`); ninguno en una alerta manual suelta.
  - `viaje_hotel`: `id` propio, índice **no único** en `(viaje_id, hotel_id)` y **único** en `(viaje_id, orden)`, porque el mismo hotel puede aparecer en dos tramos del mismo viaje ([[DEC-0003 Relación Viaje–Hotel y Reseña|DEC-0003]]).
  - `viaje.oportunidad_id` es único: una oportunidad deriva en a lo sumo un viaje.
  - `viaje.ganancia` y `viaje.margen` son **columnas calculadas** (`precio_venta − costo` y `ganancia / precio_venta`, [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]]).
  - Comisión ([[DEC-0013 Datos que faltaban en el ER|DEC-0013]]): si es `porcentaje`, no pasa de 100; en `usuario`, el tipo y el valor por defecto van juntos o no van.
  - `configuracion` admite una sola fila (`id = 1`).
  - Chequeos de sentido común: fechas de regreso, salida y check-out que no quedan antes de las de inicio; puntaje de reseña de 1 a 5; montos no negativos; al menos un pasajero.
- **Bajas lógicas:** ninguna FK borra en cascada, porque en Rumbo nada se elimina físicamente.

## Lo que queda en la API y no en la base
- **Todo viaje tiene al menos un pago** (`VIAJE ||--|{ PAGO`): una FK no puede exigir filas hijas, así que lo garantiza el servicio de CU-07.
- Las **fechas que dependen de un parámetro** (vencimiento de la cotización, fecha de la alerta `salida`) las calcula la API al crear el registro, leyendo `configuracion`.
- Las **transiciones de estado** de los `EST-*` viven en `negocio/estados/`.

## Criterios de escritura
- Los **valores de los enum** se copian del [[DGM-ER]], que escribe `en_gestion`, `vacunacion` y `en_produccion` sin tilde, pero conserva la ñ en `dueño`, `seña` y `reseña`. El [[DGM — Diagrama de clases]] sí lleva tildes (`en_gestión`, `vacunación`, `en_producción`). PostgreSQL acepta ambas formas; el script sigue al ER por ser la fuente del esquema.
- Largos de `varchar` y precisión de `numeric` (`numeric(14,2)` para importes y `numeric(14,4)` para el tipo de cambio) son decisiones de implementación, no datos del negocio.

## Validación
Se validó el 29/09/26 en un **PostgreSQL 18.3** local, en un clúster temporal creado solo para la prueba y borrado al terminar. El script corre completo sin errores y deja 15 tablas y 19 enumeraciones, con la fila de `configuracion` cargada con los valores validados con la agencia (1 mes, 7 días y 6 meses). Además se probaron, dentro de una transacción que se deshizo:
- **Casos permitidos:** un usuario con `created_by` vacío, el mismo hotel en dos tramos del mismo viaje, una alerta manual sin origen y el cálculo de `ganancia` (250.000) y `margen` (0,25) para una venta de $ 1.000.000 con costo de $ 750.000.
- **Casos rechazados, como se esperaba:** una alerta con dos orígenes, un `orden` repetido en el mismo viaje, dos viajes desde la misma oportunidad, un puntaje de 6, un regreso anterior a la salida, un valor de enum inexistente, un email de usuario repetido una FK a un cliente inexistente, una segunda fila de `configuracion`, una comisión de viaje mayor al 100 % y una comisión por defecto con tipo pero sin valor.

Para repetir la prueba sobre una base vacía:
```bash
psql -d rumbo -v ON_ERROR_STOP=1 -f "05-Diseño/Datos/rumbo.sql"
```

## En PC2
La primera migración de Alembic reproduce este script ([[ARQ — Vista general]], *Persistencia y migraciones*). Desde ahí, el esquema lo mandan las migraciones y este archivo queda como foto del PC1.
