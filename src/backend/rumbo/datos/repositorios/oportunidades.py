"""Repositorio del módulo oportunidades: `Oportunidad` (CU-05) y `Cotizacion` (CU-06)."""

import uuid

from sqlalchemy import exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import NoEncontrado
from rumbo.datos.modelos import Cotizacion, EstadoOportunidad, Oportunidad
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

    async def obtener_para_modificar(
        self, sesion: AsyncSession, id: uuid.UUID, *, visibilidad: Visibilidad
    ) -> Oportunidad:
        """Como `obtener`, pero bloqueada hasta el fin de la transacción y releída de la base,
        para que dos cambios simultáneos no partan del mismo estado (EST-Oportunidad)."""
        consulta = visibilidad.aplicar(select(Oportunidad).where(Oportunidad.id == id), Oportunidad)
        consulta = consulta.with_for_update(of=Oportunidad).execution_options(
            populate_existing=True
        )
        oportunidad = await sesion.scalar(consulta)
        if oportunidad is None:
            raise NoEncontrado(f"Oportunidad {id} no encontrada")
        return oportunidad

    async def existe_de_cliente(
        self, sesion: AsyncSession, *, cliente_id: uuid.UUID, destino_consultado: str
    ) -> bool:
        """Si el `Cliente` ya tiene una oportunidad por ese destino, de cualquier estado. Sin
        filtro de visibilidad: solo para semillas."""
        return bool(
            await sesion.scalar(
                select(
                    exists().where(
                        Oportunidad.cliente_id == cliente_id,
                        Oportunidad.destino_consultado == destino_consultado,
                    )
                )
            )
        )


class RepositorioCotizaciones(RepositorioBase[Cotizacion]):
    modelo = Cotizacion

    async def paginar_de_oportunidad(
        self,
        sesion: AsyncSession,
        oportunidad_id: uuid.UUID,
        *,
        desplazamiento: int,
        limite: int,
        visibilidad: Visibilidad,
    ) -> tuple[list[Cotizacion], int]:
        """Versiones de la oportunidad, la más reciente primero (por `fecha` y, si empatan, por
        `created_at`), y el total."""
        consulta = visibilidad.aplicar(
            select(Cotizacion).where(Cotizacion.oportunidad_id == oportunidad_id), Cotizacion
        )
        total = await sesion.scalar(select(func.count()).select_from(consulta.subquery()))
        pagina = consulta.order_by(
            Cotizacion.fecha.desc(), Cotizacion.created_at.desc(), Cotizacion.id
        )
        filas = await sesion.scalars(pagina.offset(desplazamiento).limit(limite))
        return list(filas), total or 0

    async def obtener_para_modificar(
        self, sesion: AsyncSession, id: uuid.UUID, *, visibilidad: Visibilidad
    ) -> Cotizacion:
        """Como `obtener`, pero bloqueada hasta el fin de la transacción y releída de la base,
        para que dos respuestas simultáneas no partan del mismo estado (EST-Cotización)."""
        consulta = visibilidad.aplicar(select(Cotizacion).where(Cotizacion.id == id), Cotizacion)
        consulta = consulta.with_for_update(of=Cotizacion).execution_options(populate_existing=True)
        cotizacion = await sesion.scalar(consulta)
        if cotizacion is None:
            raise NoEncontrado(f"Cotizacion {id} no encontrada")
        return cotizacion
