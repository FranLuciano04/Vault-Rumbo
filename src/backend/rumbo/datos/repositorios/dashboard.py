"""Consultas del dashboard (CU-21): agregados de `Oportunidad`, `Viaje` y `Pago` de un período.
Todas aplican la visibilidad del actor y, si se pide, el filtro por responsable."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, NamedTuple

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import (
    EstadoOportunidad,
    EstadoPago,
    EstadoViaje,
    Moneda,
    Oportunidad,
    Pago,
    TipoComision,
    Viaje,
)
from rumbo.datos.repositorios.base import Visibilidad


class VentaDelPeriodo(NamedTuple):
    """Lo que el dashboard necesita de un `Viaje` vendido."""

    moneda: Moneda
    precio_venta: Decimal
    ganancia: Decimal
    comision_tipo: TipoComision
    comision_vendedor: Decimal


def _de_viajes_vendidos(
    consulta: Select[Any], desde: datetime, hasta: datetime, responsable_id: uuid.UUID | None
) -> Select[Any]:
    """Viajes creados en `[desde, hasta)` que no están cancelados (una venta)."""
    consulta = consulta.where(
        Viaje.created_at >= desde, Viaje.created_at < hasta, Viaje.estado != EstadoViaje.cancelado
    )
    if responsable_id is not None:
        consulta = consulta.where(Viaje.responsable_id == responsable_id)
    return consulta


class RepositorioDashboard:
    async def oportunidades_por_estado(
        self,
        sesion: AsyncSession,
        *,
        desde: datetime,
        hasta: datetime,
        responsable_id: uuid.UUID | None,
        visibilidad: Visibilidad,
    ) -> dict[EstadoOportunidad, int]:
        """Cantidad de oportunidades creadas en `[desde, hasta)` por estado; solo los estados
        con alguna."""
        consulta = visibilidad.aplicar(select(Oportunidad), Oportunidad).where(
            Oportunidad.created_at >= desde, Oportunidad.created_at < hasta
        )
        if responsable_id is not None:
            consulta = consulta.where(Oportunidad.responsable_id == responsable_id)
        agregado = consulta.with_only_columns(Oportunidad.estado, func.count()).group_by(
            Oportunidad.estado
        )
        return {estado: cantidad for estado, cantidad in await sesion.execute(agregado)}

    async def ventas(
        self,
        sesion: AsyncSession,
        *,
        desde: datetime,
        hasta: datetime,
        responsable_id: uuid.UUID | None,
        vendedor_id: uuid.UUID | None = None,
        visibilidad: Visibilidad,
    ) -> list[VentaDelPeriodo]:
        """Los viajes no cancelados creados en `[desde, hasta)`. `vendedor_id` deja los que
        vendió esa persona o, si no tienen vendedor, los que lleva como responsable."""
        consulta = _de_viajes_vendidos(
            visibilidad.aplicar(select(Viaje), Viaje), desde, hasta, responsable_id
        )
        if vendedor_id is not None:
            consulta = consulta.where(
                func.coalesce(Viaje.vendedor_id, Viaje.responsable_id) == vendedor_id
            )
        columnas = consulta.with_only_columns(
            Viaje.moneda,
            Viaje.precio_venta,
            Viaje.precio_venta - Viaje.costo,
            Viaje.comision_tipo,
            Viaje.comision_vendedor,
        )
        return [VentaDelPeriodo(*fila) for fila in await sesion.execute(columnas)]

    async def cobrado(
        self,
        sesion: AsyncSession,
        *,
        desde: date,
        hasta: date,
        responsable_id: uuid.UUID | None,
        visibilidad: Visibilidad,
    ) -> dict[Moneda, Decimal]:
        """Suma de `monto_cobrado` de los pagos cobrados con `fecha_cobro` en `[desde, hasta]`,
        por moneda del cobro."""
        consulta = (
            visibilidad.aplicar(select(Pago), Pago)
            .join(Viaje, Viaje.id == Pago.viaje_id)
            .where(
                Pago.estado == EstadoPago.pagado,
                Pago.fecha_cobro >= desde,
                Pago.fecha_cobro <= hasta,
            )
        )
        if responsable_id is not None:
            consulta = consulta.where(Viaje.responsable_id == responsable_id)
        agregado = consulta.with_only_columns(
            Pago.moneda_pago, func.sum(Pago.monto_cobrado)
        ).group_by(Pago.moneda_pago)
        return {
            moneda: total for moneda, total in await sesion.execute(agregado) if moneda and total
        }

    async def pendiente_de_cobrar(
        self,
        sesion: AsyncSession,
        *,
        responsable_id: uuid.UUID | None,
        visibilidad: Visibilidad,
    ) -> dict[Moneda, Decimal]:
        """Foto de hoy: suma de los pagos pendientes o vencidos, sea cual sea el viaje y su
        fecha de venta, por moneda del viaje. Los de viajes cancelados ya están anulados."""
        consulta = (
            visibilidad.aplicar(select(Pago), Pago)
            .join(Viaje, Viaje.id == Pago.viaje_id)
            .where(Pago.estado.in_((EstadoPago.pendiente, EstadoPago.vencido)))
        )
        if responsable_id is not None:
            consulta = consulta.where(Viaje.responsable_id == responsable_id)
        agregado = consulta.with_only_columns(Viaje.moneda, func.sum(Pago.monto)).group_by(
            Viaje.moneda
        )
        return {moneda: total for moneda, total in await sesion.execute(agregado)}
