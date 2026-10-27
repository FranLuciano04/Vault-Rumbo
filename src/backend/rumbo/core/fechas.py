"""Fecha de negocio: el día calendario en Argentina, no el del servidor."""

import calendar
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

_ZONA = ZoneInfo("America/Argentina/Buenos_Aires")


def hoy() -> date:
    """Hoy en hora de Argentina."""
    return datetime.now(_ZONA).date()


def limites_del_dia(dia: date) -> tuple[datetime, datetime]:
    """Desde las 00:00 de `dia` en Argentina (inclusive) hasta las 00:00 del siguiente (no)."""
    desde = datetime.combine(dia, time.min, tzinfo=_ZONA)
    return desde, datetime.combine(dia + timedelta(days=1), time.min, tzinfo=_ZONA)


def sumar_meses(dia: date, meses: int) -> date:
    """`dia` más `meses` meses calendario; si ese día no existe en el mes de llegada, queda el
    último (31/01 + 1 mes = 28/02 o 29/02)."""
    indice = dia.month - 1 + meses
    anio, mes = dia.year + indice // 12, indice % 12 + 1
    return date(anio, mes, min(dia.day, calendar.monthrange(anio, mes)[1]))
