"""Repositorio del módulo oportunidades: `Oportunidad` (CU-05)."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import EstadoOportunidad, Oportunidad
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad


class RepositorioOportunidades(RepositorioBase[Oportunidad]):
    modelo = Oportunidad

    async def paginar(
        self,
        sesion: AsyncSession,
        *,
        estado: EstadoOportunidad | None,
        cliente_id: uuid.UUID | None,
        responsable_id: uuid.UUID | None,
        desplazamiento: int,
        limite: int,
        visibilidad: Visibilidad,
    ) -> tuple[list[Oportunidad], int]:
        """Página ordenada por la última modificación y el total que cumple los filtros;
        `responsable_id` deja solo las asignadas a ese `Usuario`."""
        consulta = visibilidad.aplicar(select(Oportunidad), Oportunidad)
        if estado is not None:
            consulta = consulta.where(Oportunidad.estado == estado)
        if cliente_id is not None:
            consulta = consulta.where(Oportunidad.cliente_id == cliente_id)
        if responsable_id is not None:
            consulta = consulta.where(Oportunidad.responsable_id == responsable_id)
        total = await sesion.scalar(select(func.count()).select_from(consulta.subquery()))
        pagina = consulta.order_by(Oportunidad.updated_at.desc(), Oportunidad.id)
        filas = await sesion.scalars(pagina.offset(desplazamiento).limit(limite))
        return list(filas), total or 0
