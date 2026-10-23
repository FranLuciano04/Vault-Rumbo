import asyncio
import os
import re
import subprocess
import sys
from collections.abc import AsyncIterator, Awaitable, Callable, Iterator
from pathlib import Path

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

# T-140 (RNF-15): el sandbox de Claude Code define SSLKEYLOGFILE y, en Windows, asyncpg
# aborta al conectarse con «OPENSSL_Uplink … no OPENSSL_Applink». Los tests no necesitan
# el log de claves TLS, así que se quita antes de cualquier conexión.
os.environ.pop("SSLKEYLOGFILE", None)


class _EntornoTests(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    test_database_url: str


def url_de_tests(url: str, worker: str | None) -> str:
    """T-154: URL de la base de tests que usa este proceso.

    - `localhost` pasa a `127.0.0.1`: en Windows resuelve primero a `::1`, falla contra el puerto
      que publica Docker y recién después cae a IPv4 (2,1 s por conexión contra 0,02 s).
    - Con pytest-xdist (`worker` = `gw0`, `gw1`, …) cada worker usa su propia base, para que no
      se pisen: `rumbo_test` pasa a `rumbo_gw0_test`. Conserva el sufijo `_test` de la guarda.
    """
    destino = make_url(url)
    # La guarda mira el nombre ORIGINAL: el sufijo que se agrega por worker no la puede burlar.
    if not (destino.database or "").endswith("_test"):
        raise ValueError(
            f"TEST_DATABASE_URL apunta a «{destino.database}»: el nombre de la base de tests "
            "tiene que terminar en «_test»"
        )
    if destino.host == "localhost":
        destino = destino.set(host="127.0.0.1")
    if worker and destino.database:
        raiz = destino.database.removesuffix("_test")
        destino = destino.set(database=f"{raiz}_{worker}_test")
    return destino.render_as_string(hide_password=False)


_URL_TESTS = url_de_tests(
    _EntornoTests().test_database_url,  # type: ignore[call-arg]
    os.environ.get("PYTEST_XDIST_WORKER"),
)

# La app lee DATABASE_URL al importarse; los tests siempre apuntan a la base de tests.
os.environ["DATABASE_URL"] = _URL_TESTS
# Los tests nunca usan Firebase ni el Auth Emulator (DEC-0016): la variable vacía en el proceso
# manda sobre la que tenga el `.env` local.
os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = ""

from rumbo.core.db import obtener_sesion  # noqa: E402
from rumbo.core.seguridad import TokenInvalido, obtener_verificador  # noqa: E402
from rumbo.datos.modelos import RolUsuario, Usuario  # noqa: E402
from rumbo.main import app, crear_app  # noqa: E402
from tests.fabricas import UsuarioFactory, crear  # noqa: E402

RAIZ_BACKEND = Path(__file__).resolve().parent.parent


_ALEMBIC = Path(sys.executable).parent / ("alembic.exe" if os.name == "nt" else "alembic")


def correr_alembic(url: str, *args: str) -> subprocess.CompletedProcess[str]:
    """Corre Alembic como subproceso contra `url` (env.py toma DATABASE_URL del entorno)."""
    return subprocess.run(  # noqa: S603
        [str(_ALEMBIC), *args],
        cwd=RAIZ_BACKEND,
        env={**os.environ, "DATABASE_URL": url},
        capture_output=True,
        text=True,
        check=False,
    )


async def _crear_base_si_falta(url: str) -> None:
    """Un worker de xdist estrena su base la primera vez (la base común ya existe)."""
    destino = make_url(url)
    nombre = destino.database or ""
    if not re.fullmatch(r"[a-z0-9_]{1,63}", nombre):
        raise ValueError(
            f"nombre de base de tests inválido «{nombre}»: solo minúsculas, dígitos y «_» "
            "(hasta 63 caracteres)"
        )
    admin = create_async_engine(
        destino.set(database="postgres"), poolclass=NullPool, isolation_level="AUTOCOMMIT"
    )
    try:
        async with admin.connect() as conexion:
            existe = await conexion.scalar(
                text("SELECT 1 FROM pg_database WHERE datname = :nombre"),
                {"nombre": destino.database},
            )
            if not existe:
                await conexion.execute(text(f'CREATE DATABASE "{destino.database}"'))
    finally:
        await admin.dispose()


async def _esquema_vacio(url: str) -> None:
    motor = create_async_engine(url, poolclass=NullPool)
    try:
        async with motor.begin() as conexion:
            await conexion.execute(text("DROP SCHEMA public CASCADE"))
            await conexion.execute(text("CREATE SCHEMA public"))
    finally:
        await motor.dispose()


@pytest.fixture(scope="session")
def base_de_tests_migrada() -> None:
    """T-008: la base de tests se prepara con la migración de Alembic, no con create_all."""
    nombre = make_url(_URL_TESTS).database or ""
    assert nombre.endswith("_test"), (
        f"TEST_DATABASE_URL apunta a «{nombre}»: se niega a borrar el esquema de una base "
        "cuyo nombre no termina en «_test»"
    )
    asyncio.run(_crear_base_si_falta(_URL_TESTS))
    asyncio.run(_esquema_vacio(_URL_TESTS))
    resultado = correr_alembic(_URL_TESTS, "upgrade", "head")
    assert resultado.returncode == 0, resultado.stdout + resultado.stderr


@pytest.fixture(autouse=True)
def _sin_cliente_real_de_claude(monkeypatch: pytest.MonkeyPatch) -> None:
    """T-013 (RNF-16): ningún test puede construir el cliente real de Claude."""

    def _prohibido(api_key: object) -> None:
        raise AssertionError("los tests no pueden construir el cliente real de Claude")

    monkeypatch.setattr("rumbo.core.ia._construir_cliente_claude", _prohibido)


@pytest.fixture
def url_tests() -> str:
    return _URL_TESTS


@pytest.fixture
async def motor(url_tests: str, base_de_tests_migrada: None) -> AsyncIterator[AsyncEngine]:
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
        async with sesion.begin_nested():
            yield sesion

    app.dependency_overrides[obtener_sesion] = _sesion_de_test
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c
    finally:
        app.dependency_overrides.pop(obtener_sesion, None)


class VerificadorFalso:
    """Verificador de tokens de Firebase para los tests (DEC-0016): nunca toca Firebase real
    ni el emulador. `emitir(uid)` da un token válido; `vencer(token)` lo vuelve vencido."""

    def __init__(self) -> None:
        self._uid_por_token: dict[str, str] = {}
        self._vencidos: set[str] = set()

    def emitir(self, firebase_uid: str) -> str:
        token = f"token-falso-{firebase_uid}"
        self._uid_por_token[token] = firebase_uid
        return token

    def vencer(self, token: str) -> None:
        self._vencidos.add(token)

    async def verificar(self, token: str) -> str:
        if token in self._vencidos:
            raise TokenInvalido("token vencido")
        try:
            return self._uid_por_token[token]
        except KeyError:
            raise TokenInvalido("token inválido") from None


@pytest.fixture
def verificador_falso() -> VerificadorFalso:
    return VerificadorFalso()


@pytest.fixture
def app_de_tests(sesion: AsyncSession, verificador_falso: VerificadorFalso) -> Iterator[FastAPI]:
    """App nueva con la sesión de test y el verificador falso inyectados."""
    nueva = crear_app()

    async def _sesion_de_test() -> AsyncIterator[AsyncSession]:
        async with sesion.begin_nested():
            yield sesion

    nueva.dependency_overrides[obtener_sesion] = _sesion_de_test
    nueva.dependency_overrides[obtener_verificador] = lambda: verificador_falso
    yield nueva
    nueva.dependency_overrides.clear()


@pytest.fixture
async def cliente_sin_sesion(app_de_tests: FastAPI) -> AsyncIterator[AsyncClient]:
    """Cliente sin `Authorization`, contra `app_de_tests`."""
    transporte = ASGITransport(app=app_de_tests, raise_app_exceptions=False)
    async with AsyncClient(transport=transporte, base_url="http://test") as c:
        yield c


@pytest.fixture
async def cliente_como(
    app_de_tests: FastAPI, sesion: AsyncSession, verificador_falso: VerificadorFalso
) -> AsyncIterator[Callable[[str], Awaitable[AsyncClient]]]:
    """Cliente autenticado por rol: `await cliente_como("admin")` (también `dueno`,
    `empleado`, `freelance`). Crea el `Usuario` activo del rol y firma sus pedidos con un
    token del verificador falso. El usuario queda en `cliente.usuario`."""
    abiertos: list[AsyncClient] = []

    async def _crear(rol: str) -> AsyncClient:
        usuario: Usuario = await crear(sesion, UsuarioFactory, rol=RolUsuario(rol), activo=True)
        token = verificador_falso.emitir(usuario.firebase_uid)
        transporte = ASGITransport(app=app_de_tests, raise_app_exceptions=False)
        c = AsyncClient(
            transport=transporte,
            base_url="http://test",
            headers={"Authorization": f"Bearer {token}"},
        )
        c.usuario = usuario  # type: ignore[attr-defined]
        abiertos.append(c)
        return c

    yield _crear
    for c in abiertos:
        await c.aclose()
