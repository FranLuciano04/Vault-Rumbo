"""T-079: la moderación de reseñas bloquea la fila y deja rastro de la eliminación física."""

import logging
from typing import Any

import pytest
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from rumbo.negocio.servicios import resenas
from tests.fabricas import (
    ClienteFactory,
    DestinoFactory,
    HotelFactory,
    ResenaFactory,
    UsuarioFactory,
    crear,
)


async def _resena(sesion: AsyncSession, **campos: Any) -> Any:
    destino = await crear(sesion, DestinoFactory)
    hotel = await crear(sesion, HotelFactory, destino_id=destino.id)
    cliente = await crear(sesion, ClienteFactory)
    return await crear(sesion, ResenaFactory, hotel_id=hotel.id, cliente_id=cliente.id, **campos)


async def test_rf111_obtener_para_modificar_bloquea_la_fila(
    sesion: AsyncSession, motor: AsyncEngine
) -> None:
    """Ocultar, restaurar, eliminar y editar leen con `FOR UPDATE` (carrera entre moderadores)."""
    admin = await crear(sesion, UsuarioFactory, rol="admin")
    resena = await _resena(sesion)
    sentencias: list[str] = []

    def capturar(_conn: Any, _cursor: Any, sentencia: str, *_resto: Any) -> None:
        sentencias.append(sentencia)

    motor_sync = motor.sync_engine
    event.listen(motor_sync, "before_cursor_execute", capturar)
    try:
        await resenas.editar_resena(sesion, admin, resena.id, {"puntaje": 2})
        await resenas.ocultar_resena(sesion, admin, resena.id, "Spam")
        await resenas.restaurar_resena(sesion, admin, resena.id)
        await resenas.ocultar_resena(sesion, admin, resena.id, "Spam")
        await resenas.eliminar_resena(sesion, admin, resena.id)
    finally:
        event.remove(motor_sync, "before_cursor_execute", capturar)

    lecturas = [s for s in sentencias if s.lstrip().upper().startswith("SELECT")]
    assert lecturas
    assert all("FOR UPDATE" in s for s in lecturas)


async def test_cu29_eliminacion_fisica_deja_rastro(
    sesion: AsyncSession, caplog: pytest.LogCaptureFixture
) -> None:
    admin = await crear(sesion, UsuarioFactory, rol="admin")
    resena = await _resena(sesion, puntaje=2, estado="oculta", motivo_baja="Spam")

    with caplog.at_level(logging.INFO, logger="rumbo.negocio.servicios.resenas"):
        await resenas.eliminar_resena(sesion, admin, resena.id)

    registro = next(r for r in caplog.records if r.name == "rumbo.negocio.servicios.resenas")
    assert registro.__dict__["resena_id"] == str(resena.id)
    assert registro.__dict__["hotel_id"] == str(resena.hotel_id)
    assert registro.__dict__["cliente_id"] == str(resena.cliente_id)
    assert registro.__dict__["puntaje"] == 2
    assert registro.__dict__["motivo_baja"] == "Spam"
    assert registro.__dict__["actor_id"] == str(admin.id)
