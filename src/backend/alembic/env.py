"""Entorno de Alembic (async). La URL sale de `get_settings()`, igual que la app."""

import asyncio

from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from alembic import context
from rumbo.core.config import get_settings
from rumbo.datos.modelos import Base

config = context.config
target_metadata = Base.metadata


def correr_migraciones_offline() -> None:
    context.configure(
        url=get_settings().database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def _correr(conexion: Connection) -> None:
    context.configure(
        connection=conexion,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def correr_migraciones_online() -> None:
    motor = create_async_engine(get_settings().database_url, poolclass=NullPool)
    try:
        async with motor.connect() as conexion:
            await conexion.run_sync(_correr)
    finally:
        await motor.dispose()


if context.is_offline_mode():
    correr_migraciones_offline()
else:
    asyncio.run(correr_migraciones_online())
