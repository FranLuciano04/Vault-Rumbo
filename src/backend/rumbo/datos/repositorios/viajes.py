"""Repositorio del módulo viajes: `Viaje` (CU-08, CU-10), sus `Pago` (CU-11, CU-12) y los tramos
de su itinerario (CU-09)."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import NoEncontrado
from rumbo.datos.modelos import Pago, Viaje, ViajeHotel
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad


class RepositorioViajes(RepositorioBase[Viaje]):
    modelo = Viaje

    async def obtener_para_modificar(
        self, sesion: AsyncSession, id: uuid.UUID, *, visibilidad: Visibilidad
    ) -> Viaje:
        """Como `obtener`, pero bloqueado hasta el fin de la transacción y releído de la base,
        para que dos cambios simultáneos de la economía o del plan no se pisen."""
        consulta = visibilidad.aplicar(select(Viaje).where(Viaje.id == id), Viaje)
        consulta = consulta.with_for_update(of=Viaje).execution_options(populate_existing=True)
        viaje = await sesion.scalar(consulta)
        if viaje is None:
            raise NoEncontrado(f"Viaje {id} no encontrado")
        return viaje


class RepositorioPagos(RepositorioBase[Pago]):
    modelo = Pago

    async def listar_de_viaje(
        self, sesion: AsyncSession, viaje_id: uuid.UUID, *, visibilidad: Visibilidad
    ) -> list[Pago]:
        """Los pagos del viaje, anulados incluidos, por vencimiento."""
        consulta = visibilidad.aplicar(select(Pago).where(Pago.viaje_id == viaje_id), Pago)
        return list(await sesion.scalars(consulta.order_by(Pago.vencimiento, Pago.id)))


class RepositorioTramos(RepositorioBase[ViajeHotel]):
    modelo = ViajeHotel

    async def listar_de_viaje(
        self, sesion: AsyncSession, viaje_id: uuid.UUID, *, visibilidad: Visibilidad
    ) -> list[ViajeHotel]:
        """Los tramos del itinerario del viaje, por `orden`."""
        consulta = visibilidad.aplicar(
            select(ViajeHotel).where(ViajeHotel.viaje_id == viaje_id), ViajeHotel
        )
        return list(await sesion.scalars(consulta.order_by(ViajeHotel.orden)))
