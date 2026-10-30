"""Repositorio del módulo viajes: `Viaje` (CU-08, CU-10), sus `Pago` (CU-11, CU-12) y los tramos
de su itinerario (CU-09)."""

import uuid
from datetime import date

from sqlalchemy import exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import NoEncontrado
from rumbo.datos.modelos import EstadoViaje, Pago, Viaje, ViajeHotel
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad


class RepositorioViajes(RepositorioBase[Viaje]):
    modelo = Viaje

    async def paginar(
        self,
        sesion: AsyncSession,
        *,
        estado: EstadoViaje | None,
        desde: date | None,
        hasta: date | None,
        cliente_id: uuid.UUID | None,
        responsable_id: uuid.UUID | None,
        desplazamiento: int,
        limite: int,
        visibilidad: Visibilidad,
    ) -> tuple[list[Viaje], int]:
        """Página ordenada por fecha de salida y el total que cumple los filtros; `desde` y
        `hasta` acotan la fecha de salida, inclusive; `responsable_id` deja los de ese `Usuario`."""
        consulta = visibilidad.aplicar(select(Viaje), Viaje)
        if estado is not None:
            consulta = consulta.where(Viaje.estado == estado)
        if desde is not None:
            consulta = consulta.where(Viaje.fecha_salida >= desde)
        if hasta is not None:
            consulta = consulta.where(Viaje.fecha_salida <= hasta)
        if cliente_id is not None:
            consulta = consulta.where(Viaje.cliente_id == cliente_id)
        if responsable_id is not None:
            consulta = consulta.where(Viaje.responsable_id == responsable_id)
        total = await sesion.scalar(select(func.count()).select_from(consulta.subquery()))
        pagina = consulta.order_by(Viaje.fecha_salida, Viaje.id)
        filas = await sesion.scalars(pagina.offset(desplazamiento).limit(limite))
        return list(filas), total or 0

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

    async def existe_de_oportunidad(self, sesion: AsyncSession, oportunidad_id: uuid.UUID) -> bool:
        """Si la `Oportunidad` ya derivó en un viaje (a lo sumo uno, por la unicidad de
        `oportunidad_id`). Sin filtro de visibilidad: no expone la fila, y el viaje puede quedar
        fuera de la vista de quien ve la oportunidad (un freelance que no es su responsable)."""
        return bool(
            await sesion.scalar(select(exists().where(Viaje.oportunidad_id == oportunidad_id)))
        )


class RepositorioPagos(RepositorioBase[Pago]):
    modelo = Pago

    async def listar_de_viaje(
        self, sesion: AsyncSession, viaje_id: uuid.UUID, *, visibilidad: Visibilidad
    ) -> list[Pago]:
        """Los pagos del viaje, anulados incluidos, por vencimiento."""
        consulta = visibilidad.aplicar(select(Pago).where(Pago.viaje_id == viaje_id), Pago)
        return list(await sesion.scalars(consulta.order_by(Pago.vencimiento, Pago.id)))

    async def listar_de_viajes(
        self, sesion: AsyncSession, viaje_ids: list[uuid.UUID], *, visibilidad: Visibilidad
    ) -> list[Pago]:
        """Los pagos de varios viajes, anulados incluidos, por vencimiento."""
        consulta = visibilidad.aplicar(select(Pago).where(Pago.viaje_id.in_(viaje_ids)), Pago)
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
