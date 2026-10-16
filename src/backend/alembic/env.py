"""Entorno de Alembic (async). La URL sale de DATABASE_URL, igual que la app (DEC-0015)."""

import asyncio
import os

from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from alembic import context
from rumbo.datos.modelos import Base

config = context.config
target_metadata = Base.metadata


def correr_migraciones_offline() -> None:
    context.configure(
        url=os.environ["DATABASE_URL"],
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
    motor = create_async_engine(os.environ["DATABASE_URL"], poolclass=NullPool)
    try:
        async with motor.connect() as conexion:
            await conexion.run_sync(_correr)
    finally:
        await motor.dispose()


if context.is_offline_mode():
    correr_migraciones_offline()
else:
    asyncio.run(correr_migraciones_online())
