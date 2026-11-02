"""Fix H-01 de M6 (DEC-0026 punto 1): `tipo_cambio` son siempre pesos por dólar (ARS por USD).

Viaje en ARS cobrado en USD divide; viaje en USD cobrado en ARS multiplica; en la misma moneda
no convierte. Decimal, redondeo al centavo ROUND_HALF_UP (RF-068).
Firma esperada: `monto_cobrado(monto, tipo_cambio, *, moneda_viaje, moneda_pago)`.
"""

from decimal import Decimal

from rumbo.datos.modelos import Moneda
from rumbo.negocio import calculos

ARS, USD = Moneda.ARS, Moneda.USD


def _cobrado(monto: str, tipo: str | None, viaje: Moneda, pago: Moneda) -> Decimal:
    return calculos.monto_cobrado(
        Decimal(monto),
        None if tipo is None else Decimal(tipo),
        moneda_viaje=viaje,
        moneda_pago=pago,
    )


def test_rf068_viaje_ars_cobrado_en_usd_divide() -> None:
    assert _cobrado("100000.00", "1000.0000", ARS, USD) == Decimal("100.00")


def test_rf068_viaje_usd_cobrado_en_ars_multiplica() -> None:
    assert _cobrado("100.00", "1000.0000", USD, ARS) == Decimal("100000.00")


def test_rf068_redondeo_ars_a_usd_half_up() -> None:
    assert _cobrado("100000.00", "3.0000", ARS, USD) == Decimal("33333.33")
    assert _cobrado("1.00", "200.0000", ARS, USD) == Decimal("0.01")  # 0,005 sube al centavo


def test_rf068_redondeo_usd_a_ars_half_up() -> None:
    assert _cobrado("1.00", "1200.5050", USD, ARS) == Decimal("1200.51")  # 1200,505 sube


def test_rf068_misma_moneda_no_convierte() -> None:
    assert _cobrado("300000.00", None, ARS, ARS) == Decimal("300000.00")
    assert _cobrado("1000.00", None, USD, USD) == Decimal("1000.00")
