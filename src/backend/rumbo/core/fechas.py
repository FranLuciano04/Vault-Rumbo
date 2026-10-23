"""Fecha de negocio: el día calendario en Argentina, no el del servidor."""

from datetime import date, datetime
from zoneinfo import ZoneInfo

_ZONA = ZoneInfo("America/Argentina/Buenos_Aires")


def hoy() -> date:
    """Hoy en hora de Argentina."""
    return datetime.now(_ZONA).date()
