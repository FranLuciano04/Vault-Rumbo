"""Repositorio de las reseñas de hoteles: `Resena` (CU-17)."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import NoEncontrado
from rumbo.datos.modelos import Resena
from rumbo.datos.repositorios.base import RepositorioBase


class RepositorioResenas(RepositorioBase[Resena]):
    modelo = Resena

    async def obtener_aunque_oculta(self, sesion: AsyncSession, id: uuid.UUID) -> Resena:
        """Reseña por id sin el filtro de visibilidad, que esconde las ocultas a quien no es
        admin ni dueño: sirve para decir «está oculta» (409) en vez de «no existe» (404).
        Solo lo llaman los gestores del catálogo, que ya pasaron `exigir_rol`."""
        resena = await sesion.get(Resena, id)
        if resena is None:
            raise NoEncontrado(f"Resena {id} no encontrado")
        return resena
