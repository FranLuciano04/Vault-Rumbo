"""T-087: EST-Viaje, todas las transiciones (CU-08, CU-12 A0/A2/A3, CU-27; RF-038, RF-040, RF-042).

Supuestos de diseño (el ticket no fija la firma): funciones puras sobre el `Viaje`, sin sesión.
- `al_registrar_cobro(viaje, saldo=)`: `saldo` ya incluye el cobro (T2, T3).
- `al_revertir_cobro(viaje, saldo=, quedan_cobros=)`: `saldo` ya sin el cobro (T8, T10).
- `iniciar` (T4), `finalizar` (T5), `corregir(viaje, alertas=, ahora=)` (T7),
  `cancelar(viaje, motivo=, fecha=)` (T6) y `revertir_cancelacion` (T9).
Las inválidas lanzan `TransicionInvalida` y dejan el viaje intacto.
"""

from collections.abc import Callable
from datetime import UTC, date, datetime
from decimal import Decimal

import pytest

from rumbo.datos import modelos as m
from rumbo.negocio.errores import TransicionInvalida
from rumbo.negocio.estados import viaje as est
from tests import fabricas as f

V = m.EstadoViaje
TODOS = ["reservado", "vendido", "confirmado", "en_curso", "finalizado", "cancelado"]
CERO = Decimal("0.00")
_HOY = date(2026, 10, 28)
_AHORA = datetime(2026, 10, 28, 12, 0, tzinfo=UTC)


def _viaje(estado: str, **campos: object) -> m.Viaje:
    if estado == "cancelado":
        campos.setdefault("estado_previo", V.confirmado)
        campos.setdefault("motivo_cancelacion", "Error de carga")
        campos.setdefault("fecha_cancelacion", _HOY)
    return f.ViajeFactory.build(estado=V(estado), **campos)


def _resena(estado: str) -> m.Alerta:
    return f.AlertaFactory.build(
        tipo=m.TipoAlerta.resena,
        estado=m.EstadoAlerta(estado),
        resuelta_en=_AHORA if estado == "resuelta" else None,
    )


def _no_cambia(origen: str, accion: Callable[[m.Viaje], None]) -> None:
    viaje = _viaje(origen)
    with pytest.raises(TransicionInvalida):
        accion(viaje)
    assert viaje.estado is V(origen)


# T2: reservado -> vendido (primer cobro, de cualquier tipo)
def test_rf038_primer_cobro_pasa_a_vendido() -> None:
    viaje = _viaje("reservado")
    est.al_registrar_cobro(viaje, saldo=Decimal("700000.00"))
    assert viaje.estado is V.vendido


# T2 + T3 en la misma operación (plan de pago único)
def test_rf038_primer_cobro_que_deja_saldo_cero_pasa_a_confirmado() -> None:
    viaje = _viaje("reservado")
    est.al_registrar_cobro(viaje, saldo=CERO)
    assert viaje.estado is V.confirmado


# T3: vendido -> confirmado
def test_rf038_cobro_con_saldo_cero_pasa_a_confirmado() -> None:
    viaje = _viaje("vendido")
    est.al_registrar_cobro(viaje, saldo=CERO)
    assert viaje.estado is V.confirmado


def test_rf038_cobro_con_saldo_pendiente_deja_vendido() -> None:
    viaje = _viaje("vendido")
    est.al_registrar_cobro(viaje, saldo=Decimal("1.00"))
    assert viaje.estado is V.vendido


@pytest.mark.parametrize("origen", ["confirmado", "cancelado"])
def test_rf038_cobro_invalido_desde_confirmado_o_cancelado(origen: str) -> None:
    _no_cambia(origen, lambda v: est.al_registrar_cobro(v, saldo=CERO))


# T8: confirmado -> vendido
def test_rf038_revertir_cobro_de_confirmado_vuelve_a_vendido() -> None:
    viaje = _viaje("confirmado")
    est.al_revertir_cobro(viaje, saldo=Decimal("300000.00"), quedan_cobros=True)
    assert viaje.estado is V.vendido


# T10: vendido -> reservado (el único cobro)
def test_rf038_revertir_unico_cobro_vuelve_a_reservado() -> None:
    viaje = _viaje("vendido")
    est.al_revertir_cobro(viaje, saldo=Decimal("1000000.00"), quedan_cobros=False)
    assert viaje.estado is V.reservado


def test_rf038_revertir_cobro_con_otros_cobros_deja_vendido() -> None:
    viaje = _viaje("vendido")
    est.al_revertir_cobro(viaje, saldo=Decimal("500000.00"), quedan_cobros=True)
    assert viaje.estado is V.vendido


def test_rf038_revertir_unico_cobro_de_pago_unico_confirmado_vuelve_a_reservado() -> None:
    viaje = _viaje("confirmado")
    est.al_revertir_cobro(viaje, saldo=Decimal("1000000.00"), quedan_cobros=False)
    assert viaje.estado is V.reservado


@pytest.mark.parametrize("origen", ["reservado", "en_curso", "finalizado", "cancelado"])
def test_rf038_revertir_cobro_invalido_desde_otros_estados(origen: str) -> None:
    _no_cambia(origen, lambda v: est.al_revertir_cobro(v, saldo=CERO, quedan_cobros=True))


# T4: confirmado -> en_curso (nunca desde vendido: secuencia estricta)
def test_rf040_iniciar_pasa_de_confirmado_a_en_curso() -> None:
    viaje = _viaje("confirmado")
    est.iniciar(viaje)
    assert viaje.estado is V.en_curso


@pytest.mark.parametrize("origen", [e for e in TODOS if e != "confirmado"])
def test_rf040_iniciar_invalido_desde_otros_estados(origen: str) -> None:
    _no_cambia(origen, est.iniciar)


# T5: en_curso -> finalizado
def test_rf040_finalizar_pasa_de_en_curso_a_finalizado() -> None:
    viaje = _viaje("en_curso")
    est.finalizar(viaje)
    assert viaje.estado is V.finalizado


@pytest.mark.parametrize("origen", [e for e in TODOS if e != "en_curso"])
def test_rf040_finalizar_invalido_desde_otros_estados(origen: str) -> None:
    _no_cambia(origen, est.finalizar)


# T7: corrección, solo desde en_curso y finalizado
def test_rf042_corregir_estado_en_curso_vuelve_a_confirmado() -> None:
    viaje = _viaje("en_curso")
    est.corregir(viaje)
    assert viaje.estado is V.confirmado


def test_rf042_corregir_estado_finalizado_vuelve_a_en_curso() -> None:
    viaje = _viaje("finalizado")
    est.corregir(viaje, ahora=_AHORA)
    assert viaje.estado is V.en_curso


@pytest.mark.parametrize("origen", ["reservado", "vendido", "confirmado", "cancelado"])
def test_rf042_corregir_estado_invalido_desde_otros_estados(origen: str) -> None:
    _no_cambia(origen, est.corregir)


def test_rf042_corregir_no_usa_ni_toca_estado_previo() -> None:
    viaje = _viaje("finalizado")
    est.corregir(viaje, ahora=_AHORA)
    assert viaje.estado_previo is None


@pytest.mark.parametrize("estado", ["pendiente", "vista"])
def test_rf042_corregir_finalizado_resuelve_la_alerta_de_resena_sin_atender(estado: str) -> None:
    viaje, alerta = _viaje("finalizado"), _resena(estado)
    est.corregir(viaje, alertas=[alerta], ahora=_AHORA)
    assert alerta.estado is m.EstadoAlerta.resuelta
    assert alerta.resuelta_en == _AHORA


def test_rf042_corregir_finalizado_no_toca_alertas_que_no_son_de_resena() -> None:
    viaje = _viaje("finalizado")
    otra = f.AlertaFactory.build(tipo=m.TipoAlerta.viaje, estado=m.EstadoAlerta.pendiente)
    est.corregir(viaje, alertas=[otra], ahora=_AHORA)
    assert otra.estado is m.EstadoAlerta.pendiente


def test_rf042_corregir_finalizado_deja_la_alerta_de_resena_ya_resuelta() -> None:
    viaje, alerta = _viaje("finalizado"), _resena("resuelta")
    est.corregir(viaje, alertas=[alerta], ahora=datetime(2026, 11, 1, tzinfo=UTC))
    assert alerta.estado is m.EstadoAlerta.resuelta
    assert alerta.resuelta_en == _AHORA


def test_rf042_corregir_en_curso_no_toca_alertas() -> None:
    viaje, alerta = _viaje("en_curso"), _resena("pendiente")
    est.corregir(viaje, alertas=[alerta], ahora=_AHORA)
    assert alerta.estado is m.EstadoAlerta.pendiente


# T6: cancelación
@pytest.mark.parametrize("origen", ["reservado", "vendido", "confirmado", "en_curso"])
def test_cu27_cancelar_guarda_estado_previo_motivo_y_fecha(origen: str) -> None:
    viaje = _viaje(origen)
    est.cancelar(viaje, motivo="El cliente desistió", fecha=_HOY)
    assert viaje.estado is V.cancelado
    assert viaje.estado_previo is V(origen)
    assert viaje.motivo_cancelacion == "El cliente desistió"
    assert viaje.fecha_cancelacion == _HOY


@pytest.mark.parametrize("origen", ["finalizado", "cancelado"])
def test_cu27_cancelar_invalido_desde_finalizado_o_cancelado(origen: str) -> None:
    _no_cambia(origen, lambda v: est.cancelar(v, motivo="x", fecha=_HOY))


# T9: reversión de la cancelación al estado previo
@pytest.mark.parametrize("previo", ["reservado", "vendido", "confirmado", "en_curso"])
def test_cu27_revertir_cancelacion_vuelve_al_estado_previo_y_limpia_datos(previo: str) -> None:
    viaje = _viaje("cancelado", estado_previo=V(previo))
    est.revertir_cancelacion(viaje)
    assert viaje.estado is V(previo)
    assert viaje.estado_previo is None
    assert viaje.motivo_cancelacion is None
    assert viaje.fecha_cancelacion is None


def test_cu27_cancelar_y_revertir_es_ida_y_vuelta() -> None:
    viaje = _viaje("vendido")
    est.cancelar(viaje, motivo="Error", fecha=_HOY)
    est.revertir_cancelacion(viaje)
    assert viaje.estado is V.vendido


@pytest.mark.parametrize("origen", [e for e in TODOS if e != "cancelado"])
def test_cu27_revertir_cancelacion_invalido_si_no_esta_cancelado(origen: str) -> None:
    _no_cambia(origen, est.revertir_cancelacion)
