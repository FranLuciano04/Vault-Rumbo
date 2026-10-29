"""EST-Pago: pendiente | vencido -> pagado | anulado (CU-11, CU-12, CU-27; RF-066, RF-067, RF-070)."""

from datetime import date

from rumbo.datos.modelos import Pago


def cobrar(pago: Pago) -> None:
    raise NotImplementedError


def revertir_cobro(pago: Pago, *, hoy: date) -> None:
    raise NotImplementedError


def anular(pago: Pago) -> None:
    raise NotImplementedError


def revertir_anulacion(pago: Pago, *, hoy: date) -> None:
    raise NotImplementedError


def vencer(pago: Pago, *, hoy: date) -> None:
    raise NotImplementedError
