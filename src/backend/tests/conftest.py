import asyncio
import os
import subprocess
import sys
from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

# T-140 (RNF-15): el sandbox de Claude Code define SSLKEYLOGFILE y, en Windows, asyncpg
# aborta al conectarse con «OPENSSL_Uplink … no OPENSSL_Applink». Los tests no necesitan
# el log de claves TLS, así que se quita antes de cualquier conexión.
os.environ.pop("SSLKEYLOGFILE", None)


class _EntornoTests(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    test_database_url: str


_URL_TESTS = _EntornoTests().test_database_url  # type: ignore[call-arg]

# La app lee DATABASE_URL al importarse; los tests siempre apuntan a la base de tests.
os.environ["DATABASE_URL"] = _URL_TESTS

from rumbo.core.db import obtener_sesion  # noqa: E402
from rumbo.main import app  # noqa: E402

RAIZ_BACKEND = Path(__file__).resolve().parent.parent


def correr_alembic(url: str, *args: str) -> subprocess.CompletedProcess[str]:
    """Corre Alembic como subproceso contra `url` (env.py toma DATABASE_URL del entorno)."""
    return subprocess.run(  # noqa: S603
        [sys.executable, "-m", "alembic", *args],
        cwd=RAIZ_BACKEND,
        env={**os.environ, "DATABASE_URL": url},
        capture_output=True,
        text=True,
        check=False,
    )


async def _esquema_vacio(url: str) -> None:
    motor = create_async_engine(url, poolclass=NullPool)
    try:
        async with motor.begin() as conexion:
            await conexion.execute(text("DROP SCHEMA public CASCADE"))
            await conexion.execute(text("CREATE SCHEMA public"))
    finally:
        await motor.dispose()


@pytest.fixture(scope="session", autouse=True)
def base_de_tests_migrada() -> None:
    """T-008: la base de tests se prepara con la migración de Alembic, no con create_all."""
    asyncio.run(_esquema_vacio(_URL_TESTS))
    resultado = correr_alembic(_URL_TESTS, "upgrade", "head")
    assert resultado.returncode == 0, resultado.stdout + resultado.stderr


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
