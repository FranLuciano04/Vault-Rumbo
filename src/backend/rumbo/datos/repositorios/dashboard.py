"""Consultas del dashboard (CU-21): agregados de `Oportunidad`, `Viaje`, `Pago`, `Alerta` y
`ViajeHotel`. Todas aplican la visibilidad del actor y, si se pide, el filtro por responsable."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, NamedTuple

from sqlalchemy import Date, Select, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import (
    Alerta,
    Cliente,
    Destino,
    EstadoAlerta,
    EstadoOportunidad,
    EstadoPago,
    EstadoViaje,
    Moneda,
    Oportunidad,
    Pago,
    TipoAlerta,
    TipoComision,
    TipoPago,
    Usuario,
    Viaje,
    ViajeHotel,
)
from rumbo.datos.repositorios.base import Visibilidad

_ZONA = "America/Argentina/Buenos_Aires"
# Las alertas que el dashboard cuenta: las de pasajeros próximos a viajar (CU-21).
_ALERTAS_DE_PASAJEROS = (
    TipoAlerta.pago,
    TipoAlerta.formulario,
    TipoAlerta.salida,
    TipoAlerta.viaje,
)
_VIAJES_CERRADOS = (EstadoViaje.finalizado, EstadoViaje.cancelado)


class VentaDelPeriodo(NamedTuple):
    """Lo que el dashboard necesita de un `Viaje` vendido."""

    moneda: Moneda
    precio_venta: Decimal
    ganancia: Decimal
    comision_tipo: TipoComision
    comision_vendedor: Decimal
    vendedor_id: uuid.UUID  # quien vendió o, si no hay vendedor, el responsable (DEC-0024)
    vendedor_nombre: str


class VencimientoDelPeriodo(NamedTuple):
    pago_id: uuid.UUID
    viaje_id: uuid.UUID
    cliente_nombre: str
    tipo: TipoPago
    monto: Decimal
    moneda: Moneda
    vencimiento: date
    estado: EstadoPago


class ViajeDelPeriodo(NamedTuple):
    viaje_id: uuid.UUID
    cliente_nombre: str
    destino_nombre: str
    fecha_salida: date
    estado: EstadoViaje
    pasajeros: int | None


class DestinoDelPeriodo(NamedTuple):
    destino_id: uuid.UUID
    destino_nombre: str
    viajes: int
    pasajeros: int


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
        desde: datetime | None = None,
        hasta: datetime | None = None,
        responsable_id: uuid.UUID | None,
        visibilidad: Visibilidad,
    ) -> dict[EstadoOportunidad, int]:
        """Cantidad de oportunidades por estado; solo los estados con alguna. Con `desde` y
        `hasta`, las creadas en `[desde, hasta)`; sin ellos, todas (foto de hoy)."""
        consulta = visibilidad.aplicar(select(Oportunidad), Oportunidad)
        if desde is not None and hasta is not None:
            consulta = consulta.where(
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
        vendedor = func.coalesce(Viaje.vendedor_id, Viaje.responsable_id)
        consulta = _de_viajes_vendidos(
            visibilidad.aplicar(select(Viaje), Viaje).join(Usuario, Usuario.id == vendedor),
            desde,
            hasta,
            responsable_id,
        )
        if vendedor_id is not None:
            consulta = consulta.where(vendedor == vendedor_id)
        columnas = consulta.with_only_columns(
            Viaje.moneda,
            Viaje.precio_venta,
            Viaje.precio_venta - Viaje.costo,
            Viaje.comision_tipo,
            Viaje.comision_vendedor,
            vendedor,
            Usuario.nombre,
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

    async def pendiente_de_pagar(
        self,
        sesion: AsyncSession,
        *,
        responsable_id: uuid.UUID | None,
        visibilidad: Visibilidad,
    ) -> dict[Moneda, Decimal]:
        """Foto de hoy: `costo` de los viajes no cancelados con algún tramo de hotel sin pagar
        al proveedor, por moneda del viaje y una sola vez por viaje."""
        sin_pagar = select(ViajeHotel.viaje_id).where(
            ViajeHotel.pago_proveedor_realizado.is_(False)
        )
        consulta = visibilidad.aplicar(select(Viaje), Viaje).where(
            Viaje.estado != EstadoViaje.cancelado, Viaje.id.in_(sin_pagar)
        )
        if responsable_id is not None:
            consulta = consulta.where(Viaje.responsable_id == responsable_id)
        agregado = consulta.with_only_columns(Viaje.moneda, func.sum(Viaje.costo)).group_by(
            Viaje.moneda
        )
        return {moneda: total for moneda, total in await sesion.execute(agregado)}

    async def viajes_por_estado(
        self,
        sesion: AsyncSession,
        *,
        responsable_id: uuid.UUID | None,
        visibilidad: Visibilidad,
    ) -> dict[EstadoViaje, int]:
        """Foto de hoy: cantidad de viajes por estado, sea cual sea su fecha de venta."""
        consulta = visibilidad.aplicar(select(Viaje), Viaje)
        if responsable_id is not None:
            consulta = consulta.where(Viaje.responsable_id == responsable_id)
        agregado = consulta.with_only_columns(Viaje.estado, func.count()).group_by(Viaje.estado)
        return {estado: cantidad for estado, cantidad in await sesion.execute(agregado)}

    async def alertas_pendientes(
        self,
        sesion: AsyncSession,
        *,
        hasta: date,
        responsable_id: uuid.UUID | None,
        visibilidad: Visibilidad,
    ) -> int:
        """Foto de hoy: alertas pendientes de pasajeros con fecha hasta `hasta` inclusive. Las
        de un tramo de hotel son pagos al proveedor y no cuentan. `responsable_id` deja las de
        esa persona; sin él, las que el actor ve."""
        consulta = visibilidad.aplicar(select(func.count()).select_from(Alerta), Alerta).where(
            Alerta.estado == EstadoAlerta.pendiente,
            Alerta.tipo.in_(_ALERTAS_DE_PASAJEROS),
            Alerta.fecha <= hasta,
            Alerta.viaje_hotel_id.is_(None),
        )
        if responsable_id is not None:
            consulta = consulta.where(Alerta.propietario_id == responsable_id)
        return await sesion.scalar(consulta) or 0

    async def vencimientos_proximos(
        self,
        sesion: AsyncSession,
        *,
        desde: date,
        hasta: date,
        responsable_id: uuid.UUID | None,
        visibilidad: Visibilidad,
    ) -> list[VencimientoDelPeriodo]:
        """Pagos pendientes que vencen en `[desde, hasta]`, del más próximo al más lejano."""
        consulta = (
            visibilidad.aplicar(select(Pago), Pago)
            .join(Viaje, Viaje.id == Pago.viaje_id)
            .join(Cliente, Cliente.id == Viaje.cliente_id)
            .where(
                Pago.estado == EstadoPago.pendiente,
                Pago.vencimiento >= desde,
                Pago.vencimiento <= hasta,
            )
        )
        if responsable_id is not None:
            consulta = consulta.where(Viaje.responsable_id == responsable_id)
        columnas = consulta.with_only_columns(
            Pago.id,
            Pago.viaje_id,
            Cliente.nombre,
            Pago.tipo,
            Pago.monto,
            Viaje.moneda,
            Pago.vencimiento,
            Pago.estado,
        ).order_by(Pago.vencimiento, Pago.id)
        return [VencimientoDelPeriodo._make(fila) for fila in await sesion.execute(columnas)]

    async def viajes_proximos(
        self,
        sesion: AsyncSession,
        *,
        desde: date,
        hasta: date,
        responsable_id: uuid.UUID | None,
        visibilidad: Visibilidad,
    ) -> list[ViajeDelPeriodo]:
        """Viajes sin finalizar ni cancelar que salen en `[desde, hasta]`, del más próximo."""
        consulta = (
            visibilidad.aplicar(select(Viaje), Viaje)
            .join(Cliente, Cliente.id == Viaje.cliente_id)
            .join(Destino, Destino.id == Viaje.destino_id)
            .outerjoin(Oportunidad, Oportunidad.id == Viaje.oportunidad_id)
            .where(
                Viaje.estado.not_in(_VIAJES_CERRADOS),
                Viaje.fecha_salida >= desde,
                Viaje.fecha_salida <= hasta,
            )
        )
        if responsable_id is not None:
            consulta = consulta.where(Viaje.responsable_id == responsable_id)
        columnas = consulta.with_only_columns(
            Viaje.id,
            Cliente.nombre,
            Destino.nombre,
            Viaje.fecha_salida,
            Viaje.estado,
            Oportunidad.pasajeros,
        ).order_by(Viaje.fecha_salida, Viaje.id)
        return [ViajeDelPeriodo._make(fila) for fila in await sesion.execute(columnas)]

    async def destinos_mas_vendidos(
        self,
        sesion: AsyncSession,
        *,
        desde: datetime,
        hasta: datetime,
        responsable_id: uuid.UUID | None,
        limite: int,
        visibilidad: Visibilidad,
    ) -> list[DestinoDelPeriodo]:
        """Los `limite` destinos con más viajes vendidos en `[desde, hasta)` (a igual cantidad,
        por nombre), con los pasajeros de las oportunidades de origen."""
        consulta = _de_viajes_vendidos(
            visibilidad.aplicar(select(Viaje), Viaje)
            .join(Destino, Destino.id == Viaje.destino_id)
            .outerjoin(Oportunidad, Oportunidad.id == Viaje.oportunidad_id),
            desde,
            hasta,
            responsable_id,
        )
        viajes = func.count(Viaje.id)
        columnas = (
            consulta.with_only_columns(
                Destino.id,
                Destino.nombre,
                viajes,
                func.coalesce(func.sum(Oportunidad.pasajeros), 0),
            )
            .group_by(Destino.id, Destino.nombre)
            .order_by(viajes.desc(), Destino.nombre)
            .limit(limite)
        )
        return [DestinoDelPeriodo._make(fila) for fila in await sesion.execute(columnas)]

    async def ventas_por_mes(
        self,
        sesion: AsyncSession,
        *,
        desde: datetime,
        hasta: datetime,
        responsable_id: uuid.UUID | None,
        visibilidad: Visibilidad,
    ) -> dict[tuple[date, Moneda], Decimal]:
        """Suma de `precio_venta` de los viajes no cancelados creados en `[desde, hasta)`, por
        mes (en hora de Argentina; primer día del mes) y moneda."""
        mes = cast(func.date_trunc("month", func.timezone(_ZONA, Viaje.created_at)), Date)
        consulta = _de_viajes_vendidos(
            visibilidad.aplicar(select(Viaje), Viaje), desde, hasta, responsable_id
        )
        agregado = consulta.with_only_columns(
            mes, Viaje.moneda, func.sum(Viaje.precio_venta)
        ).group_by(mes, Viaje.moneda)
        return {(dia, moneda): total for dia, moneda, total in await sesion.execute(agregado)}
