"""Repositorio del catálogo de hoteles: `Hotel` y el resumen de sus reseñas (CU-16, CU-18)."""

import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import EstadoHotel, EstadoResena, Hotel, Resena
from rumbo.datos.modelos.base import nombre_normalizado
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad, normalizar


class RepositorioHoteles(RepositorioBase[Hotel]):
    modelo = Hotel

    async def buscar_activo_por_nombre(
        self,
        sesion: AsyncSession,
        destino_id: uuid.UUID,
        nombre: str,
        *,
        excluir_id: uuid.UUID | None = None,
        visibilidad: Visibilidad,
    ) -> Hotel | None:
        """Hotel activo del destino con el mismo nombre, sin distinguir mayúsculas, tildes ni
        espacios de más (RF-099). `excluir_id` deja afuera el hotel que se está editando."""
        consulta = select(Hotel).where(
            Hotel.destino_id == destino_id,
            Hotel.estado == EstadoHotel.activo,
            nombre_normalizado(Hotel.nombre) == normalizar(nombre),
        )
        if excluir_id is not None:
            consulta = consulta.where(Hotel.id != excluir_id)
        return await sesion.scalar(visibilidad.aplicar(consulta, Hotel).limit(1))

    async def resumen_resenas(
        self, sesion: AsyncSession, hotel_id: uuid.UUID
    ) -> tuple[Decimal | None, int]:
        """Promedio con dos decimales (vacío si no hay) y cantidad de las reseñas publicadas."""
        promedio, cantidad = (
            await sesion.execute(
                select(func.round(func.avg(Resena.puntaje), 2), func.count()).where(
                    Resena.hotel_id == hotel_id, Resena.estado == EstadoResena.publicada
                )
            )
        ).one()
        return promedio, cantidad
