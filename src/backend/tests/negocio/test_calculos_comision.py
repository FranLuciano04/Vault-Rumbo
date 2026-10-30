"""T-121: comisión del vendedor como importe (DEC-0007, DEC-0013)."""

from decimal import Decimal

import pytest

from rumbo.datos.modelos import TipoComision
from rumbo.negocio.calculos import comision_del_vendedor


@pytest.mark.parametrize(
    ("tipo", "valor", "ganancia", "esperada"),
    [
        (TipoComision.importe, "15000.00", "200000.25", "15000.00"),
        (TipoComision.importe, "15000.00", "-100.00", "15000.00"),
        (TipoComision.porcentaje, "10.00", "200000.00", "20000.00"),
        (TipoComision.porcentaje, "10.00", "0.05", "0.01"),  # 0.005 redondea hacia arriba
        (TipoComision.porcentaje, "10.00", "0.00", "0.00"),
        (TipoComision.porcentaje, "10.00", "-50000.00", "0"),
    ],
)
def test_comision_del_vendedor(
    tipo: TipoComision, valor: str, ganancia: str, esperada: str
) -> None:
    assert comision_del_vendedor(tipo, Decimal(valor), Decimal(ganancia)) == Decimal(esperada)
