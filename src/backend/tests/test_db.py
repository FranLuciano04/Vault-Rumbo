from collections.abc import AsyncIterator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from rumbo.core import db
from rumbo.core.db import SesionDep, crear_fabrica_sesiones, sesion_por_pedido


@pytest.fixture
async def tabla(motor: AsyncEngine) -> None:
    async with motor.begin() as conexion:
        await conexion.execute(
            text("CREATE TABLE IF NOT EXISTS t006_prueba (marca text PRIMARY KEY)")
        )


async def _marcas(motor: AsyncEngine) -> list[str]:
    async with motor.connect() as conexion:
        filas = await conexion.execute(text("SELECT marca FROM t006_prueba ORDER BY marca"))
        return [f[0] for f in filas]


async def _limpiar(motor: AsyncEngine) -> None:
    async with motor.begin() as conexion:
        await conexion.execute(text("DELETE FROM t006_prueba"))


@pytest.fixture
async def fabrica(
    motor: AsyncEngine, tabla: None
) -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    await _limpiar(motor)
    yield crear_fabrica_sesiones(motor)
    await _limpiar(motor)


# --- Aislamiento por test: el primero inserta, el segundo (corre después) no ve nada ---


async def test_rnf05_a_test_inserta_y_hace_commit_en_su_sesion(
    sesion: AsyncSession, tabla: None
) -> None:
    await sesion.execute(text("INSERT INTO t006_prueba VALUES ('aislamiento')"))
    await sesion.commit()

    cantidad = await sesion.scalar(text("SELECT count(*) FROM t006_prueba"))
    assert cantidad == 1


async def test_rnf05_b_el_test_siguiente_no_ve_lo_insertado(
    sesion: AsyncSession, tabla: None
) -> None:
    cantidad = await sesion.scalar(text("SELECT count(*) FROM t006_prueba"))

    assert cantidad == 0


# --- Un caso de uso = una transacción ---


async def test_rnf05_pedido_exitoso_hace_commit_al_final(
    fabrica: async_sessionmaker[AsyncSession], motor: AsyncEngine
) -> None:
    pedido = sesion_por_pedido(fabrica)
    s = await anext(pedido)
    await s.execute(text("INSERT INTO t006_prueba VALUES ('ok')"))
    assert await _marcas(motor) == []  # nada visible antes de terminar el pedido

    with pytest.raises(StopAsyncIteration):
        await anext(pedido)

    assert await _marcas(motor) == ["ok"]


async def test_rnf05_error_dentro_del_pedido_revierte_todo(
    fabrica: async_sessionmaker[AsyncSession], motor: AsyncEngine
) -> None:
    pedido = sesion_por_pedido(fabrica)
    s = await anext(pedido)
    await s.execute(text("INSERT INTO t006_prueba VALUES ('uno')"))
    await s.execute(text("INSERT INTO t006_prueba VALUES ('dos')"))

    with pytest.raises(RuntimeError, match="falla del caso de uso"):
        await pedido.athrow(RuntimeError("falla del caso de uso"))

    assert await _marcas(motor) == []


# --- AsyncClient con la app ---


async def test_rnf05_cliente_httpx_atiende_la_app(cliente: AsyncClient) -> None:
    respuesta = await cliente.get("/api/salud")

    assert respuesta.status_code == 200
    assert respuesta.json() == {"estado": "ok"}


# --- El commit corre antes de responder: si falla, el cliente no recibe 2xx ---


async def test_rnf05_commit_que_falla_no_responde_2xx_ni_deja_la_fila(
    motor: AsyncEngine, tabla: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    async with motor.begin() as conexion:
        await conexion.execute(text("DROP TABLE IF EXISTS t006_diferida"))
        await conexion.execute(
            text(
                "CREATE TABLE t006_diferida (id int PRIMARY KEY, "
                "padre int REFERENCES t006_diferida(id) DEFERRABLE INITIALLY DEFERRED)"
            )
        )
    monkeypatch.setattr(db, "_fabrica_de_la_app", lambda: crear_fabrica_sesiones(motor))

    app = FastAPI()

    @app.post("/inserta")
    async def inserta(s: SesionDep) -> dict[str, str]:
        # La FK diferida solo falla en el COMMIT.
        await s.execute(text("INSERT INTO t006_diferida VALUES (1, 999)"))
        return {"estado": "ok"}

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app, raise_app_exceptions=False), base_url="http://test"
        ) as c:
            respuesta = await c.post("/inserta")

        assert respuesta.status_code >= 500
        async with motor.connect() as conexion:
            filas = await conexion.scalar(text("SELECT count(*) FROM t006_diferida"))
        assert filas == 0
    finally:
        async with motor.begin() as conexion:
            await conexion.execute(text("DROP TABLE IF EXISTS t006_diferida"))
