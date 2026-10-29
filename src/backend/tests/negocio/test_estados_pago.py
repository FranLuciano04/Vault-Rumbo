"""T-088: EST-Pago, transiciones T2-T8 y T10 (CU-11 A4, CU-12 A1/A3, CU-27; RF-066, RF-067, RF-070).

Supuestos de diseño (el ticket no fija la firma): funciones puras sobre el `Pago`, sin sesión.
- `cobrar(pago)` (T2, T4): solo cambia el estado; los datos del cobro son del ticket del cobro.
- `revertir_cobro(pago, hoy=)` (T6) y `revertir_anulacion(pago, hoy=)` (T10): vuelven a
  `pendiente` si el vencimiento es >= hoy, o a `vencido` si ya pasó.
- `anular(pago)` (T5, T7, T8) y `vencer(pago, hoy=)` (T3).
Las inválidas lanzan `TransicionInvalida` y dejan el pago intacto.
"""

from collections.abc import Callable
from datetime import date
from decimal import Decimal

import pytest

from rumbo.datos import modelos as m
from rumbo.negocio.errores import TransicionInvalida
from rumbo.negocio.estados import pago as est
from tests import fabricas as f

P = m.EstadoPago
TODOS = ["pendiente", "pagado", "vencido", "anulado"]
_HOY = date(2026, 10, 28)
_PASADO = date(2026, 9, 10)
_FUTURO = date(2026, 12, 1)


def _pago(estado: str, vencimiento: date = _FUTURO, **campos: object) -> m.Pago:
    return f.PagoFactory.build(estado=P(estado), vencimiento=vencimiento, **campos)


def _no_cambia(origen: str, accion: Callable[[m.Pago], None]) -> None:
    pago = _pago(origen)
    with pytest.raises(TransicionInvalida):
        accion(pago)
    assert pago.estado is P(origen)


# T2 y T4: cobro
@pytest.mark.parametrize("origen", ["pendiente", "vencido"])
def test_rf066_cobrar_pasa_de_pendiente_o_vencido_a_pagado(origen: str) -> None:
    pago = _pago(origen)
    est.cobrar(pago)
    assert pago.estado is P.pagado


@pytest.mark.parametrize("origen", ["pagado", "anulado"])
def test_rf066_cobrar_invalido_desde_pagado_o_anulado(origen: str) -> None:
    _no_cambia(origen, est.cobrar)


# T6: reversión del cobro
def test_rf067_revertir_cobro_con_vencimiento_futuro_vuelve_a_pendiente() -> None:
    pago = _pago("pagado", _FUTURO)
    est.revertir_cobro(pago, hoy=_HOY)
    assert pago.estado is P.pendiente


def test_rf067_revertir_cobro_con_vencimiento_pasado_vuelve_a_vencido() -> None:
    pago = _pago("pagado", _PASADO)
    est.revertir_cobro(pago, hoy=_HOY)
    assert pago.estado is P.vencido


def test_rf067_revertir_cobro_con_vencimiento_hoy_vuelve_a_pendiente() -> None:
    pago = _pago("pagado", _HOY)
    est.revertir_cobro(pago, hoy=_HOY)
    assert pago.estado is P.pendiente


def test_rf067_revertir_cobro_limpia_los_datos_del_cobro() -> None:
    pago = _pago(
        "pagado",
        forma_pago=m.FormaPago.efectivo,
        moneda_pago=m.Moneda.ARS,
        tipo_cambio=Decimal("1.0000"),
        monto_cobrado=Decimal("300000.00"),
        fecha_cobro=_HOY,
    )
    est.revertir_cobro(pago, hoy=_HOY)
    assert pago.forma_pago is None
    assert pago.moneda_pago is None
    assert pago.tipo_cambio is None
    assert pago.monto_cobrado is None
    assert pago.fecha_cobro is None


@pytest.mark.parametrize("origen", ["pendiente", "vencido", "anulado"])
def test_rf067_revertir_cobro_invalido_si_no_esta_pagado(origen: str) -> None:
    _no_cambia(origen, lambda p: est.revertir_cobro(p, hoy=_HOY))


# T5, T7, T8: anulación
@pytest.mark.parametrize("origen", ["pendiente", "vencido"])
def test_rf070_anular_pasa_de_pendiente_o_vencido_a_anulado(origen: str) -> None:
    pago = _pago(origen)
    est.anular(pago)
    assert pago.estado is P.anulado


@pytest.mark.parametrize("origen", ["pagado", "anulado"])
def test_rf070_anular_invalido_desde_pagado_o_anulado(origen: str) -> None:
    _no_cambia(origen, est.anular)


# T10: reversión de la cancelación del viaje
def test_rf070_revertir_anulacion_con_vencimiento_futuro_vuelve_a_pendiente() -> None:
    pago = _pago("anulado", _FUTURO)
    est.revertir_anulacion(pago, hoy=_HOY)
    assert pago.estado is P.pendiente


def test_rf070_revertir_anulacion_con_vencimiento_pasado_vuelve_a_vencido() -> None:
    pago = _pago("anulado", _PASADO)
    est.revertir_anulacion(pago, hoy=_HOY)
    assert pago.estado is P.vencido


@pytest.mark.parametrize("origen", ["pendiente", "pagado", "vencido"])
def test_rf070_revertir_anulacion_invalido_si_no_esta_anulado(origen: str) -> None:
    _no_cambia(origen, lambda p: est.revertir_anulacion(p, hoy=_HOY))


# T3: vencimiento automático
def test_rf066_vencer_pendiente_con_fecha_pasada_pasa_a_vencido() -> None:
    pago = _pago("pendiente", _PASADO)
    est.vencer(pago, hoy=_HOY)
    assert pago.estado is P.vencido


@pytest.mark.parametrize("vencimiento", [_HOY, _FUTURO])
def test_rf066_vencer_pendiente_sin_fecha_pasada_es_invalido(vencimiento: date) -> None:
    pago = _pago("pendiente", vencimiento)
    with pytest.raises(TransicionInvalida):
        est.vencer(pago, hoy=_HOY)
    assert pago.estado is P.pendiente


@pytest.mark.parametrize("origen", ["pagado", "vencido", "anulado"])
def test_rf066_vencer_invalido_si_no_esta_pendiente(origen: str) -> None:
    pago = _pago(origen, _PASADO)
    with pytest.raises(TransicionInvalida):
        est.vencer(pago, hoy=_HOY)
    assert pago.estado is P(origen)
