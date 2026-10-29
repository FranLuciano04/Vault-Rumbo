"""Repositorio del catálogo de hoteles: `Hotel` y el resumen de sus reseñas (CU-16, CU-18)."""

import uuid
from decimal import Decimal
from typing import Literal

from sqlalchemy import exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import NoEncontrado
from rumbo.datos.modelos import EstadoHotel, EstadoResena, Hotel, Resena
from rumbo.datos.modelos.base import nombre_normalizado
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad, normalizar


class RepositorioHoteles(RepositorioBase[Hotel]):
    modelo = Hotel

    async def obtener_para_modificar(
        self, sesion: AsyncSession, id: uuid.UUID, *, visibilidad: Visibilidad
    ) -> Hotel:
        """Como `obtener`, pero bloqueado hasta el fin de la transacción y releído de la base,
        para que dos ediciones o bajas concurrentes no se pisen."""
        consulta = visibilidad.aplicar(select(Hotel).where(Hotel.id == id), Hotel)
        # key_share = FOR NO KEY UPDATE: no frena a quien referencia el hotel (reseña, cotización).
        consulta = consulta.with_for_update(key_share=True).execution_options(
            populate_existing=True
        )
        hotel = await sesion.scalar(consulta)
        if hotel is None:
            raise NoEncontrado(f"Hotel {id} no encontrado")
        return hotel

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

    async def buscar(
        self,
        sesion: AsyncSession,
        *,
        destino_id: uuid.UUID | None,
        categoria: str | None,
        precio_max: Decimal | None,
        servicio: str | None,
        orden: Literal["nombre", "valoracion", "precio"],
        estado: EstadoHotel,
        desplazamiento: int,
        limite: int,
        visibilidad: Visibilidad,
    ) -> tuple[list[tuple[Hotel, Decimal | None, int]], int]:
        """Página de hoteles con su promedio y cantidad de reseñas publicadas, y el total que
        cumple los filtros (CU-18, RF-106 a RF-109). El resumen sale de la misma consulta, con una
        subconsulta agrupada por hotel, sin N+1. Los filtros se combinan con AND."""
        resumen = (
            select(
                Resena.hotel_id,
                func.round(func.avg(Resena.puntaje), 2).label("promedio"),
                func.count().label("cantidad"),
            )
            .where(Resena.estado == EstadoResena.publicada)
            .group_by(Resena.hotel_id)
            .subquery()
        )
        filtros = [Hotel.estado == estado]
        if destino_id is not None:
            filtros.append(Hotel.destino_id == destino_id)
        if categoria:
            filtros.append(func.lower(Hotel.categoria) == categoria.lower())
        if precio_max is not None:
            filtros.append(Hotel.precio_referencia <= precio_max)
        if servicio:
            ofrecido = func.unnest(Hotel.servicios).column_valued("ofrecido")
            filtros.append(exists().where(func.lower(ofrecido) == servicio.lower()))
        criterio = {
            "nombre": [],
            "valoracion": [resumen.c.promedio.desc().nulls_last()],
            "precio": [Hotel.precio_referencia.asc().nulls_last()],
        }[orden]
        consulta = (
            select(Hotel, resumen.c.promedio, func.coalesce(resumen.c.cantidad, 0))
            .outerjoin(resumen, resumen.c.hotel_id == Hotel.id)
            .where(*filtros)
        )
        consulta = visibilidad.aplicar(consulta, Hotel).order_by(
            *criterio, nombre_normalizado(Hotel.nombre), Hotel.id
        )
        total = await sesion.scalar(
            visibilidad.aplicar(select(func.count()).select_from(Hotel), Hotel).where(*filtros)
        )
        filas = await sesion.execute(consulta.offset(desplazamiento).limit(limite))
        return [(hotel, promedio, cantidad) for hotel, promedio, cantidad in filas], total or 0

    async def resumen_resenas(
        self, sesion: AsyncSession, hotel_id: uuid.UUID
    ) -> tuple[Decimal | None, int]:
        """Promedio con dos decimales (vacío si no hay) y cantidad de las reseñas publicadas de
        UN hotel. El listado no debe llamarlo por fila (N+1): agrupar en una sola consulta."""
        promedio, cantidad = (
            await sesion.execute(
                select(func.round(func.avg(Resena.puntaje), 2), func.count()).where(
                    Resena.hotel_id == hotel_id, Resena.estado == EstadoResena.publicada
                )
            )
        ).one()
        return promedio, cantidad
