"""Repositorio del catálogo de destinos: `Destino` (CU-26)."""

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Destino
from rumbo.datos.modelos.base import nombre_normalizado
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad, normalizar


def _escapar_like(texto: str) -> str:
    return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class RepositorioDestinos(RepositorioBase[Destino]):
    modelo = Destino

    async def buscar_por_nombre(
        self,
        sesion: AsyncSession,
        nombre: str,
        *,
        excluir_id: uuid.UUID | None = None,
        visibilidad: Visibilidad,
    ) -> Destino | None:
        """Destino con el mismo nombre sin distinguir mayúsculas, tildes ni espacios de más,
        activo o no. `excluir_id` deja afuera al destino que se está editando."""
        consulta = select(Destino).where(nombre_normalizado(Destino.nombre) == normalizar(nombre))
        if excluir_id is not None:
            consulta = consulta.where(Destino.id != excluir_id)
        consulta = visibilidad.aplicar(consulta, Destino)
        return await sesion.scalar(consulta.limit(1))

    async def paginar(
        self,
        sesion: AsyncSession,
        *,
        activo: bool,
        buscar: str | None,
        desplazamiento: int,
        limite: int,
        visibilidad: Visibilidad,
    ) -> tuple[list[Destino], int]:
        """Página de destinos ordenada por nombre y el total que cumple los filtros.
        `buscar` mira nombre y país sin distinguir mayúsculas, tildes ni espacios de más."""
        consulta = visibilidad.aplicar(select(Destino), Destino)
        consulta = consulta.where(Destino.activo == activo)
        if buscar:
            patron = f"%{_escapar_like(normalizar(buscar))}%"
            consulta = consulta.where(
                or_(
                    nombre_normalizado(Destino.nombre).like(patron, escape="\\"),
                    nombre_normalizado(Destino.pais).like(patron, escape="\\"),
                )
            )
        total = await sesion.scalar(select(func.count()).select_from(consulta.subquery()))
        pagina = consulta.order_by(nombre_normalizado(Destino.nombre), Destino.id)
        filas = await sesion.scalars(pagina.offset(desplazamiento).limit(limite))
        return list(filas), total or 0
