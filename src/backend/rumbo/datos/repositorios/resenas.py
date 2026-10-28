"""Repositorio de las reseñas de hoteles: `Resena` (CU-17, CU-29)."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import NoEncontrado
from rumbo.datos.modelos import Resena
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad


class RepositorioResenas(RepositorioBase[Resena]):
    modelo = Resena

    async def obtener_para_modificar(
        self, sesion: AsyncSession, id: uuid.UUID, *, visibilidad: Visibilidad
    ) -> Resena:
        """Como `obtener`, pero bloqueada hasta el fin de la transacción y releída de la base,
        para que dos moderaciones o ediciones concurrentes no se pisen."""
        consulta = visibilidad.aplicar(select(Resena).where(Resena.id == id), Resena)
        consulta = consulta.with_for_update().execution_options(populate_existing=True)
        resena = await sesion.scalar(consulta)
        if resena is None:
            raise NoEncontrado(f"Resena {id} no encontrada")
        return resena
