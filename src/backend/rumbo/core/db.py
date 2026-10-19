from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy import event
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import Session

from rumbo.core.config import get_settings
from rumbo.core.seguridad import usuario_auditoria


def _lleva_auditoria(fila: object) -> bool:
    """Las filas auditadas son las que tienen las columnas `created_by` y `updated_by`
    (detectadas por mapeo para que `core` no dependa de la capa de datos)."""
    columnas = sa_inspect(fila, raiseerr=True).mapper.columns
    return "created_by" in columnas and "updated_by" in columnas


@event.listens_for(Session, "before_flush")
def _registrar_autor(sesion: Session, *_: object) -> None:
    """Auditoría automática (RF-152, DEC-0008): completa `created_by`/`updated_by` con el
    usuario del pedido; sin usuario (proceso automático) quedan en `None`.

    El autor sale solo de `usuario_auditoria`: para atribuir un cambio fuera de un pedido
    (seed, importación) hay que setear esa ContextVar.

    Restricción: solo cubre lo que pasa por el flush del ORM. Un `update()` masivo no completa
    `updated_by`, así que los repositorios modifican vía ORM, no con `update()` masivo.
    """
    autor = usuario_auditoria.get()
    for fila in sesion.new:
        if _lleva_auditoria(fila):
            fila.created_by = autor
            fila.updated_by = autor
    for fila in sesion.dirty:
        if _lleva_auditoria(fila) and sesion.is_modified(fila):
            fila.updated_by = autor


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
