"""Semillas de demo: cada módulo registra acá la suya (`datos-iniciales --demo`)."""

from collections.abc import Awaitable, Callable

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.semillas.configuracion import sembrar_configuracion

Semilla = Callable[[AsyncSession], Awaitable[None]]

SEMILLAS: list[Semilla] = [sembrar_configuracion]
"""Semillas registradas, en orden."""
