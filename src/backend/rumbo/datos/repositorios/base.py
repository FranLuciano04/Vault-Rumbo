"""Repositorio base con visibilidad obligatoria. Stub de T-012."""

import uuid
from typing import Any, ClassVar

from sqlalchemy.ext.asyncio import AsyncSession


class RepositorioBase[T]:
    modelo: ClassVar[type[Any]]

    async def obtener(self, sesion: AsyncSession, id: uuid.UUID, *, visibilidad: Any) -> T:
        raise NotImplementedError

    async def listar(self, sesion: AsyncSession, *, visibilidad: Any) -> list[T]:
        raise NotImplementedError
