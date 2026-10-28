"""T-067: EST-Cotización T2, T3 y T4 (CU-06 paso 4, A2 y A3; RF-023, RF-025).

Supuestos de diseño (el ticket no fija la firma): `enviar`, `aceptar` y `rechazar` reciben la
`Cotizacion` y su `Oportunidad`, las mutan y levantan `TransicionInvalida` si la transición no
existe en EST-Cotización o si la oportunidad ya está cerrada.
"""

import pytest

from rumbo.datos import modelos as m
from rumbo.negocio.errores import TransicionInvalida
from rumbo.negocio.estados import cotizacion as est
from tests import fabricas as f

C = m.EstadoCotizacion
E = m.EstadoOportunidad


def _cot(estado: str) -> m.Cotizacion:
    return f.CotizacionFactory.build(estado=C(estado))


def _op(estado: str) -> m.Oportunidad:
    campos: dict[str, object] = {}
    if estado == "perdida":
        campos["motivo_perdida"] = m.MotivoPerdida.precio
    return f.OportunidadFactory.build(estado=E(estado), **campos)


# T2: borrador -> enviada; la oportunidad pasa a cotizada (EST-Oportunidad T3)
@pytest.mark.parametrize("origen", ["nueva", "en_gestion"])
def test_rf023_enviar_pasa_la_oportunidad_a_cotizada(origen: str) -> None:
    cot, op = _cot("borrador"), _op(origen)
    est.enviar(cot, op)
    assert cot.estado is C.enviada
    assert op.estado is E.cotizada


def test_rf023_enviar_con_oportunidad_ya_cotizada_la_deja_cotizada() -> None:
    cot, op = _cot("borrador"), _op("cotizada")
    est.enviar(cot, op)
    assert cot.estado is C.enviada
    assert op.estado is E.cotizada


@pytest.mark.parametrize("origen", ["enviada", "aceptada", "rechazada", "vencida"])
def test_rf023_enviar_invalida_desde_otros_estados(origen: str) -> None:
    cot, op = _cot(origen), _op("cotizada")
    with pytest.raises(TransicionInvalida):
        est.enviar(cot, op)
    assert cot.estado is C(origen)


@pytest.mark.parametrize("cerrada", ["ganada", "perdida"])
def test_rf023_enviar_con_oportunidad_cerrada_invalida(cerrada: str) -> None:
    cot, op = _cot("borrador"), _op(cerrada)
    with pytest.raises(TransicionInvalida):
        est.enviar(cot, op)
    assert cot.estado is C.borrador
    assert op.estado is E(cerrada)


# T3: enviada -> aceptada (la oportunidad queda cotizada, lista para confirmar la reserva)
def test_rf025_aceptar_desde_enviada() -> None:
    cot, op = _cot("enviada"), _op("cotizada")
    est.aceptar(cot, op)
    assert cot.estado is C.aceptada
    assert op.estado is E.cotizada  # ganar la hace CU-07 al confirmar la reserva (M6)


@pytest.mark.parametrize("origen", ["borrador", "aceptada", "rechazada", "vencida"])
def test_rf025_aceptar_invalida_desde_otros_estados(origen: str) -> None:
    cot, op = _cot(origen), _op("cotizada")
    with pytest.raises(TransicionInvalida):
        est.aceptar(cot, op)
    assert cot.estado is C(origen)


# T4: enviada -> rechazada (la oportunidad no cambia)
@pytest.mark.parametrize("opestado", ["en_gestion", "cotizada"])
def test_rf025_rechazar_desde_enviada_no_toca_la_oportunidad(opestado: str) -> None:
    cot, op = _cot("enviada"), _op(opestado)
    est.rechazar(cot, op)
    assert cot.estado is C.rechazada
    assert op.estado is E(opestado)


@pytest.mark.parametrize("origen", ["borrador", "aceptada", "rechazada", "vencida"])
def test_rf025_rechazar_invalida_desde_otros_estados(origen: str) -> None:
    cot, op = _cot(origen), _op("cotizada")
    with pytest.raises(TransicionInvalida):
        est.rechazar(cot, op)
    assert cot.estado is C(origen)
