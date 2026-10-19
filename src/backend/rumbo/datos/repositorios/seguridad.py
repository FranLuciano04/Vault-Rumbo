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

    async def buscar_por_email(self, sesion: AsyncSession, email: str) -> Usuario | None:
        """Usuario con ese email. Sin filtro de visibilidad: es la búsqueda de `datos-iniciales`,
        que corre sin actor."""
        return await sesion.scalar(select(Usuario).where(Usuario.email == email))
