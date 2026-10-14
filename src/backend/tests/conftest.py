import os
from collections.abc import AsyncIterator

import pytest
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from httpx import ASGITransport, AsyncClient


class _EntornoTests(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    test_database_url: str


_URL_TESTS = _EntornoTests().test_database_url  # type: ignore[call-arg]

# La app lee DATABASE_URL al importarse; los tests siempre apuntan a la base de tests.
os.environ["DATABASE_URL"] = _URL_TESTS

from rumbo.core.db import obtener_sesion  # noqa: E402
from rumbo.main import app  # noqa: E402


@pytest.fixture
def url_tests() -> str:
    return _URL_TESTS


@pytest.fixture
async def motor(url_tests: str) -> AsyncIterator[AsyncEngine]:
    motor = create_async_engine(url_tests, poolclass=NullPool)
    try:
        yield motor
    finally:
        await motor.dispose()


@pytest.fixture
async def sesion(motor: AsyncEngine) -> AsyncIterator[AsyncSession]:
    """Sesión por test dentro de una transacción externa que se revierte siempre,
    aun si el código bajo prueba hace commit (SAVEPOINT)."""
    async with motor.connect() as conexion:
        transaccion = await conexion.begin()
        sesion = AsyncSession(
            bind=conexion, join_transaction_mode="create_savepoint", expire_on_commit=False
        )
        try:
            yield sesion
        finally:
            await sesion.close()
            await transaccion.rollback()


@pytest.fixture
async def cliente(sesion: AsyncSession) -> AsyncIterator[AsyncClient]:
    async def _sesion_de_test() -> AsyncIterator[AsyncSession]:
        yield sesion

    app.dependency_overrides[obtener_sesion] = _sesion_de_test
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c
    finally:
        app.dependency_overrides.pop(obtener_sesion, None)
