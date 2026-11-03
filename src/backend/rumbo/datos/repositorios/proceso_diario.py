"""Repositorio del proceso diario: el bloqueo que evita que dos corridas pisen un paso (T-113)."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


class RepositorioProcesoDiario:
    async def bloquear_paso(self, sesion: AsyncSession, nombre: str) -> None:
        """Bloqueo transaccional (advisory lock) del paso `nombre` hasta el fin de la
        transacción: si dos corridas se solapan, la segunda espera a que la primera confirme ese
        paso y, como es idempotente, ya ve lo que hizo."""
        clave = f"proceso-diario:{nombre}"
        await sesion.execute(select(func.pg_advisory_xact_lock(func.hashtextextended(clave, 0))))
