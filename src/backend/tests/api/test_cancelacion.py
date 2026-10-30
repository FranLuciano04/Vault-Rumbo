"""T-099: cancelar un viaje y revertir la cancelación (CU-27; RF-048 a RF-053, RF-153, RN-06).

Endpoints: POST /viajes/{id}/cancelar y /viajes/{id}/revertir-cancelacion. El contrato (roles,
cuerpo, 422) ya lo cubre `test_contrato_m6.py`; acá se fija el comportamiento. Supuestos que el
ticket no dice de forma explícita:

- Respuesta de ambos: el `Viaje` (200) con su `estado`, `estado_previo`, `motivo_cancelacion`,
  `fecha_cancelacion`, `saldo_pendiente` y `porcentaje_pagado`.
- RF-052: no hay un campo propio para "informar los cobros". Se informan en la respuesta: el
  `porcentaje_pagado` refleja lo cobrado y el `saldo_pendiente` queda en 0 (los anulados no
  cuentan).
- RF-051: el contrato no tiene un campo para la "constancia" de que la comisión no se realiza.
  Lo observable es que `comision_tipo` y `comision_vendedor` no se pierden ni se alteran al
  cancelar ni al revertir (en `en_curso` se mantienen, A4; antes de empezar la proyectada queda
  intacta para poder volver a proyectarse, A3).
- Desde `en_curso` la cancelación se acepta (A4) y no toca los pagos cobrados.
- Cancelar un viaje `finalizado` o ya `cancelado` responde 409 (A1), igual que revertir uno que no
  está `cancelado`; en ambos casos no cambia nada.
- Un pago que ya estaba `anulado` antes de cancelar sigue `anulado` al revertir (no se reactiva).
- Al revertir, un pago anulado por la cancelación vuelve a `vencido` si su vencimiento ya pasó y a
  `pendiente` si no (A3); los `pagado` no se tocan nunca.
- Alertas: las del viaje y las de cada pago anulado se cierran con `cerrada_por_cancelacion`; los
  recordatorios `manual` y las ya resueltas por otro motivo no se tocan, y al revertir no vuelven
  las que cerró otro motivo.
- Permisos (RF-153, DEC-0005): freelance sobre viaje ajeno 404; empleado no responsable 403;
  admin cancela cualquier viaje. Viaje inexistente 404.
"""

import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos import modelos as m
from tests import fabricas as f

Fabrica = Callable[[str], Awaitable[AsyncClient]]
PROBLEM_JSON = "application/problem+json"
PRECIO = Decimal("1000000.00")
CANCELACION = {"motivo_cancelacion": "El cliente desistió", "fecha_cancelacion": "2026-11-05"}


def _cancelar(viaje_id: uuid.UUID) -> str:
    return f"/api/viajes/{viaje_id}/cancelar"


def _revertir(viaje_id: uuid.UUID) -> str:
    return f"/api/viajes/{viaje_id}/revertir-cancelacion"


def _yo(c: AsyncClient) -> uuid.UUID:
    return c.usuario.id  # type: ignore[attr-defined,no-any-return]


async def _viaje(
    sesion: AsyncSession, responsable_id: uuid.UUID, estado: m.EstadoViaje, **campos: Any
) -> m.Viaje:
    cliente = await f.crear(sesion, f.ClienteFactory)
    destino = await f.crear(sesion, f.DestinoFactory)
    # un viaje cancelado lleva estado previo, motivo y fecha (viaje_estado_previo_ck)
    cancelacion = (
        {
            "estado_previo": m.EstadoViaje.confirmado,
            "motivo_cancelacion": "El cliente desistió",
            "fecha_cancelacion": date(2026, 11, 5),
        }
        if estado is m.EstadoViaje.cancelado
        else {}
    )
    return await f.crear(
        sesion,
        f.ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=responsable_id,
        precio_venta=PRECIO,
        estado=estado,
        **cancelacion,
        **campos,
    )


async def _pago(sesion: AsyncSession, viaje_id: uuid.UUID, monto: str, **campos: Any) -> m.Pago:
    return await f.crear(sesion, f.PagoFactory, viaje_id=viaje_id, monto=Decimal(monto), **campos)


async def _pago_cobrado(sesion: AsyncSession, viaje_id: uuid.UUID, monto: str) -> m.Pago:
    return await _pago(
        sesion,
        viaje_id,
        monto,
        estado=m.EstadoPago.pagado,
        forma_pago=m.FormaPago.transferencia,
        moneda_pago=m.Moneda.ARS,
        monto_cobrado=Decimal(monto),
        fecha_cobro=date(2026, 10, 20),
    )


async def _alerta(sesion: AsyncSession, propietario_id: uuid.UUID, **campos: Any) -> m.Alerta:
    return await f.crear(sesion, f.AlertaFactory, propietario_id=propietario_id, **campos)


async def _estado_en_base(sesion: AsyncSession, viaje_id: uuid.UUID) -> m.Viaje:
    sesion.expire_all()
    viaje = await sesion.get(m.Viaje, viaje_id)
    assert viaje is not None
    return viaje


async def _estado_del_pago(sesion: AsyncSession, pago_id: uuid.UUID) -> m.EstadoPago:
    sesion.expire_all()
    pago = await sesion.get(m.Pago, pago_id)
    assert pago is not None
    return pago.estado


async def _alerta_en_base(sesion: AsyncSession, alerta_id: uuid.UUID) -> m.Alerta:
    sesion.expire_all()
    alerta = await sesion.get(m.Alerta, alerta_id)
    assert alerta is not None
    return alerta


# --- Cancelar (RF-048, RF-049) ---


@pytest.mark.parametrize(
    "estado",
    [
        m.EstadoViaje.reservado,
        m.EstadoViaje.vendido,
        m.EstadoViaje.confirmado,
        m.EstadoViaje.en_curso,
    ],
)
async def test_rf048_cancelar(
    cliente_como: Fabrica, sesion: AsyncSession, estado: m.EstadoViaje
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), estado)
    viaje_id = viaje.id

    r = await c.post(_cancelar(viaje_id), json=CANCELACION)

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["id"] == str(viaje_id)
    assert cuerpo["estado"] == "cancelado"
    assert cuerpo["estado_previo"] == estado.value
    assert cuerpo["motivo_cancelacion"] == "El cliente desistió"
    assert cuerpo["fecha_cancelacion"] == "2026-11-05"
    en_base = await _estado_en_base(sesion, viaje_id)
    assert en_base.estado == m.EstadoViaje.cancelado
    assert en_base.estado_previo == estado
    assert en_base.motivo_cancelacion == "El cliente desistió"
    assert en_base.fecha_cancelacion == date(2026, 11, 5)


async def test_rf048_baja_logica_el_viaje_se_conserva(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.vendido)
    viaje_id = viaje.id

    r = await c.post(_cancelar(viaje_id), json=CANCELACION)

    assert r.status_code == 200
    assert await sesion.get(m.Viaje, viaje_id) is not None


@pytest.mark.parametrize("estado", [m.EstadoViaje.finalizado, m.EstadoViaje.cancelado])
async def test_rf049_finalizado_409(
    cliente_como: Fabrica, sesion: AsyncSession, estado: m.EstadoViaje
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), estado)
    viaje_id = viaje.id
    pago = await _pago(sesion, viaje_id, "300000.00")
    pago_id = pago.id

    r = await c.post(_cancelar(viaje_id), json=CANCELACION)

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    en_base = await _estado_en_base(sesion, viaje_id)
    assert en_base.estado == estado
    assert await _estado_del_pago(sesion, pago_id) == m.EstadoPago.pendiente


async def test_rf048_viaje_inexistente_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("empleado")

    r = await c.post(_cancelar(uuid.uuid4()), json=CANCELACION)

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


# --- Pagos y alertas (RF-050) ---


async def test_rf050_anula_pagos_y_cierra_alertas(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _yo(c)
    viaje = await _viaje(sesion, yo, m.EstadoViaje.vendido)
    viaje_id = viaje.id
    pendiente = await _pago(sesion, viaje_id, "300000.00", vencimiento=hoy() + timedelta(days=30))
    vencido = await _pago(
        sesion,
        viaje_id,
        "300000.00",
        estado=m.EstadoPago.vencido,
        vencimiento=hoy() - timedelta(days=5),
        tipo=m.TipoPago.cuota,
    )
    cobrado = await _pago_cobrado(sesion, viaje_id, "400000.00")
    pendiente_id, vencido_id, cobrado_id = pendiente.id, vencido.id, cobrado.id
    alerta_viaje = await _alerta(sesion, yo, viaje_id=viaje_id, tipo=m.TipoAlerta.salida)
    alerta_pendiente = await _alerta(sesion, yo, pago_id=pendiente_id, tipo=m.TipoAlerta.pago)
    alerta_vencido = await _alerta(
        sesion, yo, pago_id=vencido_id, tipo=m.TipoAlerta.pago, estado=m.EstadoAlerta.vista
    )
    alerta_viaje_id, alerta_pendiente_id, alerta_vencido_id = (
        alerta_viaje.id,
        alerta_pendiente.id,
        alerta_vencido.id,
    )

    r = await c.post(_cancelar(viaje_id), json=CANCELACION)

    assert r.status_code == 200
    assert await _estado_del_pago(sesion, pendiente_id) == m.EstadoPago.anulado
    assert await _estado_del_pago(sesion, vencido_id) == m.EstadoPago.anulado
    assert await _estado_del_pago(sesion, cobrado_id) == m.EstadoPago.pagado
    for alerta_id in (alerta_viaje_id, alerta_pendiente_id, alerta_vencido_id):
        alerta = await _alerta_en_base(sesion, alerta_id)
        assert alerta.estado == m.EstadoAlerta.resuelta
        assert alerta.resuelta_en is not None
        assert alerta.cerrada_por_cancelacion is True


async def test_rf050_los_pagos_anulados_se_conservan(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.reservado)
    viaje_id = viaje.id
    await _pago(sesion, viaje_id, "300000.00")
    await _pago(sesion, viaje_id, "700000.00", tipo=m.TipoPago.saldo)

    r = await c.post(_cancelar(viaje_id), json=CANCELACION)

    assert r.status_code == 200
    sesion.expire_all()
    pagos = list((await sesion.scalars(select(m.Pago).where(m.Pago.viaje_id == viaje_id))).all())
    assert len(pagos) == 2
    assert {p.estado for p in pagos} == {m.EstadoPago.anulado}


async def test_rf050_no_toca_el_cobro_de_los_pagados(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.vendido)
    viaje_id = viaje.id
    cobrado = await _pago_cobrado(sesion, viaje_id, "300000.00")
    cobrado_id = cobrado.id

    r = await c.post(_cancelar(viaje_id), json=CANCELACION)

    assert r.status_code == 200
    sesion.expire_all()
    pago = await sesion.get(m.Pago, cobrado_id)
    assert pago is not None
    assert pago.estado == m.EstadoPago.pagado
    assert pago.monto_cobrado == Decimal("300000.00")
    assert pago.fecha_cobro == date(2026, 10, 20)
    assert pago.forma_pago == m.FormaPago.transferencia


async def test_rf050_no_toca_manuales_ni_alertas_ya_resueltas_ni_las_de_otro_viaje(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _yo(c)
    viaje = await _viaje(sesion, yo, m.EstadoViaje.vendido)
    ajeno = await _viaje(sesion, yo, m.EstadoViaje.vendido)
    viaje_id = viaje.id
    manual = await _alerta(sesion, yo, viaje_id=viaje_id, tipo=m.TipoAlerta.manual)
    ya_resuelta = await _alerta(
        sesion,
        yo,
        viaje_id=viaje_id,
        tipo=m.TipoAlerta.formulario,
        estado=m.EstadoAlerta.resuelta,
        resuelta_en=datetime(2026, 10, 25, 12, 0, tzinfo=UTC),
    )
    de_otro = await _alerta(sesion, yo, viaje_id=ajeno.id, tipo=m.TipoAlerta.salida)
    manual_id, ya_resuelta_id, de_otro_id = manual.id, ya_resuelta.id, de_otro.id

    r = await c.post(_cancelar(viaje_id), json=CANCELACION)

    assert r.status_code == 200
    assert (await _alerta_en_base(sesion, manual_id)).estado == m.EstadoAlerta.pendiente
    resuelta = await _alerta_en_base(sesion, ya_resuelta_id)
    assert resuelta.estado == m.EstadoAlerta.resuelta
    assert resuelta.cerrada_por_cancelacion is False
    otro = await _alerta_en_base(sesion, de_otro_id)
    assert otro.estado == m.EstadoAlerta.pendiente
    assert otro.cerrada_por_cancelacion is False


async def test_rf050_la_alerta_de_un_pago_cobrado_no_se_marca_como_cerrada_por_cancelacion(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _yo(c)
    viaje = await _viaje(sesion, yo, m.EstadoViaje.vendido)
    viaje_id = viaje.id
    cobrado = await _pago_cobrado(sesion, viaje_id, "300000.00")
    alerta = await _alerta(
        sesion,
        yo,
        pago_id=cobrado.id,
        tipo=m.TipoAlerta.pago,
        estado=m.EstadoAlerta.resuelta,
        resuelta_en=datetime(2026, 10, 20, 12, 0, tzinfo=UTC),
    )
    alerta_id = alerta.id

    r = await c.post(_cancelar(viaje_id), json=CANCELACION)

    assert r.status_code == 200
    en_base = await _alerta_en_base(sesion, alerta_id)
    assert en_base.estado == m.EstadoAlerta.resuelta
    assert en_base.cerrada_por_cancelacion is False


# --- Comisión (RF-051) ---


@pytest.mark.parametrize(
    "estado", [m.EstadoViaje.confirmado, m.EstadoViaje.en_curso], ids=["no_empezo", "en_curso"]
)
async def test_rf051_comision(
    cliente_como: Fabrica, sesion: AsyncSession, estado: m.EstadoViaje
) -> None:
    """La comisión configurada no se pierde ni se altera: A4 la mantiene y, antes de empezar, la
    constancia no borra el dato que A3 necesita para volver a proyectarla."""
    c = await cliente_como("empleado")
    viaje = await _viaje(
        sesion,
        _yo(c),
        estado,
        comision_tipo=m.TipoComision.importe,
        comision_vendedor=Decimal("45000.00"),
    )
    viaje_id = viaje.id

    r = await c.post(_cancelar(viaje_id), json=CANCELACION)

    assert r.status_code == 200
    assert r.json()["comision_tipo"] == "importe"
    assert Decimal(r.json()["comision_vendedor"]) == Decimal("45000.00")
    en_base = await _estado_en_base(sesion, viaje_id)
    assert en_base.comision_tipo == m.TipoComision.importe
    assert en_base.comision_vendedor == Decimal("45000.00")


async def test_rf051_en_curso_conserva_los_cobros_y_la_suma_refleja_lo_cobrado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.en_curso)
    viaje_id = viaje.id
    cobrado = await _pago_cobrado(sesion, viaje_id, "600000.00")
    cobrado_id = cobrado.id
    pendiente = await _pago(sesion, viaje_id, "400000.00", tipo=m.TipoPago.saldo)
    pendiente_id = pendiente.id

    r = await c.post(_cancelar(viaje_id), json=CANCELACION)

    assert r.status_code == 200
    assert await _estado_del_pago(sesion, cobrado_id) == m.EstadoPago.pagado
    assert await _estado_del_pago(sesion, pendiente_id) == m.EstadoPago.anulado
    sesion.expire_all()
    pagos = list((await sesion.scalars(select(m.Pago).where(m.Pago.viaje_id == viaje_id))).all())
    vigentes = [p for p in pagos if p.estado is not m.EstadoPago.anulado]
    assert sum((p.monto for p in vigentes), Decimal(0)) == Decimal("600000.00")  # A4


# --- Cobros ya hechos (RF-052) ---


async def test_rf052_informa_cobros(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.vendido)
    viaje_id = viaje.id
    await _pago_cobrado(sesion, viaje_id, "300000.00")
    await _pago(sesion, viaje_id, "700000.00", tipo=m.TipoPago.saldo)

    r = await c.post(_cancelar(viaje_id), json=CANCELACION)

    assert r.status_code == 200
    assert Decimal(r.json()["porcentaje_pagado"]) == Decimal("0.3")
    assert Decimal(r.json()["saldo_pendiente"]) == Decimal(0)


async def test_rf052_sin_cobros_informa_cero(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.reservado)
    viaje_id = viaje.id
    await _pago(sesion, viaje_id, "300000.00")

    r = await c.post(_cancelar(viaje_id), json=CANCELACION)

    assert r.status_code == 200
    assert Decimal(r.json()["porcentaje_pagado"]) == Decimal(0)
    assert Decimal(r.json()["saldo_pendiente"]) == Decimal(0)


async def test_rf052_cancelar_no_procesa_reembolsos(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """Los reembolsos están fuera de alcance: el pago cobrado queda tal cual y no aparecen pagos
    nuevos."""
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.vendido)
    viaje_id = viaje.id
    await _pago_cobrado(sesion, viaje_id, "300000.00")

    r = await c.post(_cancelar(viaje_id), json=CANCELACION)

    assert r.status_code == 200
    sesion.expire_all()
    pagos = list((await sesion.scalars(select(m.Pago).where(m.Pago.viaje_id == viaje_id))).all())
    assert [(p.estado, p.monto) for p in pagos] == [(m.EstadoPago.pagado, Decimal("300000.00"))]


# --- Revertir (RF-053) ---


@pytest.mark.parametrize(
    "estado",
    [
        m.EstadoViaje.reservado,
        m.EstadoViaje.vendido,
        m.EstadoViaje.confirmado,
        m.EstadoViaje.en_curso,
    ],
)
async def test_rf053_revertir(
    cliente_como: Fabrica, sesion: AsyncSession, estado: m.EstadoViaje
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), estado)
    viaje_id = viaje.id
    assert (await c.post(_cancelar(viaje_id), json=CANCELACION)).status_code == 200

    r = await c.post(_revertir(viaje_id))

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["id"] == str(viaje_id)
    assert cuerpo["estado"] == estado.value
    assert cuerpo["estado_previo"] is None
    assert cuerpo["motivo_cancelacion"] is None
    assert cuerpo["fecha_cancelacion"] is None
    en_base = await _estado_en_base(sesion, viaje_id)
    assert en_base.estado == estado
    assert en_base.estado_previo is None
    assert en_base.motivo_cancelacion is None
    assert en_base.fecha_cancelacion is None


async def test_rf053_revertir_restaura_los_pagos_segun_su_fecha(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.vendido)
    viaje_id = viaje.id
    futuro = await _pago(sesion, viaje_id, "300000.00", vencimiento=hoy() + timedelta(days=30))
    pasado = await _pago(
        sesion,
        viaje_id,
        "300000.00",
        estado=m.EstadoPago.vencido,
        vencimiento=hoy() - timedelta(days=5),
        tipo=m.TipoPago.cuota,
    )
    cobrado = await _pago_cobrado(sesion, viaje_id, "400000.00")
    futuro_id, pasado_id, cobrado_id = futuro.id, pasado.id, cobrado.id
    assert (await c.post(_cancelar(viaje_id), json=CANCELACION)).status_code == 200
    assert await _estado_del_pago(sesion, futuro_id) == m.EstadoPago.anulado

    r = await c.post(_revertir(viaje_id))

    assert r.status_code == 200
    assert await _estado_del_pago(sesion, futuro_id) == m.EstadoPago.pendiente
    assert await _estado_del_pago(sesion, pasado_id) == m.EstadoPago.vencido
    assert await _estado_del_pago(sesion, cobrado_id) == m.EstadoPago.pagado
    assert Decimal(r.json()["saldo_pendiente"]) == Decimal("600000.00")
    assert Decimal(r.json()["porcentaje_pagado"]) == Decimal("0.4")


async def test_rf053_revertir_no_reactiva_un_pago_anulado_antes_de_cancelar(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.vendido)
    viaje_id = viaje.id
    previo = await _pago(sesion, viaje_id, "200000.00", estado=m.EstadoPago.anulado)
    vigente = await _pago(sesion, viaje_id, "800000.00", tipo=m.TipoPago.saldo)
    previo_id, vigente_id = previo.id, vigente.id
    assert (await c.post(_cancelar(viaje_id), json=CANCELACION)).status_code == 200

    r = await c.post(_revertir(viaje_id))

    assert r.status_code == 200
    assert await _estado_del_pago(sesion, previo_id) == m.EstadoPago.anulado
    assert await _estado_del_pago(sesion, vigente_id) == m.EstadoPago.pendiente


async def test_rf053_revertir_reabre_solo_las_alertas_que_cerro_la_cancelacion(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _yo(c)
    viaje = await _viaje(sesion, yo, m.EstadoViaje.vendido)
    viaje_id = viaje.id
    pendiente = await _pago(sesion, viaje_id, "300000.00")
    cobrado = await _pago_cobrado(sesion, viaje_id, "700000.00")
    pendiente_id, cobrado_id = pendiente.id, cobrado.id
    de_viaje = await _alerta(sesion, yo, viaje_id=viaje_id, tipo=m.TipoAlerta.salida)
    de_pago = await _alerta(sesion, yo, pago_id=pendiente_id, tipo=m.TipoAlerta.pago)
    de_cobrado = await _alerta(
        sesion,
        yo,
        pago_id=cobrado_id,
        tipo=m.TipoAlerta.pago,
        estado=m.EstadoAlerta.resuelta,
        resuelta_en=datetime(2026, 10, 20, 12, 0, tzinfo=UTC),
    )
    por_otro_motivo = await _alerta(
        sesion,
        yo,
        viaje_id=viaje_id,
        tipo=m.TipoAlerta.formulario,
        estado=m.EstadoAlerta.resuelta,
        resuelta_en=datetime(2026, 10, 25, 12, 0, tzinfo=UTC),
    )
    de_viaje_id, de_pago_id = de_viaje.id, de_pago.id
    de_cobrado_id, por_otro_motivo_id = de_cobrado.id, por_otro_motivo.id
    assert (await c.post(_cancelar(viaje_id), json=CANCELACION)).status_code == 200

    r = await c.post(_revertir(viaje_id))

    assert r.status_code == 200
    for alerta_id in (de_viaje_id, de_pago_id):
        alerta = await _alerta_en_base(sesion, alerta_id)
        assert alerta.estado == m.EstadoAlerta.pendiente
        assert alerta.resuelta_en is None
        assert alerta.cerrada_por_cancelacion is False
    for alerta_id in (de_cobrado_id, por_otro_motivo_id):
        alerta = await _alerta_en_base(sesion, alerta_id)
        assert alerta.estado == m.EstadoAlerta.resuelta


async def test_rf053_revertir_deja_la_comision_proyectada_como_estaba(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(
        sesion,
        _yo(c),
        m.EstadoViaje.confirmado,
        comision_tipo=m.TipoComision.porcentaje,
        comision_vendedor=Decimal("12.50"),
    )
    viaje_id = viaje.id
    assert (await c.post(_cancelar(viaje_id), json=CANCELACION)).status_code == 200

    r = await c.post(_revertir(viaje_id))

    assert r.status_code == 200
    assert r.json()["comision_tipo"] == "porcentaje"
    assert Decimal(r.json()["comision_vendedor"]) == Decimal("12.50")
    en_base = await _estado_en_base(sesion, viaje_id)
    assert en_base.comision_tipo == m.TipoComision.porcentaje
    assert en_base.comision_vendedor == Decimal("12.50")


async def test_rf053_se_puede_cancelar_de_nuevo_tras_revertir(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.vendido)
    viaje_id = viaje.id
    pago = await _pago(sesion, viaje_id, "1000000.00")
    pago_id = pago.id
    assert (await c.post(_cancelar(viaje_id), json=CANCELACION)).status_code == 200
    assert (await c.post(_revertir(viaje_id))).status_code == 200

    r = await c.post(
        _cancelar(viaje_id), json={**CANCELACION, "motivo_cancelacion": "Fuerza mayor"}
    )

    assert r.status_code == 200
    assert r.json()["motivo_cancelacion"] == "Fuerza mayor"
    assert await _estado_del_pago(sesion, pago_id) == m.EstadoPago.anulado


@pytest.mark.parametrize(
    "estado",
    [
        m.EstadoViaje.reservado,
        m.EstadoViaje.vendido,
        m.EstadoViaje.confirmado,
        m.EstadoViaje.en_curso,
        m.EstadoViaje.finalizado,
    ],
)
async def test_rf053_revertir_un_viaje_no_cancelado_409(
    cliente_como: Fabrica, sesion: AsyncSession, estado: m.EstadoViaje
) -> None:
    c = await cliente_como("empleado")
    viaje = await _viaje(sesion, _yo(c), estado)
    viaje_id = viaje.id

    r = await c.post(_revertir(viaje_id))

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert (await _estado_en_base(sesion, viaje_id)).estado == estado


async def test_rf053_revertir_viaje_inexistente_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("empleado")

    r = await c.post(_revertir(uuid.uuid4()))

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


# --- Permisos (RF-153, DEC-0005) ---


async def test_rf153_freelance_cancelar_viaje_ajeno_404(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id, m.EstadoViaje.vendido)
    viaje_id = viaje.id
    pago = await _pago(sesion, viaje_id, "300000.00")
    pago_id = pago.id

    r = await c.post(_cancelar(viaje_id), json=CANCELACION)

    assert r.status_code == 404
    assert (await _estado_en_base(sesion, viaje_id)).estado == m.EstadoViaje.vendido
    assert await _estado_del_pago(sesion, pago_id) == m.EstadoPago.pendiente


async def test_rf153_empleado_no_responsable_cancelar_403(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id, m.EstadoViaje.vendido)
    viaje_id = viaje.id
    pago = await _pago(sesion, viaje_id, "300000.00")
    pago_id = pago.id

    r = await c.post(_cancelar(viaje_id), json=CANCELACION)

    assert r.status_code == 403
    assert (await _estado_en_base(sesion, viaje_id)).estado == m.EstadoViaje.vendido
    assert await _estado_del_pago(sesion, pago_id) == m.EstadoPago.pendiente


async def test_rf153_freelance_revertir_viaje_ajeno_404(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id, m.EstadoViaje.cancelado)
    viaje_id = viaje.id

    r = await c.post(_revertir(viaje_id))

    assert r.status_code == 404
    assert (await _estado_en_base(sesion, viaje_id)).estado == m.EstadoViaje.cancelado


async def test_rf153_empleado_no_responsable_revertir_403(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id, m.EstadoViaje.cancelado)
    viaje_id = viaje.id

    r = await c.post(_revertir(viaje_id))

    assert r.status_code == 403
    assert (await _estado_en_base(sesion, viaje_id)).estado == m.EstadoViaje.cancelado


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf153_admin_y_dueno_cancelan_y_revierten_cualquier_viaje(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, otro.id, m.EstadoViaje.vendido)
    viaje_id = viaje.id

    r = await c.post(_cancelar(viaje_id), json=CANCELACION)

    assert r.status_code == 200
    assert (await _estado_en_base(sesion, viaje_id)).estado == m.EstadoViaje.cancelado
    r = await c.post(_revertir(viaje_id))
    assert r.status_code == 200
    assert (await _estado_en_base(sesion, viaje_id)).estado == m.EstadoViaje.vendido


async def test_rf153_freelance_cancela_y_revierte_su_propio_viaje(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    viaje = await _viaje(sesion, _yo(c), m.EstadoViaje.vendido)
    viaje_id = viaje.id

    r = await c.post(_cancelar(viaje_id), json=CANCELACION)

    assert r.status_code == 200
    assert (await _estado_en_base(sesion, viaje_id)).estado == m.EstadoViaje.cancelado
    r = await c.post(_revertir(viaje_id))
    assert r.status_code == 200
    assert (await _estado_en_base(sesion, viaje_id)).estado == m.EstadoViaje.vendido


# --- Alertas del pago al proveedor de cada tramo (RF-050, RF-053; fix de la review) ---


async def _tramo(sesion: AsyncSession, viaje: m.Viaje, orden: int, **campos: Any) -> m.ViajeHotel:
    hotel = await f.crear(sesion, f.HotelFactory, destino_id=viaje.destino_id)
    return await f.crear(
        sesion, f.ViajeHotelFactory, viaje_id=viaje.id, hotel_id=hotel.id, orden=orden, **campos
    )


async def test_rf050_cancelar_cierra_la_alerta_del_pago_al_proveedor_de_un_tramo(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _yo(c)
    viaje = await _viaje(sesion, yo, m.EstadoViaje.vendido)
    viaje_id = viaje.id
    tramo = await _tramo(sesion, viaje, 1, vencimiento_pago_proveedor=date(2026, 12, 20))
    alerta = await _alerta(sesion, yo, viaje_hotel_id=tramo.id, tipo=m.TipoAlerta.pago)
    alerta_id = alerta.id

    r = await c.post(_cancelar(viaje_id), json=CANCELACION)

    assert r.status_code == 200
    en_base = await _alerta_en_base(sesion, alerta_id)
    assert en_base.estado == m.EstadoAlerta.resuelta
    assert en_base.resuelta_en is not None
    assert en_base.cerrada_por_cancelacion is True


async def test_rf053_revertir_reabre_la_alerta_del_tramo_y_no_la_del_ya_pagado_al_proveedor(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _yo(c)
    viaje = await _viaje(sesion, yo, m.EstadoViaje.vendido)
    viaje_id = viaje.id
    impago = await _tramo(sesion, viaje, 1, vencimiento_pago_proveedor=date(2026, 12, 20))
    pagado = await _tramo(
        sesion,
        viaje,
        2,
        vencimiento_pago_proveedor=date(2026, 12, 22),
        pago_proveedor_realizado=True,
    )
    abierta = await _alerta(sesion, yo, viaje_hotel_id=impago.id, tipo=m.TipoAlerta.pago)
    ya_resuelta = await _alerta(
        sesion,
        yo,
        viaje_hotel_id=pagado.id,
        tipo=m.TipoAlerta.pago,
        estado=m.EstadoAlerta.resuelta,
        resuelta_en=datetime(2026, 10, 25, 12, 0, tzinfo=UTC),
    )
    abierta_id, ya_resuelta_id = abierta.id, ya_resuelta.id
    assert (await c.post(_cancelar(viaje_id), json=CANCELACION)).status_code == 200

    r = await c.post(_revertir(viaje_id))

    assert r.status_code == 200
    reabierta = await _alerta_en_base(sesion, abierta_id)
    assert reabierta.estado == m.EstadoAlerta.pendiente
    assert reabierta.resuelta_en is None
    assert reabierta.cerrada_por_cancelacion is False
    sigue = await _alerta_en_base(sesion, ya_resuelta_id)
    assert sigue.estado == m.EstadoAlerta.resuelta
    assert sigue.cerrada_por_cancelacion is False
