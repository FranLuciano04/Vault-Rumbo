"""Cálculos económicos derivados del viaje y su plan de pagos, en `Decimal` (DEC-0007, CU-11,
CU-12). Ganancia y margen no están acá: son columnas generadas de la base."""

from collections.abc import Iterable
from decimal import ROUND_DOWN, Decimal

from rumbo.datos.modelos import EstadoPago, Pago

_FRACCION = Decimal("0.0001")
_NO_COBRADOS = (EstadoPago.pendiente, EstadoPago.vencido)


def plan_desbalanceado(precio_venta: Decimal, pagos: Iterable[Pago]) -> bool:
    """Si hay plan (pagos no anulados) y sus montos no suman el precio de venta (CU-10 A4,
    RF-059). Sin plan no hay nada que rebalancear."""
    montos = [p.monto for p in pagos if p.estado is not EstadoPago.anulado]
    return bool(montos) and sum(montos, Decimal(0)) != precio_venta


def saldo_pendiente(pagos: Iterable[Pago]) -> Decimal:
    """Suma de los pagos no cobrados, en la moneda del viaje (CU-12)."""
    return sum((p.monto for p in pagos if p.estado in _NO_COBRADOS), Decimal(0))


def porcentaje_pagado(precio_venta: Decimal, pagos: Iterable[Pago]) -> Decimal:
    """Porción del precio de venta ya cobrada, de 0 a 1, truncada a 4 decimales (CU-12). Con
    precio cero es 0; si lo cobrado supera el precio (bajó después de cobrar), es 1."""
    if precio_venta <= 0:
        return Decimal(0)
    cobrado = sum((p.monto for p in pagos if p.estado is EstadoPago.pagado), Decimal(0))
    return min(cobrado / precio_venta, Decimal(1)).quantize(_FRACCION, rounding=ROUND_DOWN)
