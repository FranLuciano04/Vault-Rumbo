"""T-011: auditoría automática de `core.db` (RF-152, RNF-04, DEC-0008).

Contrato supuesto: el usuario del pedido es `rumbo.core.seguridad.usuario_auditoria`
(ContextVar). Al hacer flush, `core.db` completa `created_by`/`created_at` en las altas y
`updated_by`/`updated_at` en las modificaciones, sin que el servicio lo haga a mano.
"""

from collections.abc import Iterator

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.seguridad import usuario_auditoria
from rumbo.datos import modelos as m
from tests.fabricas import DestinoFactory, UsuarioFactory, crear


@pytest.fixture(autouse=True)
def _sin_usuario_actual() -> Iterator[None]:
    marca = usuario_auditoria.set(None)
    yield
    usuario_auditoria.reset(marca)


async def _usuario(sesion: AsyncSession) -> m.Usuario:
    marca = usuario_auditoria.set(None)
    try:
        return await crear(sesion, UsuarioFactory)
    finally:
        usuario_auditoria.reset(marca)


async def test_rf152_alta_registra_autor(sesion: AsyncSession) -> None:
    autor = await _usuario(sesion)
    usuario_auditoria.set(autor.id)

    destino = await crear(sesion, DestinoFactory)

    assert destino.created_by == autor.id
    assert destino.updated_by == autor.id
    assert destino.created_at is not None
    assert destino.updated_at is not None


async def test_rf152_modificacion_registra_autor(sesion: AsyncSession) -> None:
    autor = await _usuario(sesion)
    editor = await _usuario(sesion)
    usuario_auditoria.set(autor.id)
    destino = await crear(sesion, DestinoFactory)
    creado_en = destino.created_at

    usuario_auditoria.set(editor.id)
    destino.nombre = "Nombre modificado"
    await sesion.flush()
    await sesion.refresh(destino)

    assert destino.updated_by == editor.id
    assert destino.updated_at >= creado_en
    assert destino.created_by == autor.id
    assert destino.created_at == creado_en


async def test_rf152_proceso_automatico_sin_autor(sesion: AsyncSession) -> None:
    destino = await crear(sesion, DestinoFactory)

    assert destino.created_by is None
    assert destino.updated_by is None
    assert destino.created_at is not None
    assert destino.updated_at is not None


async def test_rf152_modificacion_automatica_deja_updated_by_vacio(
    sesion: AsyncSession,
) -> None:
    autor = await _usuario(sesion)
    usuario_auditoria.set(autor.id)
    destino = await crear(sesion, DestinoFactory)

    usuario_auditoria.set(None)
    destino.nombre = "Cambio del proceso automático"
    await sesion.flush()
    await sesion.refresh(destino)

    assert destino.updated_by is None
    assert destino.created_by == autor.id


def test_rf152_viaje_hotel_no_lleva_auditoria() -> None:
    columnas = set(m.ViajeHotel.__table__.columns.keys())

    assert not columnas & {"created_by", "updated_by", "created_at", "updated_at"}
