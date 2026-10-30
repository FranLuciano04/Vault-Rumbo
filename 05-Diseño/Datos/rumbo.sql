-- =============================================================================
-- Rumbo — modelo de datos (PostgreSQL 13 o superior)
-- Fuente: 03-Dominio/Diagramas/DGM-ER.md · Índice: 05-Diseño/Datos/Modelo de datos SQL.md
-- DDL escrito a mano para el PC1. En PC2, la primera migración de Alembic lo reproduce.
-- Se ejecuta sobre una base vacía:  psql -d rumbo -v ON_ERROR_STOP=1 -f rumbo.sql
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Enumeraciones (20), con los valores del DGM-ER
-- -----------------------------------------------------------------------------
CREATE TYPE rol_usuario        AS ENUM ('admin', 'empleado', 'dueno', 'freelance');
CREATE TYPE tipo_comision      AS ENUM ('importe', 'porcentaje');  -- el porcentaje es sobre la ganancia (DEC-0007, DEC-0013)
CREATE TYPE segmento_cliente   AS ENUM ('familia', 'amigos', 'individual', 'pareja');
CREATE TYPE canal_oportunidad  AS ENUM ('instagram', 'whatsapp', 'presencial');
CREATE TYPE estado_oportunidad AS ENUM ('nueva', 'en_gestion', 'cotizada', 'ganada', 'perdida');
CREATE TYPE motivo_perdida     AS ENUM ('precio', 'fechas_disponibilidad', 'desistio', 'otra_agencia', 'sin_respuesta', 'otro');
CREATE TYPE moneda             AS ENUM ('ARS', 'USD');
CREATE TYPE estado_cotizacion  AS ENUM ('borrador', 'enviada', 'aceptada', 'rechazada', 'vencida');
CREATE TYPE categoria_viaje    AS ENUM ('grupal', 'individual');
CREATE TYPE estado_viaje       AS ENUM ('reservado', 'vendido', 'confirmado', 'en_curso', 'finalizado', 'cancelado');
CREATE TYPE tipo_pago          AS ENUM ('sena', 'cuota', 'saldo');
CREATE TYPE estado_pago        AS ENUM ('pendiente', 'pagado', 'vencido', 'anulado');
CREATE TYPE forma_pago         AS ENUM ('efectivo', 'transferencia', 'tarjeta_credito', 'tarjeta_debito', 'cheque', 'deposito');
CREATE TYPE tipo_requisito     AS ENUM ('visa', 'vacunacion', 'documentacion', 'seguro', 'formulario', 'otro');
CREATE TYPE estado_hotel       AS ENUM ('activo', 'cerrado');
CREATE TYPE estado_resena      AS ENUM ('publicada', 'oculta');
CREATE TYPE tipo_alerta        AS ENUM ('pago', 'formulario', 'salida', 'insistencia', 'resena', 'manual', 'recontacto', 'viaje');
CREATE TYPE estado_alerta      AS ENUM ('pendiente', 'vista', 'resuelta');
CREATE TYPE canal_contenido    AS ENUM ('instagram', 'tiktok', 'whatsapp_ventas');
CREATE TYPE estado_kanban      AS ENUM ('idea', 'en_produccion', 'listo', 'publicado', 'descartado');

-- -----------------------------------------------------------------------------
-- Auditoría (DEC-0008): en las 13 tablas de entidad y en configuracion van
--   created_by / updated_by  uuid NULL → usuario   (vacío = lo hizo el proceso automático)
--   created_at / updated_at  timestamptz NOT NULL
-- viaje_hotel no las lleva: hereda la auditoría de viaje.
-- Todas las bajas son lógicas, así que las FK usan la regla por defecto (NO ACTION).
-- -----------------------------------------------------------------------------

-- Catálogos y usuarios -------------------------------------------------------

CREATE TABLE usuario (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        varchar(120) NOT NULL,
    email         varchar(254) NOT NULL UNIQUE,
    firebase_uid  varchar(128) NOT NULL UNIQUE,       -- cuenta de Firebase Authentication (DEC-0016)
    rol           rol_usuario  NOT NULL,
    activo        boolean      NOT NULL DEFAULT true,  -- baja lógica; inactivo no inicia sesión (DEC-0013)
    acceso_redes  boolean      NOT NULL DEFAULT false, -- capacidad; admin y dueño la tienen por rol (DEC-0013)
    comision_default_tipo  tipo_comision,              -- comisión por defecto del vendedor (CU-13)
    comision_default_valor numeric(14,2) CHECK (comision_default_valor >= 0),
    created_by    uuid REFERENCES usuario (id),
    updated_by    uuid REFERENCES usuario (id),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT usuario_comision_default_ck CHECK (
        (comision_default_tipo IS NULL) = (comision_default_valor IS NULL)
        AND (comision_default_tipo IS DISTINCT FROM 'porcentaje' OR comision_default_valor <= 100)
    )
);

-- Parámetros del negocio que edita admin (DEC-0013). Una sola fila; no es una entidad del dominio.
CREATE TABLE configuracion (
    id                        smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    vigencia_cotizacion_meses integer NOT NULL DEFAULT 1 CHECK (vigencia_cotizacion_meses >= 1),
    anticipacion_salida_dias  integer NOT NULL DEFAULT 7 CHECK (anticipacion_salida_dias >= 0),
    recontacto_meses          integer NOT NULL DEFAULT 6 CHECK (recontacto_meses >= 1),
    created_by                uuid REFERENCES usuario (id),
    updated_by                uuid REFERENCES usuario (id),
    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz NOT NULL DEFAULT now()
);
INSERT INTO configuracion DEFAULT VALUES;  -- valores validados con la agencia

CREATE TABLE destino (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     varchar(120) NOT NULL,
    pais       varchar(80)  NOT NULL,
    region     varchar(80),
    activo     boolean      NOT NULL DEFAULT true,    -- baja lógica
    notas      text,
    created_by uuid REFERENCES usuario (id),
    updated_by uuid REFERENCES usuario (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE requisito_destino (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    destino_id        uuid           NOT NULL REFERENCES destino (id),
    nombre            varchar(120)   NOT NULL,        -- ej. «Visa EE.UU.»
    tipo              tipo_requisito NOT NULL,
    obligatorio       boolean        NOT NULL,        -- obligatorio o recomendado
    descripcion       text,
    anticipacion_dias integer        NOT NULL CHECK (anticipacion_dias >= 0),
    activo            boolean        NOT NULL DEFAULT true,
    created_by        uuid REFERENCES usuario (id),
    updated_by        uuid REFERENCES usuario (id),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE operador (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     varchar(120) NOT NULL,
    contacto   varchar(200),
    activo     boolean      NOT NULL DEFAULT true,    -- baja lógica, DEC-0009
    created_by uuid REFERENCES usuario (id),
    updated_by uuid REFERENCES usuario (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE hotel (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    destino_id        uuid          NOT NULL REFERENCES destino (id),
    nombre            varchar(120)  NOT NULL,
    categoria         varchar(40)   NOT NULL,         -- estrellas o tipo
    precio_referencia numeric(14,2) NOT NULL CHECK (precio_referencia >= 0),  -- por noche
    servicios         text          NOT NULL,         -- amenities filtrables
    estado            estado_hotel  NOT NULL DEFAULT 'activo',
    created_by        uuid REFERENCES usuario (id),
    updated_by        uuid REFERENCES usuario (id),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Circuito comercial ---------------------------------------------------------

CREATE TABLE cliente (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asesor_asignado_id uuid REFERENCES usuario (id),
    nombre             varchar(120)     NOT NULL,
    contacto           varchar(200)     NOT NULL,     -- whatsapp, instagram o email
    segmento           segmento_cliente NOT NULL,
    etiquetas          text[]           NOT NULL DEFAULT '{}',  -- segmentación comercial libre
    preferencias       text,
    no_recontactar     boolean          NOT NULL DEFAULT false, -- opt-out del CRM proactivo
    created_by         uuid REFERENCES usuario (id),
    updated_by         uuid REFERENCES usuario (id),
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE oportunidad (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id            uuid               NOT NULL REFERENCES cliente (id),
    responsable_id        uuid               NOT NULL REFERENCES usuario (id),
    canal                 canal_oportunidad  NOT NULL,
    destino_consultado    varchar(200)       NOT NULL, -- texto libre, se normaliza al derivar (DEC-0006)
    fecha_desde_tentativa date,
    fecha_hasta_tentativa date,
    pasajeros             integer            NOT NULL CHECK (pasajeros >= 1),
    estado                estado_oportunidad NOT NULL DEFAULT 'nueva',
    motivo_perdida        motivo_perdida,             -- obligatorio al cerrar perdida (CU-05 A2, DEC-0013)
    motivo_perdida_detalle text,                      -- texto libre si el motivo es otro
    notas                 text,                       -- notas de la consulta y del seguimiento (DEC-0013)
    created_by            uuid REFERENCES usuario (id),
    updated_by            uuid REFERENCES usuario (id),
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    CHECK (fecha_hasta_tentativa >= fecha_desde_tentativa),
    CONSTRAINT oportunidad_motivo_perdida_ck CHECK ((estado = 'perdida') = (motivo_perdida IS NOT NULL))
);

CREATE TABLE cotizacion (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    oportunidad_id uuid              NOT NULL REFERENCES oportunidad (id),
    fecha          date              NOT NULL,
    moneda         moneda            NOT NULL,
    items          jsonb             NOT NULL,        -- conceptos y precios
    total          numeric(14,2)     NOT NULL CHECK (total >= 0),
    validez_hasta  date              NOT NULL,        -- default fecha + 1 mes, configurable (lo calcula la API)
    estado         estado_cotizacion NOT NULL DEFAULT 'borrador',
    created_by     uuid REFERENCES usuario (id),
    updated_by     uuid REFERENCES usuario (id),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CHECK (validez_hasta >= fecha)
);

CREATE TABLE viaje (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id        uuid            NOT NULL REFERENCES cliente (id),
    oportunidad_id    uuid UNIQUE     REFERENCES oportunidad (id),  -- origen; una oportunidad deriva en a lo sumo un viaje
    destino_id        uuid            NOT NULL REFERENCES destino (id),
    operador_id       uuid            REFERENCES operador (id),
    responsable_id    uuid            NOT NULL REFERENCES usuario (id),
    vendedor_id       uuid            REFERENCES usuario (id),
    fecha_salida      date            NOT NULL,
    fecha_regreso     date            NOT NULL,
    categoria         categoria_viaje NOT NULL,
    estado            estado_viaje    NOT NULL DEFAULT 'reservado',
    estado_previo     estado_viaje,                   -- estado antes de cancelarse, para revertir (CU-27 A3, DEC-0013)
    motivo_cancelacion text,                          -- solo si cancelado (CU-27, DEC-0013)
    fecha_cancelacion date,                           -- solo si cancelado
    moneda            moneda          NOT NULL,       -- moneda de referencia del viaje (DEC-0007)
    precio_venta      numeric(14,2)   NOT NULL CHECK (precio_venta >= 0),
    costo             numeric(14,2)   NOT NULL CHECK (costo >= 0),  -- del operador
    ganancia          numeric(14,2)   GENERATED ALWAYS AS (precio_venta - costo) STORED,
    margen            numeric(7,4)    GENERATED ALWAYS AS (
                          CASE WHEN precio_venta > 0 THEN (precio_venta - costo) / precio_venta END
                      ) STORED,                       -- fracción sobre la venta (0,25 = 25 %)
    comision_tipo     tipo_comision   NOT NULL,       -- cómo se lee comision_vendedor (DEC-0013)
    comision_vendedor numeric(14,2)   NOT NULL CHECK (comision_vendedor >= 0),  -- importe, o % sobre la ganancia (DEC-0007)
    created_by        uuid REFERENCES usuario (id),
    updated_by        uuid REFERENCES usuario (id),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CHECK (fecha_regreso >= fecha_salida),
    CONSTRAINT viaje_comision_porcentaje_ck CHECK (comision_tipo <> 'porcentaje' OR comision_vendedor <= 100),
    -- estado previo, motivo y fecha de cancelación: los tres cargados solo mientras el viaje está cancelado
    CONSTRAINT viaje_estado_previo_ck CHECK (
        num_nonnulls(estado_previo, motivo_cancelacion, fecha_cancelacion) = CASE WHEN estado = 'cancelado' THEN 3 ELSE 0 END
        AND estado_previo IS DISTINCT FROM 'cancelado'
    )
);

-- Todo viaje tiene al menos un pago (VIAJE ||--|{ PAGO): lo garantiza la API en CU-07,
-- porque una FK no puede exigir filas hijas.
CREATE TABLE pago (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    viaje_id      uuid          NOT NULL REFERENCES viaje (id),
    monto         numeric(14,2) NOT NULL CHECK (monto > 0),  -- planificado, en viaje.moneda
    tipo          tipo_pago     NOT NULL,
    vencimiento   date          NOT NULL,
    estado        estado_pago   NOT NULL DEFAULT 'pendiente',
    forma_pago    forma_pago,                                -- se carga al cobrar
    moneda_pago   moneda,                                    -- se carga al cobrar
    tipo_cambio   numeric(14,4) CHECK (tipo_cambio > 0),     -- si difiere de viaje.moneda
    monto_cobrado numeric(14,2) CHECK (monto_cobrado > 0),   -- real recibido
    fecha_cobro   date,                                      -- fecha efectiva del cobro (DEC-0013)
    -- Posterior a este DDL (T-099, migración Alembic 0009): anulado_por_cancelacion boolean
    -- NOT NULL DEFAULT false, con CHECK (NOT anulado_por_cancelacion OR estado = 'anulado').
    created_by    uuid REFERENCES usuario (id),
    updated_by    uuid REFERENCES usuario (id),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Tabla asociativa Viaje–Hotel (DEC-0003): id propio porque el mismo hotel
-- puede aparecer en tramos no consecutivos del mismo viaje.
CREATE TABLE viaje_hotel (
    id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    viaje_id                   uuid    NOT NULL REFERENCES viaje (id),
    hotel_id                   uuid    NOT NULL REFERENCES hotel (id),
    check_in                   date    NOT NULL,
    check_out                  date    NOT NULL,
    orden                      integer NOT NULL CHECK (orden >= 1),
    vencimiento_pago_proveedor date,
    pago_proveedor_realizado   boolean NOT NULL DEFAULT false,
    CONSTRAINT viaje_hotel_orden_uk UNIQUE (viaje_id, orden),
    CHECK (check_out >= check_in)
);
CREATE INDEX viaje_hotel_viaje_hotel_ix ON viaje_hotel (viaje_id, hotel_id);  -- no único

-- Post-venta, alertas y redes ------------------------------------------------

CREATE TABLE resena (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id uuid          NOT NULL REFERENCES cliente (id),
    hotel_id   uuid          NOT NULL REFERENCES hotel (id),
    viaje_id   uuid          REFERENCES viaje (id),              -- trazabilidad opcional
    puntaje    integer       NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
    comentario text          NOT NULL,
    fecha      date          NOT NULL,
    estado     estado_resena NOT NULL DEFAULT 'publicada',
    motivo_baja text,                                          -- motivo al ocultarla (CU-29, DEC-0013)
    created_by uuid REFERENCES usuario (id),
    updated_by uuid REFERENCES usuario (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT resena_motivo_baja_ck CHECK ((estado = 'oculta') = (motivo_baja IS NOT NULL))
);

CREATE TABLE alerta (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    propietario_id          uuid          NOT NULL REFERENCES usuario (id),  -- agenda personal
    viaje_id                uuid          REFERENCES viaje (id),             -- origen
    pago_id                 uuid          REFERENCES pago (id),              -- origen
    oportunidad_id          uuid          REFERENCES oportunidad (id),       -- origen
    cliente_id              uuid          REFERENCES cliente (id),           -- origen
    viaje_hotel_id          uuid          REFERENCES viaje_hotel (id) ON DELETE SET NULL,  -- origen: pago al proveedor del tramo (DEC-0013); quitar el tramo (CU-09 A3) no borra la alerta
    tipo                    tipo_alerta   NOT NULL,
    descripcion             text          NOT NULL,                          -- qué hay que hacer (CU-28, DEC-0013)
    fecha                   date          NOT NULL,
    estado                  estado_alerta NOT NULL DEFAULT 'pendiente',
    resuelta_en             timestamptz,                                     -- cuándo se resolvió; progreso del día (CU-14, DEC-0013)
    cerrada_por_cancelacion boolean       NOT NULL DEFAULT false,
    created_by              uuid REFERENCES usuario (id),
    updated_by              uuid REFERENCES usuario (id),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    -- a lo sumo uno de los cinco orígenes; ninguno en una alerta manual suelta (CU-28)
    CONSTRAINT alerta_resuelta_en_ck CHECK ((estado = 'resuelta') = (resuelta_en IS NOT NULL)),
    CONSTRAINT alerta_un_origen_ck
        CHECK (num_nonnulls(viaje_id, pago_id, oportunidad_id, cliente_id, viaje_hotel_id) <= 1)
);

CREATE TABLE contenido_red (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id        uuid            NOT NULL REFERENCES usuario (id),
    titulo            varchar(200)    NOT NULL,
    texto             text,                           -- cuerpo del posteo; puede venir del borrador de CU-20 (DEC-0013)
    canal             canal_contenido NOT NULL,
    estado_kanban     estado_kanban   NOT NULL DEFAULT 'idea',
    fecha_publicacion date            NOT NULL,       -- programada
    created_by        uuid REFERENCES usuario (id),
    updated_by        uuid REFERENCES usuario (id),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMIT;
