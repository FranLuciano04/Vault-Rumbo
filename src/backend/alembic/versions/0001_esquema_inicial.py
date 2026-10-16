"""Esquema inicial: reproduce `05-Diseño/Datos/rumbo.sql` (DEC-0015, DEC-0013).

Revision ID: 0001
Revises:
"""

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

# Una sentencia por elemento: asyncpg no ejecuta varias en una sola llamada.
_SENTENCIAS = [
    """
CREATE TYPE rol_usuario        AS ENUM ('admin', 'empleado', 'dueno', 'freelance')
    """,
    """
CREATE TYPE tipo_comision      AS ENUM ('importe', 'porcentaje')
    """,
    """
CREATE TYPE segmento_cliente   AS ENUM ('familia', 'amigos', 'individual', 'pareja')
    """,
    """
CREATE TYPE canal_oportunidad  AS ENUM ('instagram', 'whatsapp', 'presencial')
    """,
    """
CREATE TYPE estado_oportunidad AS ENUM ('nueva', 'en_gestion', 'cotizada', 'ganada', 'perdida')
    """,
    """
CREATE TYPE motivo_perdida     AS ENUM ('precio', 'fechas_disponibilidad', 'desistio', 'otra_agencia', 'sin_respuesta', 'otro')
    """,
    """
CREATE TYPE moneda             AS ENUM ('ARS', 'USD')
    """,
    """
CREATE TYPE estado_cotizacion  AS ENUM ('borrador', 'enviada', 'aceptada', 'rechazada', 'vencida')
    """,
    """
CREATE TYPE categoria_viaje    AS ENUM ('grupal', 'individual')
    """,
    """
CREATE TYPE estado_viaje       AS ENUM ('reservado', 'vendido', 'confirmado', 'en_curso', 'finalizado', 'cancelado')
    """,
    """
CREATE TYPE tipo_pago          AS ENUM ('sena', 'cuota', 'saldo')
    """,
    """
CREATE TYPE estado_pago        AS ENUM ('pendiente', 'pagado', 'vencido', 'anulado')
    """,
    """
CREATE TYPE forma_pago         AS ENUM ('efectivo', 'transferencia', 'tarjeta_credito', 'tarjeta_debito', 'cheque', 'deposito')
    """,
    """
CREATE TYPE tipo_requisito     AS ENUM ('visa', 'vacunacion', 'documentacion', 'seguro', 'formulario', 'otro')
    """,
    """
CREATE TYPE estado_hotel       AS ENUM ('activo', 'cerrado')
    """,
    """
CREATE TYPE estado_resena      AS ENUM ('publicada', 'oculta')
    """,
    """
CREATE TYPE tipo_alerta        AS ENUM ('pago', 'formulario', 'salida', 'insistencia', 'resena', 'manual', 'recontacto', 'viaje')
    """,
    """
CREATE TYPE estado_alerta      AS ENUM ('pendiente', 'vista', 'resuelta')
    """,
    """
CREATE TYPE canal_contenido    AS ENUM ('instagram', 'tiktok', 'whatsapp_ventas')
    """,
    """
CREATE TYPE estado_kanban      AS ENUM ('idea', 'en_produccion', 'listo', 'publicado', 'descartado')
    """,
    """
CREATE TABLE usuario (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        varchar(120) NOT NULL,
    email         varchar(254) NOT NULL UNIQUE,
    firebase_uid  varchar(128) NOT NULL UNIQUE,       
    rol           rol_usuario  NOT NULL,
    activo        boolean      NOT NULL DEFAULT true,  
    acceso_redes  boolean      NOT NULL DEFAULT false, 
    comision_default_tipo  tipo_comision,              
    comision_default_valor numeric(14,2) CHECK (comision_default_valor >= 0),
    created_by    uuid REFERENCES usuario (id),
    updated_by    uuid REFERENCES usuario (id),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT usuario_comision_default_ck CHECK (
        (comision_default_tipo IS NULL) = (comision_default_valor IS NULL)
        AND (comision_default_tipo IS DISTINCT FROM 'porcentaje' OR comision_default_valor <= 100)
    )
)
    """,
    """
CREATE TABLE configuracion (
    id                        smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    vigencia_cotizacion_meses integer NOT NULL DEFAULT 1 CHECK (vigencia_cotizacion_meses >= 1),
    anticipacion_salida_dias  integer NOT NULL DEFAULT 7 CHECK (anticipacion_salida_dias >= 0),
    recontacto_meses          integer NOT NULL DEFAULT 6 CHECK (recontacto_meses >= 1),
    created_by                uuid REFERENCES usuario (id),
    updated_by                uuid REFERENCES usuario (id),
    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz NOT NULL DEFAULT now()
)
    """,
    """
INSERT INTO configuracion DEFAULT VALUES
    """,
    """
CREATE TABLE destino (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     varchar(120) NOT NULL,
    pais       varchar(80)  NOT NULL,
    region     varchar(80),
    activo     boolean      NOT NULL DEFAULT true,    
    notas      text,
    created_by uuid REFERENCES usuario (id),
    updated_by uuid REFERENCES usuario (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
)
    """,
    """
CREATE TABLE requisito_destino (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    destino_id        uuid           NOT NULL REFERENCES destino (id),
    nombre            varchar(120)   NOT NULL,        
    tipo              tipo_requisito NOT NULL,
    obligatorio       boolean        NOT NULL,        
    descripcion       text,
    anticipacion_dias integer        NOT NULL CHECK (anticipacion_dias >= 0),
    activo            boolean        NOT NULL DEFAULT true,
    created_by        uuid REFERENCES usuario (id),
    updated_by        uuid REFERENCES usuario (id),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
)
    """,
    """
CREATE TABLE operador (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     varchar(120) NOT NULL,
    contacto   varchar(200),
    activo     boolean      NOT NULL DEFAULT true,    
    created_by uuid REFERENCES usuario (id),
    updated_by uuid REFERENCES usuario (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
)
    """,
    """
CREATE TABLE hotel (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    destino_id        uuid          NOT NULL REFERENCES destino (id),
    nombre            varchar(120)  NOT NULL,
    categoria         varchar(40)   NOT NULL,         
    precio_referencia numeric(14,2) NOT NULL CHECK (precio_referencia >= 0),  
    servicios         text          NOT NULL,         
    estado            estado_hotel  NOT NULL DEFAULT 'activo',
    created_by        uuid REFERENCES usuario (id),
    updated_by        uuid REFERENCES usuario (id),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
)
    """,
    """
CREATE TABLE cliente (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asesor_asignado_id uuid REFERENCES usuario (id),
    nombre             varchar(120)     NOT NULL,
    contacto           varchar(200)     NOT NULL,     
    segmento           segmento_cliente NOT NULL,
    etiquetas          text[]           NOT NULL DEFAULT '{}',  
    preferencias       text,
    no_recontactar     boolean          NOT NULL DEFAULT false, 
    created_by         uuid REFERENCES usuario (id),
    updated_by         uuid REFERENCES usuario (id),
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
)
    """,
    """
CREATE TABLE oportunidad (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id            uuid               NOT NULL REFERENCES cliente (id),
    responsable_id        uuid               NOT NULL REFERENCES usuario (id),
    canal                 canal_oportunidad  NOT NULL,
    destino_consultado    varchar(200)       NOT NULL, 
    fecha_desde_tentativa date,
    fecha_hasta_tentativa date,
    pasajeros             integer            NOT NULL CHECK (pasajeros >= 1),
    estado                estado_oportunidad NOT NULL DEFAULT 'nueva',
    motivo_perdida        motivo_perdida,             
    motivo_perdida_detalle text,                      
    notas                 text,                       
    created_by            uuid REFERENCES usuario (id),
    updated_by            uuid REFERENCES usuario (id),
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    CHECK (fecha_hasta_tentativa >= fecha_desde_tentativa),
    CONSTRAINT oportunidad_motivo_perdida_ck CHECK ((estado = 'perdida') = (motivo_perdida IS NOT NULL))
)
    """,
    """
CREATE TABLE cotizacion (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    oportunidad_id uuid              NOT NULL REFERENCES oportunidad (id),
    fecha          date              NOT NULL,
    moneda         moneda            NOT NULL,
    items          jsonb             NOT NULL,        
    total          numeric(14,2)     NOT NULL CHECK (total >= 0),
    validez_hasta  date              NOT NULL,        
    estado         estado_cotizacion NOT NULL DEFAULT 'borrador',
    created_by     uuid REFERENCES usuario (id),
    updated_by     uuid REFERENCES usuario (id),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CHECK (validez_hasta >= fecha)
)
    """,
    """
CREATE TABLE viaje (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id        uuid            NOT NULL REFERENCES cliente (id),
    oportunidad_id    uuid UNIQUE     REFERENCES oportunidad (id),  
    destino_id        uuid            NOT NULL REFERENCES destino (id),
    operador_id       uuid            REFERENCES operador (id),
    responsable_id    uuid            NOT NULL REFERENCES usuario (id),
    vendedor_id       uuid            REFERENCES usuario (id),
    fecha_salida      date            NOT NULL,
    fecha_regreso     date            NOT NULL,
    categoria         categoria_viaje NOT NULL,
    estado            estado_viaje    NOT NULL DEFAULT 'reservado',
    estado_previo     estado_viaje,                   
    motivo_cancelacion text,                          
    fecha_cancelacion date,                           
    moneda            moneda          NOT NULL,       
    precio_venta      numeric(14,2)   NOT NULL CHECK (precio_venta >= 0),
    costo             numeric(14,2)   NOT NULL CHECK (costo >= 0),  
    ganancia          numeric(14,2)   GENERATED ALWAYS AS (precio_venta - costo) STORED,
    margen            numeric(7,4)    GENERATED ALWAYS AS (
                          CASE WHEN precio_venta > 0 THEN (precio_venta - costo) / precio_venta END
                      ) STORED,                       
    comision_tipo     tipo_comision   NOT NULL,       
    comision_vendedor numeric(14,2)   NOT NULL CHECK (comision_vendedor >= 0),  
    created_by        uuid REFERENCES usuario (id),
    updated_by        uuid REFERENCES usuario (id),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CHECK (fecha_regreso >= fecha_salida),
    CONSTRAINT viaje_comision_porcentaje_ck CHECK (comision_tipo <> 'porcentaje' OR comision_vendedor <= 100),
    CONSTRAINT viaje_estado_previo_ck CHECK (
        num_nonnulls(estado_previo, motivo_cancelacion, fecha_cancelacion) = CASE WHEN estado = 'cancelado' THEN 3 ELSE 0 END
        AND estado_previo IS DISTINCT FROM 'cancelado'
    )
)
    """,
    """
CREATE TABLE pago (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    viaje_id      uuid          NOT NULL REFERENCES viaje (id),
    monto         numeric(14,2) NOT NULL CHECK (monto > 0),  
    tipo          tipo_pago     NOT NULL,
    vencimiento   date          NOT NULL,
    estado        estado_pago   NOT NULL DEFAULT 'pendiente',
    forma_pago    forma_pago,                                
    moneda_pago   moneda,                                    
    tipo_cambio   numeric(14,4) CHECK (tipo_cambio > 0),     
    monto_cobrado numeric(14,2) CHECK (monto_cobrado > 0),   
    fecha_cobro   date,                                      
    created_by    uuid REFERENCES usuario (id),
    updated_by    uuid REFERENCES usuario (id),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
)
    """,
    """
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
)
    """,
    """
CREATE INDEX viaje_hotel_viaje_hotel_ix ON viaje_hotel (viaje_id, hotel_id)
    """,
    """
CREATE TABLE resena (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id uuid          NOT NULL REFERENCES cliente (id),
    hotel_id   uuid          NOT NULL REFERENCES hotel (id),
    viaje_id   uuid          REFERENCES viaje (id),              
    puntaje    integer       NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
    comentario text          NOT NULL,
    fecha      date          NOT NULL,
    estado     estado_resena NOT NULL DEFAULT 'publicada',
    motivo_baja text,                                          
    created_by uuid REFERENCES usuario (id),
    updated_by uuid REFERENCES usuario (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT resena_motivo_baja_ck CHECK ((estado = 'oculta') = (motivo_baja IS NOT NULL))
)
    """,
    """
CREATE TABLE alerta (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    propietario_id          uuid          NOT NULL REFERENCES usuario (id),  
    viaje_id                uuid          REFERENCES viaje (id),             
    pago_id                 uuid          REFERENCES pago (id),              
    oportunidad_id          uuid          REFERENCES oportunidad (id),       
    cliente_id              uuid          REFERENCES cliente (id),           
    viaje_hotel_id          uuid          REFERENCES viaje_hotel (id) ON DELETE SET NULL,  
    tipo                    tipo_alerta   NOT NULL,
    descripcion             text          NOT NULL,                          
    fecha                   date          NOT NULL,
    estado                  estado_alerta NOT NULL DEFAULT 'pendiente',
    resuelta_en             timestamptz,                                     
    cerrada_por_cancelacion boolean       NOT NULL DEFAULT false,
    created_by              uuid REFERENCES usuario (id),
    updated_by              uuid REFERENCES usuario (id),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT alerta_resuelta_en_ck CHECK ((estado = 'resuelta') = (resuelta_en IS NOT NULL)),
    CONSTRAINT alerta_un_origen_ck
        CHECK (num_nonnulls(viaje_id, pago_id, oportunidad_id, cliente_id, viaje_hotel_id) <= 1)
)
    """,
    """
CREATE TABLE contenido_red (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id        uuid            NOT NULL REFERENCES usuario (id),
    titulo            varchar(200)    NOT NULL,
    texto             text,                           
    canal             canal_contenido NOT NULL,
    estado_kanban     estado_kanban   NOT NULL DEFAULT 'idea',
    fecha_publicacion date            NOT NULL,       
    created_by        uuid REFERENCES usuario (id),
    updated_by        uuid REFERENCES usuario (id),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
)
    """,
]

_TABLAS = (
    "contenido_red",
    "alerta",
    "resena",
    "viaje_hotel",
    "pago",
    "viaje",
    "cotizacion",
    "oportunidad",
    "cliente",
    "hotel",
    "operador",
    "requisito_destino",
    "destino",
    "configuracion",
    "usuario",
)

_ENUMS = (
    "rol_usuario",
    "tipo_comision",
    "segmento_cliente",
    "canal_oportunidad",
    "estado_oportunidad",
    "motivo_perdida",
    "moneda",
    "estado_cotizacion",
    "categoria_viaje",
    "estado_viaje",
    "tipo_pago",
    "estado_pago",
    "forma_pago",
    "tipo_requisito",
    "estado_hotel",
    "estado_resena",
    "tipo_alerta",
    "estado_alerta",
    "canal_contenido",
    "estado_kanban",
)


def upgrade() -> None:
    for sentencia in _SENTENCIAS:
        op.execute(sentencia)


def downgrade() -> None:
    for tabla in _TABLAS:
        op.execute(f"DROP TABLE {tabla}")
    for enum in _ENUMS:
        op.execute(f"DROP TYPE {enum}")
