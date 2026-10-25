"""T-051: servicio de alertas para los demás módulos y estados de la alerta (EST-Alerta).

Supuestos de diseño (el ticket no fija la firma): `origen` es la entidad ORM de origen (Viaje,
Pago, Oportunidad, Cliente o ViajeHotel) o `None` para una manual suelta; `propietario` es el
`Usuario`; `resolver_de_origen` y `reabrir_de_origen` devuelven las alertas que cambiaron.
"""

from datetime import UTC, date, datetime
from typing import Any

import pytest
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from rumbo.datos import modelos as m
from rumbo.negocio.errores import DatosInvalidos, TransicionInvalida
from rumbo.negocio.estados import alerta as est
from rumbo.negocio.politicas import visibilidad
from rumbo.negocio.servicios import alertas
from tests import fabricas as f

AHORA = datetime(2026, 10, 25, 15, 0, tzinfo=UTC)
FECHA = date(2026, 11, 1)

_ORIGENES = {
    "viaje": "viaje_id",
    "pago": "pago_id",
    "oportunidad": "oportunidad_id",
    "cliente": "cliente_id",
    "tramo": "viaje_hotel_id",
}
_COLUMNAS_ORIGEN = tuple(_ORIGENES.values())


def _alerta(estado: str, **campos: Any) -> m.Alerta:
    if estado == "resuelta":
        campos.setdefault("resuelta_en", AHORA)
    return f.AlertaFactory.build(estado=m.EstadoAlerta(estado), **campos)


async def _cadena(bd: AsyncSession) -> dict[str, Any]:
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
        "cliente": cliente,
        "oportunidad": oportunidad,
        "viaje": viaje,
        "pago": pago,
        "tramo": tramo,
    }


# --- EST-Alerta: transiciones válidas -------------------------------------------------------


def test_rf079_t2_pendiente_pasa_a_vista() -> None:
    a = _alerta("pendiente")

    est.marcar_vista(a)

    assert a.estado is m.EstadoAlerta.vista
    assert a.resuelta_en is None


def test_rf079_t3_pendiente_se_resuelve_directo_y_completa_resuelta_en() -> None:
    a = _alerta("pendiente")

    est.resolver(a, AHORA)

    assert a.estado is m.EstadoAlerta.resuelta
    assert a.resuelta_en == AHORA


def test_rf079_t4_vista_se_resuelve_y_completa_resuelta_en() -> None:
    a = _alerta("vista")

    est.resolver(a, AHORA)

    assert a.estado is m.EstadoAlerta.resuelta
    assert a.resuelta_en == AHORA


def test_rf079_t6_reabrir_vuelve_a_pendiente_y_vacia_resuelta_en() -> None:
    a = _alerta("resuelta")

    est.reabrir(a)

    assert a.estado is m.EstadoAlerta.pendiente
    assert a.resuelta_en is None


def test_rf079_t6_reabrir_limpia_la_marca_de_cancelacion() -> None:
    a = _alerta("resuelta", cerrada_por_cancelacion=True)

    est.reabrir(a)

    assert a.cerrada_por_cancelacion is False


def test_rf079_t7_vista_vuelve_a_pendiente_por_correccion() -> None:
    a = _alerta("vista")

    est.desmarcar_vista(a)

    assert a.estado is m.EstadoAlerta.pendiente


def test_rf079_t8_posponer_cambia_la_fecha_y_deja_pendiente() -> None:
    a = _alerta("pendiente", fecha=date(2026, 10, 20))

    est.posponer(a, date(2026, 10, 21), hoy=date(2026, 10, 20))

    assert a.fecha == date(2026, 10, 21)
    assert a.estado is m.EstadoAlerta.pendiente


# --- EST-Alerta: transiciones inválidas -----------------------------------------------------


@pytest.mark.parametrize("estado", ["vista", "resuelta"])
def test_rf079_marcar_vista_solo_desde_pendiente(estado: str) -> None:
    a = _alerta(estado)

    with pytest.raises(TransicionInvalida):
        est.marcar_vista(a)

    assert a.estado is m.EstadoAlerta(estado)


def test_rf079_resolver_una_resuelta_es_invalido_y_no_pisa_resuelta_en() -> None:
    a = _alerta("resuelta")

    with pytest.raises(TransicionInvalida):
        est.resolver(a, datetime(2026, 12, 1, tzinfo=UTC))

    assert a.resuelta_en == AHORA


@pytest.mark.parametrize("estado", ["pendiente", "vista"])
def test_rf079_reabrir_solo_desde_resuelta(estado: str) -> None:
    a = _alerta(estado)

    with pytest.raises(TransicionInvalida):
        est.reabrir(a)

    assert a.estado is m.EstadoAlerta(estado)


@pytest.mark.parametrize("estado", ["pendiente", "resuelta"])
def test_rf079_desmarcar_vista_solo_desde_vista(estado: str) -> None:
    a = _alerta(estado)

    with pytest.raises(TransicionInvalida):
        est.desmarcar_vista(a)

    assert a.estado is m.EstadoAlerta(estado)


@pytest.mark.parametrize("estado", ["vista", "resuelta"])
def test_rf079_posponer_solo_una_pendiente(estado: str) -> None:
    a = _alerta(estado, fecha=date(2026, 10, 20))

    with pytest.raises(TransicionInvalida):
        est.posponer(a, date(2026, 10, 25))

    assert a.fecha == date(2026, 10, 20)


# --- servicio: crear (RF-073) ---------------------------------------------------------------


@pytest.mark.parametrize("tipo", list(m.TipoAlerta))
async def test_rf073_tipos_de_alerta(sesion: AsyncSession, tipo: m.TipoAlerta) -> None:
    usuario = await f.crear(sesion, f.UsuarioFactory)

    a = await alertas.crear(sesion, tipo, FECHA, "Qué hay que hacer", usuario, None)

    assert a.id is not None
    assert a.tipo is tipo
    assert a.fecha == FECHA
    assert a.descripcion == "Qué hay que hacer"
    assert a.propietario_id == usuario.id
    assert a.estado is m.EstadoAlerta.pendiente
    assert a.resuelta_en is None


@pytest.mark.parametrize("clave", list(_ORIGENES))
async def test_rf073_crear_guarda_un_solo_origen(sesion: AsyncSession, clave: str) -> None:
    filas = await _cadena(sesion)

    a = await alertas.crear(
        sesion, m.TipoAlerta.pago, FECHA, "Cobrar", filas["usuario"], filas[clave]
    )

    for columna in _COLUMNAS_ORIGEN:
        esperado = filas[clave].id if columna == _ORIGENES[clave] else None
        assert getattr(a, columna) == esperado
    cantidad = await sesion.scalar(
        text(
            "SELECT num_nonnulls(viaje_id, pago_id, oportunidad_id, cliente_id, viaje_hotel_id) "
            "FROM alerta WHERE id = :id"
        ),
        {"id": a.id},
    )
    assert cantidad == 1


async def test_rf073_manual_suelta_no_tiene_origen(sesion: AsyncSession) -> None:
    usuario = await f.crear(sesion, f.UsuarioFactory)

    a = await alertas.crear(sesion, m.TipoAlerta.manual, FECHA, "Llamar", usuario, None)

    for columna in _COLUMNAS_ORIGEN:
        assert getattr(a, columna) is None


# --- servicio: resolver / reabrir por origen (RF-079) ---------------------------------------


async def test_rf079_resolver_por_origen(sesion: AsyncSession) -> None:
    filas = await _cadena(sesion)
    pendiente = await alertas.crear(
        sesion, m.TipoAlerta.pago, FECHA, "Cobrar", filas["usuario"], filas["pago"]
    )
    vista = await alertas.crear(
        sesion, m.TipoAlerta.pago, FECHA, "Cobrar otra vez", filas["usuario"], filas["pago"]
    )
    est.marcar_vista(vista)

    resueltas = await alertas.resolver_de_origen(sesion, filas["pago"])

    assert {r.id for r in resueltas} == {pendiente.id, vista.id}
    for a in (pendiente, vista):
        await sesion.refresh(a)
        assert a.estado is m.EstadoAlerta.resuelta
        assert a.resuelta_en is not None


async def test_rf079_resolver_por_origen_no_toca_las_de_otro_origen(sesion: AsyncSession) -> None:
    filas = await _cadena(sesion)
    de_pago = await alertas.crear(
        sesion, m.TipoAlerta.pago, FECHA, "Cobrar", filas["usuario"], filas["pago"]
    )
    de_viaje = await alertas.crear(
        sesion, m.TipoAlerta.viaje, FECHA, "Salida", filas["usuario"], filas["viaje"]
    )
    suelta = await alertas.crear(
        sesion, m.TipoAlerta.manual, FECHA, "Llamar", filas["usuario"], None
    )

    await alertas.resolver_de_origen(sesion, filas["pago"])

    for a in (de_pago, de_viaje, suelta):
        await sesion.refresh(a)
    assert de_pago.estado is m.EstadoAlerta.resuelta
    assert de_viaje.estado is m.EstadoAlerta.pendiente
    assert suelta.estado is m.EstadoAlerta.pendiente


async def test_rf079_resolver_por_origen_sin_alertas_devuelve_vacio(sesion: AsyncSession) -> None:
    filas = await _cadena(sesion)

    assert await alertas.resolver_de_origen(sesion, filas["pago"]) == []


async def test_rf079_resolver_por_origen_no_pisa_resuelta_en_de_las_ya_resueltas(
    sesion: AsyncSession,
) -> None:
    filas = await _cadena(sesion)
    ya = await f.crear(
        sesion,
        f.AlertaFactory,
        propietario_id=filas["usuario"].id,
        pago_id=filas["pago"].id,
        estado=m.EstadoAlerta.resuelta,
        resuelta_en=AHORA,
    )

    resueltas = await alertas.resolver_de_origen(sesion, filas["pago"])

    assert resueltas == []
    await sesion.refresh(ya)
    assert ya.resuelta_en == AHORA


async def test_rf079_reabrir_por_origen(sesion: AsyncSession) -> None:
    filas = await _cadena(sesion)
    a = await alertas.crear(
        sesion, m.TipoAlerta.pago, FECHA, "Cobrar", filas["usuario"], filas["pago"]
    )
    await alertas.resolver_de_origen(sesion, filas["pago"])

    reabiertas = await alertas.reabrir_de_origen(sesion, filas["pago"])

    assert [r.id for r in reabiertas] == [a.id]
    await sesion.refresh(a)
    assert a.estado is m.EstadoAlerta.pendiente
    assert a.resuelta_en is None


async def test_rf079_reabrir_por_origen_ignora_las_que_no_estan_resueltas(
    sesion: AsyncSession,
) -> None:
    filas = await _cadena(sesion)
    pendiente = await alertas.crear(
        sesion, m.TipoAlerta.pago, FECHA, "Cobrar", filas["usuario"], filas["pago"]
    )

    reabiertas = await alertas.reabrir_de_origen(sesion, filas["pago"])

    assert reabiertas == []
    await sesion.refresh(pendiente)
    assert pendiente.estado is m.EstadoAlerta.pendiente


# --- fix de la review de T-051 -------------------------------------------------------------


def test_rf079_posponer_a_fecha_igual_o_anterior_es_invalido() -> None:
    a = _alerta("pendiente", fecha=date(2026, 10, 20))

    for nueva in (date(2026, 10, 20), date(2026, 10, 18)):
        with pytest.raises(DatosInvalidos):
            est.posponer(a, nueva, hoy=date(2026, 10, 15))

    assert a.fecha == date(2026, 10, 20)


def test_rf079_posponer_una_vencida_a_una_fecha_aun_pasada_es_invalido() -> None:
    a = _alerta("pendiente", fecha=date(2026, 10, 10))

    with pytest.raises(DatosInvalidos):
        est.posponer(a, date(2026, 10, 15), hoy=date(2026, 10, 25))

    est.posponer(a, date(2026, 10, 26), hoy=date(2026, 10, 25))
    assert a.fecha == date(2026, 10, 26)


async def test_rf079_resolver_con_origen_sin_flush_no_toca_alertas_ajenas(
    sesion: AsyncSession,
) -> None:
    filas = await _cadena(sesion)
    ajena = await alertas.crear(
        sesion, m.TipoAlerta.manual, FECHA, "Llamar", filas["usuario"], None
    )
    nuevo = f.ClienteFactory.build(asesor_asignado_id=filas["usuario"].id)
    sesion.add(nuevo)

    assert await alertas.resolver_de_origen(sesion, nuevo) == []

    await sesion.refresh(ajena)
    assert ajena.estado is m.EstadoAlerta.pendiente


async def test_rf073_crear_con_origen_sin_flush_guarda_el_origen(sesion: AsyncSession) -> None:
    usuario = await f.crear(sesion, f.UsuarioFactory)
    nuevo = f.ClienteFactory.build(asesor_asignado_id=usuario.id)
    sesion.add(nuevo)

    a = await alertas.crear(sesion, m.TipoAlerta.recontacto, FECHA, "Saludar", usuario, nuevo)

    assert nuevo.id is not None
    assert a.cliente_id == nuevo.id


async def test_rf073_origen_de_un_tipo_ajeno_es_un_error_claro(sesion: AsyncSession) -> None:
    usuario = await f.crear(sesion, f.UsuarioFactory)

    with pytest.raises(TypeError):
        await alertas.crear(
            sesion,
            m.TipoAlerta.manual,
            FECHA,
            "x",
            usuario,
            usuario,  # type: ignore[arg-type]
        )


async def test_cu27_resolver_por_cancelacion_marca_y_reabrir_solo_esas(
    sesion: AsyncSession,
) -> None:
    filas = await _cadena(sesion)
    a_mano = await alertas.crear(
        sesion, m.TipoAlerta.pago, FECHA, "A mano", filas["usuario"], filas["viaje"]
    )
    est.resolver(a_mano, AHORA)
    cancelada = await alertas.crear(
        sesion, m.TipoAlerta.viaje, FECHA, "Salida", filas["usuario"], filas["viaje"]
    )

    await alertas.resolver_de_origen(sesion, filas["viaje"], por_cancelacion=True)
    assert cancelada.cerrada_por_cancelacion is True
    reabiertas = await alertas.reabrir_de_origen(sesion, filas["viaje"], solo_por_cancelacion=True)

    assert [r.id for r in reabiertas] == [cancelada.id]
    await sesion.refresh(a_mano)
    assert a_mano.estado is m.EstadoAlerta.resuelta
    assert cancelada.estado is m.EstadoAlerta.pendiente
    assert cancelada.cerrada_por_cancelacion is False


async def test_cu05_resolver_filtra_por_tipo(sesion: AsyncSession) -> None:
    filas = await _cadena(sesion)
    insistencia = await alertas.crear(
        sesion, m.TipoAlerta.insistencia, FECHA, "Insistir", filas["usuario"], filas["oportunidad"]
    )
    manual = await alertas.crear(
        sesion, m.TipoAlerta.manual, FECHA, "Llamar", filas["usuario"], filas["oportunidad"]
    )

    resueltas = await alertas.resolver_de_origen(
        sesion, filas["oportunidad"], (m.TipoAlerta.insistencia,)
    )

    assert [r.id for r in resueltas] == [insistencia.id]
    await sesion.refresh(manual)
    assert manual.estado is m.EstadoAlerta.pendiente


async def test_rf079_obtener_para_modificar_bloquea_la_fila(
    sesion: AsyncSession, motor: AsyncEngine
) -> None:
    """Lee con `FOR UPDATE` para no chocar con un cierre automático concurrente (T-051)."""
    usuario = await f.crear(sesion, f.UsuarioFactory)
    alerta = await alertas.crear(sesion, m.TipoAlerta.manual, FECHA, "x", usuario)
    sentencias: list[str] = []

    def capturar(_conn: Any, _cursor: Any, sentencia: str, *_resto: Any) -> None:
        sentencias.append(sentencia)

    motor_sync = motor.sync_engine
    event.listen(motor_sync, "before_cursor_execute", capturar)
    try:
        await alertas._alertas.obtener_para_modificar(
            sesion, alerta.id, visibilidad=visibilidad(usuario)
        )
    finally:
        event.remove(motor_sync, "before_cursor_execute", capturar)

    assert any("FOR UPDATE" in sentencia for sentencia in sentencias)
