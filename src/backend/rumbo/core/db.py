from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from rumbo.core.config import get_settings


def crear_motor(url: str) -> AsyncEngine:
    return create_async_engine(url)


def crear_fabrica_sesiones(motor: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(motor, expire_on_commit=False)


async def sesion_por_pedido(
    fabrica: async_sessionmaker[AsyncSession],
) -> AsyncIterator[AsyncSession]:
    """Una sesión por pedido = una transacción: commit al final, rollback ante error."""
    async with fabrica() as sesion:
        try:
            yield sesion
            await sesion.commit()
        except BaseException:
            await sesion.rollback()
            raise


@lru_cache
def _fabrica_de_la_app() -> async_sessionmaker[AsyncSession]:
    return crear_fabrica_sesiones(crear_motor(get_settings().database_url))


async def obtener_sesion() -> AsyncIterator[AsyncSession]:
    """Dependencia de FastAPI: sesión async del pedido."""
    async for sesion in sesion_por_pedido(_fabrica_de_la_app()):
        yield sesion


SesionDep = Annotated[AsyncSession, Depends(obtener_sesion, scope="function")]
"""Única forma de pedir sesión en los routers. `scope="function"` hace que el commit
corra antes de enviar la respuesta: si falla, el cliente recibe un error y no un 2xx."""
