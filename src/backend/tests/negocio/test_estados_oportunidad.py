"""T-064: EST-Oportunidad, transiciones de CU-05 (T2, T4, T5, T8) y sus guardas (RF-016, RF-017,
RF-020).

Supuestos de diseño (el ticket no fija la firma): funciones `pasar_a_en_gestion`, `perder`,
`reactivar` y `ganar` que mutan la `Oportunidad` y levantan `TransicionInvalida` si la
transición no existe en la tabla de EST-Oportunidad.
"""

import pytest

from rumbo.datos import modelos as m
from rumbo.negocio.errores import TransicionInvalida
from rumbo.negocio.estados import oportunidad as est
from tests import fabricas as f

E = m.EstadoOportunidad


def _op(estado: str, **campos: object) -> m.Oportunidad:
    if estado == "perdida":
        campos.setdefault("motivo_perdida", m.MotivoPerdida.precio)
    return f.OportunidadFactory.build(estado=E(estado), **campos)


# T2: nueva -> en_gestion
def test_cu05_en_gestion_desde_nueva() -> None:
    op = _op("nueva")
    est.pasar_a_en_gestion(op)
    assert op.estado is E.en_gestion


@pytest.mark.parametrize("origen", ["en_gestion", "cotizada", "ganada", "perdida"])
def test_cu05_en_gestion_invalida_desde_otros(origen: str) -> None:
    op = _op(origen)
    with pytest.raises(TransicionInvalida):
        est.pasar_a_en_gestion(op)
    assert op.estado is E(origen)


# T5: abiertas -> perdida con motivo
@pytest.mark.parametrize("origen", ["nueva", "en_gestion", "cotizada"])
def test_rf017_perder_desde_abiertas_guarda_motivo(origen: str) -> None:
    op = _op(origen)
    est.perder(op, m.MotivoPerdida.precio)
    assert op.estado is E.perdida
    assert op.motivo_perdida is m.MotivoPerdida.precio


def test_rf017_perder_otro_guarda_el_detalle() -> None:
    op = _op("en_gestion")
    est.perder(op, m.MotivoPerdida.otro, "Se casó y canceló todo")
    assert op.motivo_perdida is m.MotivoPerdida.otro
    assert op.motivo_perdida_detalle == "Se casó y canceló todo"


@pytest.mark.parametrize("origen", ["ganada", "perdida"])
def test_rf017_perder_invalida_desde_terminales(origen: str) -> None:
    op = _op(origen)
    with pytest.raises(TransicionInvalida):
        est.perder(op, m.MotivoPerdida.desistio)
    assert op.estado is E(origen)


# T8: perdida -> en_gestion
def test_rf020_reactivar_vuelve_a_en_gestion_y_limpia_el_motivo() -> None:
    op = _op("perdida", motivo_perdida=m.MotivoPerdida.otro, motivo_perdida_detalle="Detalle")
    est.reactivar(op)
    assert op.estado is E.en_gestion
    assert op.motivo_perdida is None
    assert op.motivo_perdida_detalle is None


@pytest.mark.parametrize("origen", ["nueva", "en_gestion", "cotizada", "ganada"])
def test_rf020_reactivar_invalida_si_no_esta_perdida(origen: str) -> None:
    op = _op(origen)
    with pytest.raises(TransicionInvalida):
        est.reactivar(op)
    assert op.estado is E(origen)


# T4: abiertas -> ganada (venta directa desde nueva y en_gestion; cotizada también, por la tabla)
@pytest.mark.parametrize("origen", ["nueva", "en_gestion", "cotizada"])
def test_rf016_ganar_desde_abiertas(origen: str) -> None:
    op = _op(origen)
    est.ganar(op)
    assert op.estado is E.ganada
    assert op.motivo_perdida is None


@pytest.mark.parametrize("origen", ["ganada", "perdida"])
def test_rf016_ganar_invalida_desde_terminales(origen: str) -> None:
    op = _op(origen)
    with pytest.raises(TransicionInvalida):
        est.ganar(op)
    assert op.estado is E(origen)


@pytest.mark.parametrize("accion", ["en_gestion", "reactivar", "ganar", "perder"])
def test_rf016_ganada_es_terminal_no_sale_por_ninguna_accion(accion: str) -> None:
    op = _op("ganada")
    with pytest.raises(TransicionInvalida):
        if accion == "en_gestion":
            est.pasar_a_en_gestion(op)
        elif accion == "reactivar":
            est.reactivar(op)
        elif accion == "ganar":
            est.ganar(op)
        else:
            est.perder(op, m.MotivoPerdida.precio)
    assert op.estado is E.ganada
