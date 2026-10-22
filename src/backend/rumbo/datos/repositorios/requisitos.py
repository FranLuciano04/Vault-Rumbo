"""Repositorio de los requisitos de cada destino: `RequisitoDestino` (CU-15)."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import RequisitoDestino
from rumbo.datos.modelos.base import nombre_normalizado
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad


class RepositorioRequisitos(RepositorioBase[RequisitoDestino]):
    modelo = RequisitoDestino

    async def paginar_activos(
        self,
        sesion: AsyncSession,
        destino_id: uuid.UUID,
        *,
        desplazamiento: int,
        limite: int,
        visibilidad: Visibilidad,
    ) -> tuple[list[RequisitoDestino], int]:
        """Página de los requisitos activos de un destino ordenada por nombre y el total."""
        consulta = visibilidad.aplicar(select(RequisitoDestino), RequisitoDestino)
        consulta = consulta.where(
            RequisitoDestino.destino_id == destino_id, RequisitoDestino.activo.is_(True)
        )
        total = await sesion.scalar(select(func.count()).select_from(consulta.subquery()))
        pagina = consulta.order_by(nombre_normalizado(RequisitoDestino.nombre), RequisitoDestino.id)
        filas = await sesion.scalars(pagina.offset(desplazamiento).limit(limite))
        return list(filas), total or 0
