"""Repositorio del módulo seguridad: `Usuario` (CU-24, CU-25)."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Usuario
from rumbo.datos.repositorios.base import RepositorioBase


class RepositorioUsuarios(RepositorioBase[Usuario]):
    modelo = Usuario

    async def buscar_por_firebase_uid(
        self, sesion: AsyncSession, firebase_uid: str
    ) -> Usuario | None:
        """Usuario dueño de la cuenta de Firebase. Sin filtro de visibilidad: es la búsqueda
        que identifica al actor, antes de que exista uno (DEC-0016)."""
        return await sesion.scalar(select(Usuario).where(Usuario.firebase_uid == firebase_uid))
