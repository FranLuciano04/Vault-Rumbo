"""Consultas del calendario (CU-23): `Viaje`, vencimientos de `Pago` y `Alerta` en un rango de
fechas. Todas aplican la visibilidad del actor y, si se pide, el filtro por responsable."""

import uuid
from datetime import date
from typing import NamedTuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import (
    Alerta,
    Cliente,
    Destino,
    EstadoAlerta,
    EstadoPago,
    EstadoViaje,
    Pago,
    Viaje,
)
from rumbo.datos.repositorios.base import Visibilidad


class ViajeDelCalendario(NamedTuple):
    viaje_id: uuid.UUID
    cliente_nombre: str
    destino_nombre: str
    fecha_salida: date
    fecha_regreso: date
    estado: EstadoViaje
    responsable_id: uuid.UUID


class VencimientoDelCalendario(NamedTuple):
    pago_id: uuid.UUID
    viaje_id: uuid.UUID
    cliente_nombre: str
    vencimiento: date
    estado: EstadoPago
    responsable_id: uuid.UUID


class AlertaDelCalendario(NamedTuple):
    alerta_id: uuid.UUID
    viaje_id: uuid.UUID | None
    descripcion: str
    fecha: date
    estado: EstadoAlerta
    propietario_id: uuid.UUID


class RepositorioCalendario:
    async def viajes(
        self,
        sesion: AsyncSession,
        *,
        desde: date,
        hasta: date,
        responsable_id: uuid.UUID | None,
        visibilidad: Visibilidad,
    ) -> list[ViajeDelCalendario]:
        """Viajes cuyo tramo de la salida al regreso se superpone con `[desde, hasta]`."""
        consulta = (
            visibilidad.aplicar(select(Viaje), Viaje)
            .join(Cliente, Cliente.id == Viaje.cliente_id)
            .join(Destino, Destino.id == Viaje.destino_id)
            .where(Viaje.fecha_salida <= hasta, Viaje.fecha_regreso >= desde)
        )
        if responsable_id is not None:
            consulta = consulta.where(Viaje.responsable_id == responsable_id)
        columnas = consulta.with_only_columns(
            Viaje.id,
            Cliente.nombre,
            Destino.nombre,
            Viaje.fecha_salida,
            Viaje.fecha_regreso,
            Viaje.estado,
            Viaje.responsable_id,
        ).order_by(Viaje.fecha_salida, Viaje.id)
        return [ViajeDelCalendario._make(fila) for fila in await sesion.execute(columnas)]

    async def vencimientos(
        self,
        sesion: AsyncSession,
        *,
        desde: date,
        hasta: date,
        responsable_id: uuid.UUID | None,
        visibilidad: Visibilidad,
    ) -> list[VencimientoDelCalendario]:
        """Pagos pendientes o vencidos que vencen en `[desde, hasta]`; el responsable es el del
        viaje."""
        consulta = (
            visibilidad.aplicar(select(Pago), Pago)
            .join(Viaje, Viaje.id == Pago.viaje_id)
            .join(Cliente, Cliente.id == Viaje.cliente_id)
            .where(
                Pago.estado.in_((EstadoPago.pendiente, EstadoPago.vencido)),
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
            Pago.vencimiento,
            Pago.estado,
            Viaje.responsable_id,
        ).order_by(Pago.vencimiento, Pago.id)
        return [VencimientoDelCalendario._make(fila) for fila in await sesion.execute(columnas)]

    async def alertas(
        self,
        sesion: AsyncSession,
        *,
        desde: date,
        hasta: date,
        responsable_id: uuid.UUID | None,
        visibilidad: Visibilidad,
    ) -> list[AlertaDelCalendario]:
        """Alertas de cualquier estado y tipo con fecha en `[desde, hasta]`; el responsable es
        el propietario."""
        consulta = visibilidad.aplicar(select(Alerta), Alerta).where(
            Alerta.fecha >= desde, Alerta.fecha <= hasta
        )
        if responsable_id is not None:
            consulta = consulta.where(Alerta.propietario_id == responsable_id)
        columnas = consulta.with_only_columns(
            Alerta.id,
            Alerta.viaje_id,
            Alerta.descripcion,
            Alerta.fecha,
            Alerta.estado,
            Alerta.propietario_id,
        ).order_by(Alerta.fecha, Alerta.id)
        return [AlertaDelCalendario._make(fila) for fila in await sesion.execute(columnas)]
