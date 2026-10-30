"""Servicio del calendario: viajes, vencimientos de pagos y alertas en un rango (CU-23, RF-136 a
RF-139)."""

import uuid
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import DatosInvalidos
from rumbo.core.fechas import hoy, sumar_meses
from rumbo.datos.modelos import EstadoAlerta, EstadoPago, EstadoViaje, RolUsuario, Usuario
from rumbo.datos.repositorios.calendario import RepositorioCalendario
from rumbo.negocio.politicas import visibilidad

_calendario = RepositorioCalendario()

TipoEvento = Literal["viaje", "vencimiento", "alerta"]

MAX_DIAS_DEL_RANGO = 62  # dos meses: la grilla del calendario no pide más


@dataclass(frozen=True)
class Evento:
    """Un hecho con fecha. Los ids que no corresponden al `tipo` quedan en `None`."""

    tipo: TipoEvento
    titulo: str
    desde: date
    hasta: date
    estado: EstadoViaje | EstadoPago | EstadoAlerta
    viaje_id: uuid.UUID | None
    pago_id: uuid.UUID | None
    alerta_id: uuid.UUID | None
    responsable_id: uuid.UUID


def _rango(desde: date | None, hasta: date | None) -> tuple[date, date]:
    if desde is None:
        desde = (hasta or hoy()).replace(day=1)
    if hasta is None:
        hasta = sumar_meses(desde.replace(day=1), 1) - timedelta(days=1)
    if desde > hasta:
        raise DatosInvalidos("hasta", "La fecha final no puede ser anterior a la inicial.")
    if (hasta - desde).days + 1 > MAX_DIAS_DEL_RANGO:
        raise DatosInvalidos("hasta", f"El rango no puede pasar de {MAX_DIAS_DEL_RANGO} días.")
    return desde, hasta


async def consultar_calendario(
    sesion: AsyncSession,
    actor: Usuario,
    *,
    desde: date | None,
    hasta: date | None,
    mios: bool,
    tipo: TipoEvento | None,
    responsable_id: uuid.UUID | None,
) -> list[Evento]:
    """Eventos del rango `[desde, hasta]`, inclusivo y en fechas de Argentina. Sin rango, el mes
    en curso; con un solo extremo, el otro es el del mes de ese extremo. `desde > hasta` o más de
    `MAX_DIAS_DEL_RANGO` días es un dato inválido. La visibilidad sale de la política (el
    freelance ve la suya de DEC-0008 e ignora `responsable_id`; las alertas ajenas solo las ve
    la dirección). `mios` deja lo que lleva el actor, y `responsable_id`, lo de esa persona."""
    desde, hasta = _rango(desde, hasta)
    if actor.rol is RolUsuario.freelance:
        responsable_id = None
    if mios:
        responsable_id = actor.id
    vista = visibilidad(actor)
    eventos: list[Evento] = []
    if tipo in (None, "viaje"):
        eventos += [
            Evento(
                "viaje",
                f"{v.cliente_nombre} — {v.destino_nombre}",
                v.fecha_salida,
                v.fecha_regreso,
                v.estado,
                v.viaje_id,
                None,
                None,
                v.responsable_id,
            )
            for v in await _calendario.viajes(
                sesion, desde=desde, hasta=hasta, responsable_id=responsable_id, visibilidad=vista
            )
        ]
    if tipo in (None, "vencimiento"):
        eventos += [
            Evento(
                "vencimiento",
                f"Vence un pago de {p.cliente_nombre}",
                p.vencimiento,
                p.vencimiento,
                p.estado,
                p.viaje_id,
                p.pago_id,
                None,
                p.responsable_id,
            )
            for p in await _calendario.vencimientos(
                sesion, desde=desde, hasta=hasta, responsable_id=responsable_id, visibilidad=vista
            )
        ]
    if tipo in (None, "alerta"):
        eventos += [
            Evento(
                "alerta",
                a.descripcion,
                a.fecha,
                a.fecha,
                a.estado,
                a.viaje_id,
                None,
                a.alerta_id,
                a.propietario_id,
            )
            for a in await _calendario.alertas(
                sesion, desde=desde, hasta=hasta, responsable_id=responsable_id, visibilidad=vista
            )
        ]
    return sorted(eventos, key=lambda e: (e.desde, e.hasta))
