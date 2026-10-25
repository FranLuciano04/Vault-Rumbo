"""EST-Alerta: pendiente → vista → resuelta; posponer cambia la fecha (CU-14, RF-079)."""

from datetime import date, datetime

from rumbo.datos.modelos import Alerta


def marcar_vista(alerta: Alerta) -> None:
    raise NotImplementedError


def desmarcar_vista(alerta: Alerta) -> None:
    raise NotImplementedError


def resolver(alerta: Alerta, resuelta_en: datetime) -> None:
    raise NotImplementedError


def reabrir(alerta: Alerta) -> None:
    raise NotImplementedError


def posponer(alerta: Alerta, nueva_fecha: date) -> None:
    raise NotImplementedError
