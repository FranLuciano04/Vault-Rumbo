"""Semilla de demo de M1 (T-038): destinos con requisitos, operadores y usuarios ficticios."""

from sqlalchemy.ext.asyncio import AsyncSession


async def sembrar_configuracion(sesion: AsyncSession) -> None:
    """Carga los datos de demo de Configuración, idempotente."""
    raise NotImplementedError
