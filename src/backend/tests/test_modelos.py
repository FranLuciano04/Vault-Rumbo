"""T-007: modelos SQLAlchemy de las 15 tablas y 20 enums de `rumbo.sql`.

Todavía no hay migraciones: el esquema se crea desde `Base.metadata` dentro de la
transacción del test (DDL transaccional de PostgreSQL), que se revierte al terminar.
Requisitos: DEC-0013, DEC-0016, RNF-07.
"""

from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any, cast

import pytest
from sqlalchemy import DateTime, SmallInteger, delete, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos import modelos as m
from tests import fabricas as f

ENUMS = {
    "RolUsuario": ["admin", "empleado", "dueno", "freelance"],
    "TipoComision": ["importe", "porcentaje"],
    "SegmentoCliente": ["familia", "amigos", "individual", "pareja"],
    "CanalOportunidad": ["instagram", "whatsapp", "presencial"],
    "EstadoOportunidad": ["nueva", "en_gestion", "cotizada", "ganada", "perdida"],
    "MotivoPerdida": [
        "precio",
        "fechas_disponibilidad",
        "desistio",
        "otra_agencia",
        "sin_respuesta",
        "otro",
    ],
    "Moneda": ["ARS", "USD"],
    "EstadoCotizacion": ["borrador", "enviada", "aceptada", "rechazada", "vencida"],
    "CategoriaViaje": ["grupal", "individual"],
    "EstadoViaje": [
        "reservado",
        "vendido",
        "confirmado",
        "en_curso",
        "finalizado",
        "cancelado",
    ],
    "TipoPago": ["sena", "cuota", "saldo"],
    "EstadoPago": ["pendiente", "pagado", "vencido", "anulado"],
    "FormaPago": [
        "efectivo",
        "transferencia",
        "tarjeta_credito",
        "tarjeta_debito",
        "cheque",
        "deposito",
    ],
    "TipoRequisito": ["visa", "vacunacion", "documentacion", "seguro", "formulario", "otro"],
    "EstadoHotel": ["activo", "cerrado"],
    "EstadoResena": ["publicada", "oculta"],
    "TipoAlerta": [
        "pago",
        "formulario",
        "salida",
        "insistencia",
        "resena",
        "manual",
        "recontacto",
        "viaje",
    ],
    "EstadoAlerta": ["pendiente", "vista", "resuelta"],
    "CanalContenido": ["instagram", "tiktok", "whatsapp_ventas"],
    "EstadoKanban": ["idea", "en_produccion", "listo", "publicado", "descartado"],
}

_AUDITORIA = {"created_by", "updated_by", "created_at", "updated_at"}

# tabla -> (clase, columnas propias sin auditoría)
TABLAS: dict[str, tuple[str, set[str]]] = {
    "usuario": (
        "Usuario",
        {
            "id",
            "nombre",
            "email",
            "firebase_uid",
            "rol",
            "activo",
            "acceso_redes",
            "comision_default_tipo",
            "comision_default_valor",
        },
    ),
    "configuracion": (
        "Configuracion",
        {"id", "vigencia_cotizacion_meses", "anticipacion_salida_dias", "recontacto_meses"},
    ),
    "destino": ("Destino", {"id", "nombre", "pais", "region", "activo", "notas"}),
    "requisito_destino": (
        "RequisitoDestino",
        {
            "id",
            "destino_id",
            "nombre",
            "tipo",
            "obligatorio",
            "descripcion",
            "anticipacion_dias",
            "activo",
        },
    ),
    "operador": ("Operador", {"id", "nombre", "contacto", "activo"}),
    "hotel": (
        "Hotel",
        {"id", "destino_id", "nombre", "categoria", "precio_referencia", "servicios", "estado"},
    ),
    "cliente": (
        "Cliente",
        {
            "id",
            "asesor_asignado_id",
            "nombre",
            "contacto",
            "instagram",  # posterior a rumbo.sql: migración 0003 (T-149, DEC-0017)
            "contacto_clave",  # posterior a rumbo.sql: migración 0005 (H-03 de M2, RF-003)
            "segmento",
            "etiquetas",
            "preferencias",
            "no_recontactar",
        },
    ),
    "oportunidad": (
        "Oportunidad",
        {
            "id",
            "cliente_id",
            "responsable_id",
            "canal",
            "destino_consultado",
            "fecha_desde_tentativa",
            "fecha_hasta_tentativa",
            "pasajeros",
            "estado",
            "motivo_perdida",
            "motivo_perdida_detalle",
            "notas",
        },
    ),
    "cotizacion": (
        "Cotizacion",
        {"id", "oportunidad_id", "fecha", "moneda", "items", "total", "validez_hasta", "estado"},
    ),
    "viaje": (
        "Viaje",
        {
            "id",
            "cliente_id",
            "oportunidad_id",
            "destino_id",
            "operador_id",
            "responsable_id",
            "vendedor_id",
            "fecha_salida",
            "fecha_regreso",
            "categoria",
            "estado",
            "estado_previo",
            "motivo_cancelacion",
            "fecha_cancelacion",
            "moneda",
            "precio_venta",
            "costo",
            "ganancia",
            "margen",
            "comision_tipo",
            "comision_vendedor",
        },
    ),
    "pago": (
        "Pago",
        {
            "id",
            "viaje_id",
            "monto",
            "tipo",
            "vencimiento",
            "estado",
            "forma_pago",
            "moneda_pago",
            "tipo_cambio",
            "monto_cobrado",
            "fecha_cobro",
            "anulado_por_cancelacion",  # posterior a rumbo.sql: migración 0009 (T-099)
        },
    ),
    "viaje_hotel": (
        "ViajeHotel",
        {
            "id",
            "viaje_id",
            "hotel_id",
            "check_in",
            "check_out",
            "orden",
            "vencimiento_pago_proveedor",
            "pago_proveedor_realizado",
        },
    ),
    "resena": (
        "Resena",
        {
            "id",
            "cliente_id",
            "hotel_id",
            "viaje_id",
            "puntaje",
            "comentario",
            "fecha",
            "estado",
            "motivo_baja",
        },
    ),
    "alerta": (
        "Alerta",
        {
            "id",
            "propietario_id",
            "viaje_id",
            "pago_id",
            "oportunidad_id",
            "cliente_id",
            "viaje_hotel_id",
            "tipo",
            "descripcion",
            "fecha",
            "estado",
            "resuelta_en",
            "cerrada_por_cancelacion",
        },
    ),
    "contenido_red": (
        "ContenidoRed",
        {"id", "usuario_id", "titulo", "texto", "canal", "estado_kanban", "fecha_publicacion"},
    ),
}


@pytest.fixture
async def bd(sesion: AsyncSession) -> AsyncSession:
    """Sesión de test sobre la base migrada con Alembic, sin la fila inicial de `configuracion`
    (se borra dentro de la transacción del test, que se revierte)."""
    await sesion.execute(text("DELETE FROM configuracion"))
    return sesion


async def _rechaza(sesion: AsyncSession, fabrica: Any, **campos: Any) -> None:
    with pytest.raises(IntegrityError):
        async with sesion.begin_nested():
            await f.crear(sesion, fabrica, **campos)


async def _cadena(bd: AsyncSession) -> dict[str, Any]:
    """Una fila de cada entidad, con sus padres, para los tests de FK y de CHECK."""
    usuario = await f.crear(bd, f.UsuarioFactory)
    destino = await f.crear(bd, f.DestinoFactory)
    operador = await f.crear(bd, f.OperadorFactory)
    hotel = await f.crear(bd, f.HotelFactory, destino_id=destino.id)
    cliente = await f.crear(bd, f.ClienteFactory, asesor_asignado_id=usuario.id)
    oportunidad = await f.crear(
        bd, f.OportunidadFactory, cliente_id=cliente.id, responsable_id=usuario.id
    )
    viaje = await f.crear(
        bd,
        f.ViajeFactory,
        cliente_id=cliente.id,
        oportunidad_id=oportunidad.id,
        destino_id=destino.id,
        operador_id=operador.id,
        responsable_id=usuario.id,
        vendedor_id=usuario.id,
    )
    pago = await f.crear(bd, f.PagoFactory, viaje_id=viaje.id)
    tramo = await f.crear(bd, f.ViajeHotelFactory, viaje_id=viaje.id, hotel_id=hotel.id)
    return {
        "usuario": usuario,
        "destino": destino,
        "operador": operador,
        "hotel": hotel,
        "cliente": cliente,
        "oportunidad": oportunidad,
        "viaje": viaje,
        "pago": pago,
        "tramo": tramo,
    }


# --- Estructura: tablas, enums, columnas ---------------------------------------------------


def test_rnf07_hay_un_modelo_por_cada_una_de_las_15_tablas() -> None:
    assert set(m.Base.metadata.tables) == set(TABLAS)


@pytest.mark.parametrize("nombre", ENUMS)
def test_rnf07_cada_enum_python_tiene_los_valores_de_rumbo_sql(nombre: str) -> None:
    assert len(ENUMS) == 20
    enum_python = getattr(m, nombre)
    assert [miembro.value for miembro in enum_python] == ENUMS[nombre]


@pytest.mark.parametrize("tabla", TABLAS)
def test_rnf07_cada_tabla_tiene_las_columnas_de_rumbo_sql(tabla: str) -> None:
    clase, propias = TABLAS[tabla]
    esperadas = propias if tabla == "viaje_hotel" else propias | _AUDITORIA
    columnas = {c.name for c in m.Base.metadata.tables[tabla].columns}
    assert columnas == esperadas
    assert getattr(m, clase).__tablename__ == tabla


def test_rnf07_importes_numeric_y_fechas_con_zona_en_la_metadata() -> None:
    tablas = m.Base.metadata.tables
    for nombre_tabla, col in [
        ("viaje", "precio_venta"),
        ("viaje", "costo"),
        ("viaje", "comision_vendedor"),
        ("pago", "monto"),
        ("cotizacion", "total"),
        ("hotel", "precio_referencia"),
        ("usuario", "comision_default_valor"),
    ]:
        assert tablas[nombre_tabla].columns[col].type.python_type is Decimal, (nombre_tabla, col)
    for nombre_tabla, tabla in tablas.items():
        if nombre_tabla == "viaje_hotel":
            continue
        assert cast(DateTime, tabla.columns["created_at"].type).timezone is True, nombre_tabla
        assert cast(DateTime, tabla.columns["updated_at"].type).timezone is True, nombre_tabla
    assert cast(DateTime, tablas["alerta"].columns["resuelta_en"].type).timezone is True


def test_rnf07_tipo_y_nulos_de_columnas_que_difieren_con_facilidad() -> None:
    tablas = m.Base.metadata.tables
    assert isinstance(tablas["configuracion"].columns["id"].type, SmallInteger)
    assert tablas["viaje"].columns["ganancia"].nullable is True
    assert tablas["viaje"].columns["margen"].nullable is True
    assert tablas["viaje"].columns["ganancia"].computed is not None
    assert tablas["viaje"].columns["margen"].computed is not None


# --- Fábricas: cada una persiste una fila válida ------------------------------------------


async def test_rnf07_cada_fabrica_persiste_una_fila_valida(bd: AsyncSession) -> None:
    filas = await _cadena(bd)
    configuracion = await f.crear(bd, f.ConfiguracionFactory)
    requisito = await f.crear(bd, f.RequisitoDestinoFactory, destino_id=filas["destino"].id)
    cotizacion = await f.crear(bd, f.CotizacionFactory, oportunidad_id=filas["oportunidad"].id)
    resena = await f.crear(
        bd, f.ResenaFactory, cliente_id=filas["cliente"].id, hotel_id=filas["hotel"].id
    )
    alerta = await f.crear(bd, f.AlertaFactory, propietario_id=filas["usuario"].id)
    contenido = await f.crear(bd, f.ContenidoRedFactory, usuario_id=filas["usuario"].id)

    todas = [*filas.values(), configuracion, requisito, cotizacion, resena, alerta, contenido]
    assert len(todas) == 15
    assert {type(x).__name__ for x in todas} == {c for c, _ in TABLAS.values()}
    for fila in todas:
        assert fila.id is not None


async def test_rnf07_defaults_de_la_base(bd: AsyncSession) -> None:
    filas = await _cadena(bd)
    configuracion = await f.crear(bd, f.ConfiguracionFactory)
    assert filas["usuario"].activo is True
    assert filas["usuario"].acceso_redes is False
    assert filas["hotel"].estado == m.EstadoHotel("activo")
    assert filas["cliente"].etiquetas == []
    assert filas["cliente"].no_recontactar is False
    assert filas["oportunidad"].estado == m.EstadoOportunidad("nueva")
    assert filas["viaje"].estado == m.EstadoViaje("reservado")
    assert filas["pago"].estado == m.EstadoPago("pendiente")
    assert filas["tramo"].pago_proveedor_realizado is False
    assert (configuracion.id, configuracion.vigencia_cotizacion_meses) == (1, 1)
    assert (configuracion.anticipacion_salida_dias, configuracion.recontacto_meses) == (7, 6)


async def test_rnf07_importes_vuelven_como_decimal_y_fechas_con_zona(bd: AsyncSession) -> None:
    filas = await _cadena(bd)
    viaje = filas["viaje"]
    assert isinstance(viaje.precio_venta, Decimal)
    assert viaje.precio_venta == Decimal("1000000.00")
    assert viaje.ganancia == Decimal("250000.00")  # columna generada
    assert viaje.margen == Decimal("0.2500")
    assert isinstance(filas["pago"].monto, Decimal)
    assert viaje.created_at.tzinfo is not None
    assert viaje.updated_at.tzinfo is not None


async def test_dec0016_firebase_uid_y_email_son_unicos(bd: AsyncSession) -> None:
    usuario = await f.crear(bd, f.UsuarioFactory)
    await _rechaza(bd, f.UsuarioFactory, firebase_uid=usuario.firebase_uid)
    await _rechaza(bd, f.UsuarioFactory, email=usuario.email)


async def test_rnf07_la_clave_unica_de_oportunidad_en_viaje(bd: AsyncSession) -> None:
    filas = await _cadena(bd)
    await _rechaza(
        bd,
        f.ViajeFactory,
        cliente_id=filas["cliente"].id,
        oportunidad_id=filas["oportunidad"].id,
        destino_id=filas["destino"].id,
        responsable_id=filas["usuario"].id,
    )


async def test_rnf07_orden_de_viaje_hotel_es_unico_por_viaje(bd: AsyncSession) -> None:
    filas = await _cadena(bd)
    await _rechaza(
        bd, f.ViajeHotelFactory, viaje_id=filas["viaje"].id, hotel_id=filas["hotel"].id, orden=1
    )


# --- CHECK: comisión por defecto del usuario ----------------------------------------------


async def test_dec0013_comision_default_tipo_sin_valor_se_rechaza(bd: AsyncSession) -> None:
    await _rechaza(bd, f.UsuarioFactory, comision_default_tipo=m.TipoComision("importe"))


async def test_dec0013_comision_default_valor_sin_tipo_se_rechaza(bd: AsyncSession) -> None:
    await _rechaza(bd, f.UsuarioFactory, comision_default_valor=Decimal("5.00"))


async def test_dec0013_comision_default_porcentaje_mayor_a_100_se_rechaza(
    bd: AsyncSession,
) -> None:
    await _rechaza(
        bd,
        f.UsuarioFactory,
        comision_default_tipo=m.TipoComision("porcentaje"),
        comision_default_valor=Decimal("100.01"),
    )


async def test_dec0013_comision_default_negativa_se_rechaza(bd: AsyncSession) -> None:
    await _rechaza(
        bd,
        f.UsuarioFactory,
        comision_default_tipo=m.TipoComision("importe"),
        comision_default_valor=Decimal("-1.00"),
    )


async def test_dec0013_comision_default_valida_se_acepta(bd: AsyncSession) -> None:
    porcentaje = await f.crear(
        bd,
        f.UsuarioFactory,
        comision_default_tipo=m.TipoComision("porcentaje"),
        comision_default_valor=Decimal("100.00"),
    )
    importe = await f.crear(
        bd,
        f.UsuarioFactory,
        comision_default_tipo=m.TipoComision("importe"),
        comision_default_valor=Decimal("250000.00"),
    )
    assert porcentaje.comision_default_valor == Decimal("100.00")
    assert importe.comision_default_valor == Decimal("250000.00")


# --- CHECK: alerta (un solo origen, resuelta_en) --------------------------------------------


async def test_dec0013_alerta_con_dos_origenes_se_rechaza(bd: AsyncSession) -> None:
    filas = await _cadena(bd)
    await _rechaza(
        bd,
        f.AlertaFactory,
        propietario_id=filas["usuario"].id,
        viaje_id=filas["viaje"].id,
        pago_id=filas["pago"].id,
    )


async def test_dec0013_alerta_con_un_origen_o_ninguno_se_acepta(bd: AsyncSession) -> None:
    filas = await _cadena(bd)
    suelta = await f.crear(bd, f.AlertaFactory, propietario_id=filas["usuario"].id)
    de_pago = await f.crear(
        bd, f.AlertaFactory, propietario_id=filas["usuario"].id, pago_id=filas["pago"].id
    )
    de_tramo = await f.crear(
        bd,
        f.AlertaFactory,
        propietario_id=filas["usuario"].id,
        viaje_hotel_id=filas["tramo"].id,
    )
    assert suelta.pago_id is None
    assert de_pago.pago_id == filas["pago"].id
    assert de_tramo.viaje_hotel_id == filas["tramo"].id


async def test_dec0013_alerta_resuelta_sin_resuelta_en_se_rechaza(bd: AsyncSession) -> None:
    usuario = await f.crear(bd, f.UsuarioFactory)
    await _rechaza(
        bd, f.AlertaFactory, propietario_id=usuario.id, estado=m.EstadoAlerta("resuelta")
    )


async def test_dec0013_alerta_pendiente_con_resuelta_en_se_rechaza(bd: AsyncSession) -> None:
    usuario = await f.crear(bd, f.UsuarioFactory)
    await _rechaza(
        bd,
        f.AlertaFactory,
        propietario_id=usuario.id,
        estado=m.EstadoAlerta("pendiente"),
        resuelta_en=datetime(2026, 10, 15, 12, 0, tzinfo=UTC),
    )


async def test_dec0013_alerta_resuelta_con_resuelta_en_se_acepta(bd: AsyncSession) -> None:
    usuario = await f.crear(bd, f.UsuarioFactory)
    instante = datetime(2026, 10, 15, 12, 0, tzinfo=UTC)
    alerta = await f.crear(
        bd,
        f.AlertaFactory,
        propietario_id=usuario.id,
        estado=m.EstadoAlerta("resuelta"),
        resuelta_en=instante,
    )
    assert alerta.resuelta_en == instante
    assert alerta.resuelta_en.tzinfo is not None


# --- Otros CHECK relevantes -----------------------------------------------------------------


async def test_dec0013_oportunidad_perdida_exige_motivo_y_viceversa(bd: AsyncSession) -> None:
    usuario = await f.crear(bd, f.UsuarioFactory)
    cliente = await f.crear(bd, f.ClienteFactory)
    base = {"cliente_id": cliente.id, "responsable_id": usuario.id}
    await _rechaza(bd, f.OportunidadFactory, estado=m.EstadoOportunidad("perdida"), **base)
    await _rechaza(bd, f.OportunidadFactory, motivo_perdida=m.MotivoPerdida("precio"), **base)
    perdida = await f.crear(
        bd,
        f.OportunidadFactory,
        estado=m.EstadoOportunidad("perdida"),
        motivo_perdida=m.MotivoPerdida("precio"),
        **base,
    )
    assert perdida.motivo_perdida == m.MotivoPerdida("precio")


async def test_dec0013_viaje_comision_porcentaje_mayor_a_100_se_rechaza(
    bd: AsyncSession,
) -> None:
    filas = await _cadena(bd)
    await _rechaza(
        bd,
        f.ViajeFactory,
        cliente_id=filas["cliente"].id,
        destino_id=filas["destino"].id,
        responsable_id=filas["usuario"].id,
        comision_tipo=m.TipoComision("porcentaje"),
        comision_vendedor=Decimal("100.01"),
    )


async def test_dec0013_viaje_cancelado_exige_estado_previo_motivo_y_fecha(
    bd: AsyncSession,
) -> None:
    filas = await _cadena(bd)
    padres = {
        "cliente_id": filas["cliente"].id,
        "destino_id": filas["destino"].id,
        "responsable_id": filas["usuario"].id,
    }
    await _rechaza(bd, f.ViajeFactory, estado=m.EstadoViaje("cancelado"), **padres)
    await _rechaza(bd, f.ViajeFactory, motivo_cancelacion="no viaja", **padres)
    cancelado = await f.crear(
        bd,
        f.ViajeFactory,
        estado=m.EstadoViaje("cancelado"),
        estado_previo=m.EstadoViaje("vendido"),
        motivo_cancelacion="no viaja",
        fecha_cancelacion=date(2026, 12, 1),
        **padres,
    )
    assert cancelado.estado == m.EstadoViaje("cancelado")


async def test_dec0013_resena_oculta_exige_motivo_baja(bd: AsyncSession) -> None:
    filas = await _cadena(bd)
    padres = {"cliente_id": filas["cliente"].id, "hotel_id": filas["hotel"].id}
    await _rechaza(bd, f.ResenaFactory, estado=m.EstadoResena("oculta"), **padres)
    oculta = await f.crear(
        bd, f.ResenaFactory, estado=m.EstadoResena("oculta"), motivo_baja="ofensiva", **padres
    )
    assert oculta.motivo_baja == "ofensiva"


@pytest.mark.parametrize("puntaje", [0, 6])
async def test_rnf07_resena_puntaje_fuera_de_1_a_5_se_rechaza(
    bd: AsyncSession, puntaje: int
) -> None:
    filas = await _cadena(bd)
    await _rechaza(
        bd,
        f.ResenaFactory,
        cliente_id=filas["cliente"].id,
        hotel_id=filas["hotel"].id,
        puntaje=puntaje,
    )


async def test_rnf07_configuracion_admite_una_sola_fila(bd: AsyncSession) -> None:
    await f.crear(bd, f.ConfiguracionFactory)
    await _rechaza(bd, f.ConfiguracionFactory)
    await _rechaza(bd, f.ConfiguracionFactory, id=2)
    cantidad = (await bd.execute(select(m.Configuracion))).scalars().all()
    assert len(cantidad) == 1


# --- Lecturas tras un UPDATE y baja de tramo -----------------------------------------------


async def test_rnf07_leer_updated_at_y_columnas_generadas_tras_un_update(
    bd: AsyncSession,
) -> None:
    filas = await _cadena(bd)
    viaje = filas["viaje"]
    viaje.precio_venta = Decimal("2000000.00")
    await bd.flush()
    assert viaje.updated_at.tzinfo is not None
    assert viaje.ganancia == Decimal("1250000.00")
    assert viaje.margen == Decimal("0.6250")


async def test_dec0013_borrar_el_tramo_deja_la_alerta_sin_viaje_hotel(bd: AsyncSession) -> None:
    filas = await _cadena(bd)
    alerta = await f.crear(
        bd,
        f.AlertaFactory,
        propietario_id=filas["usuario"].id,
        viaje_hotel_id=filas["tramo"].id,
    )
    await bd.execute(delete(m.ViajeHotel).where(m.ViajeHotel.id == filas["tramo"].id))
    await bd.refresh(alerta)
    assert alerta.viaje_hotel_id is None
