"""Semilla de demo de M3 (T-060): recordatorios manuales ficticios."""

from sqlalchemy.ext.asyncio import AsyncSession


async def sembrar_alertas(sesion: AsyncSession) -> None:
    """Carga los recordatorios de demo, idempotente. Corre después de la de clientes."""
    raise NotImplementedError
