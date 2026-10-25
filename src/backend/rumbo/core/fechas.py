"""Fecha de negocio: el día calendario en Argentina, no el del servidor."""

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
