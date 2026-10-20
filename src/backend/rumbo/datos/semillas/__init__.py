"""Semillas de demo: cada módulo registra acá la suya (`datos-iniciales --demo`)."""

from collections.abc import Awaitable, Callable

from sqlalchemy.ext.asyncio import AsyncSession

Semilla = Callable[[AsyncSession], Awaitable[None]]

SEMILLAS: list[Semilla] = []
"""Semillas registradas, en orden. En M0 no hay ninguna."""
