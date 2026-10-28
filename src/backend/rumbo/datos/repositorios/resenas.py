"""Repositorio de las reseñas de hoteles: `Resena` (CU-17, CU-29)."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import NoEncontrado
from rumbo.datos.modelos import EstadoResena, Resena
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad


class RepositorioResenas(RepositorioBase[Resena]):
    modelo = Resena

    async def paginar_por_hotel(
        self,
        sesion: AsyncSession,
        hotel_id: uuid.UUID,
        *,
        estado: EstadoResena,
        desplazamiento: int,
        limite: int,
        visibilidad: Visibilidad,
    ) -> tuple[list[Resena], int]:
        """Página de las reseñas de un hotel en ese estado, de la más reciente a la más antigua,
        y el total (CU-18, CU-29 A1)."""
        consulta = visibilidad.aplicar(
            select(Resena).where(Resena.hotel_id == hotel_id, Resena.estado == estado), Resena
        )
        total = await sesion.scalar(select(func.count()).select_from(consulta.subquery()))
        pagina = consulta.order_by(Resena.fecha.desc(), Resena.created_at.desc(), Resena.id)
        filas = await sesion.scalars(pagina.offset(desplazamiento).limit(limite))
        return list(filas), total or 0

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
