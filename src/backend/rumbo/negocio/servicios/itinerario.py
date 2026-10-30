"""Servicio del itinerario de hoteles del viaje: sus tramos y la alerta del pago al proveedor
(CU-09, RF-043, RF-044, RF-046, RF-106, DEC-0003)."""

import uuid
from datetime import date
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import sumar_meses
from rumbo.datos.modelos import (
    EstadoAlerta,
    EstadoHotel,
    EstadoViaje,
    TipoAlerta,
    Usuario,
    Viaje,
    ViajeHotel,
)
from rumbo.datos.repositorios.alertas import RepositorioAlertas
from rumbo.datos.repositorios.hoteles import RepositorioHoteles
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios
from rumbo.datos.repositorios.viajes import RepositorioTramos, RepositorioViajes
from rumbo.negocio.errores import Conflicto, DatosInvalidos, NoEncontrado
from rumbo.negocio.estados import alerta as estado_alerta
from rumbo.negocio.politicas import exigir_escritura, visibilidad
from rumbo.negocio.servicios import alertas

_viajes = RepositorioViajes()
_tramos = RepositorioTramos()
_hoteles = RepositorioHoteles()
_usuarios = RepositorioUsuarios()
_alertas = RepositorioAlertas()


async def listar_itinerario(
    sesion: AsyncSession, actor: Usuario, viaje_id: uuid.UUID
) -> list[ViajeHotel]:
    """Los tramos del viaje por `orden`; sin hoteles es una lista vacía (CU-09 A1, RF-106). Un
    viaje que el actor no ve es `NoEncontrado`."""
    vista = visibilidad(actor)
    await _viajes.obtener(sesion, viaje_id, visibilidad=vista)
    return await _tramos.listar_de_viaje(sesion, viaje_id, visibilidad=vista)


async def agregar_tramo(
    sesion: AsyncSession, actor: Usuario, viaje_id: uuid.UUID, datos: dict[str, Any]
) -> ViajeHotel:
    """Agrega un hotel del catálogo al itinerario (CU-09, RF-043); el mismo hotel puede repetirse
    en otro tramo (A5, RF-044). Con vencimiento del pago al proveedor, deja una alerta `pago` en
    la agenda del responsable un mes antes. Un hotel fuera del catálogo es `NoEncontrado` (A2).
    Escribe el responsable, admin o dueño (DEC-0005)."""
    vista = visibilidad(actor)
    viaje = await _viajes.obtener_para_modificar(sesion, viaje_id, visibilidad=vista)
    exigir_escritura(actor, viaje)
    _exigir_viaje_abierto(viaje)
    await _exigir_hotel(sesion, actor, datos["hotel_id"])
    otros = await _tramos.listar_de_viaje(sesion, viaje.id, visibilidad=vista)
    _exigir_tramo_valido(viaje, datos["check_in"], datos["check_out"], datos["orden"], otros)

    tramo = ViajeHotel(viaje_id=viaje.id, **datos)
    sesion.add(tramo)
    await sesion.flush()
    await sesion.refresh(tramo)  # trae `pago_proveedor_realizado`, que pone la base
    if tramo.vencimiento_pago_proveedor is not None:
        await _agendar_pago_al_proveedor(
            sesion, actor, viaje, tramo, tramo.vencimiento_pago_proveedor
        )
    return tramo


async def editar_tramo(
    sesion: AsyncSession, actor: Usuario, tramo_id: uuid.UUID, cambios: dict[str, Any]
) -> ViajeHotel:
    """Aplica solo los campos enviados (CU-09, RF-046). Cambiar el vencimiento reagenda la alerta
    del pago al proveedor (A3); marcarlo realizado la resuelve (A4)."""
    vista = visibilidad(actor)
    tramo = await _tramos.obtener(sesion, tramo_id, visibilidad=vista)
    viaje = await _viajes.obtener_para_modificar(sesion, tramo.viaje_id, visibilidad=vista)
    exigir_escritura(actor, viaje)
    _exigir_viaje_abierto(viaje)
    await sesion.refresh(tramo)  # releído con el viaje ya bloqueado
    if cambios.get("hotel_id", tramo.hotel_id) != tramo.hotel_id:
        await _exigir_hotel(sesion, actor, cambios["hotel_id"])
    otros = [
        t
        for t in await _tramos.listar_de_viaje(sesion, viaje.id, visibilidad=vista)
        if t.id != tramo.id
    ]
    _exigir_tramo_valido(
        viaje,
        cambios.get("check_in", tramo.check_in),
        cambios.get("check_out", tramo.check_out),
        cambios.get("orden", tramo.orden),
        otros,
    )

    for campo, valor in cambios.items():
        setattr(tramo, campo, valor)
    await sesion.flush()
    if tramo.pago_proveedor_realizado or tramo.vencimiento_pago_proveedor is None:
        await alertas.resolver_de_origen(sesion, tramo, (TipoAlerta.pago,))
    elif "vencimiento_pago_proveedor" in cambios or "pago_proveedor_realizado" in cambios:
        await _agendar_pago_al_proveedor(
            sesion, actor, viaje, tramo, tramo.vencimiento_pago_proveedor
        )
    return tramo


async def quitar_tramo(sesion: AsyncSession, actor: Usuario, tramo_id: uuid.UUID) -> None:
    """Quita el tramo del itinerario y cierra su alerta (CU-09 A3, RF-046)."""
    vista = visibilidad(actor)
    tramo = await _tramos.obtener(sesion, tramo_id, visibilidad=vista)
    viaje = await _viajes.obtener_para_modificar(sesion, tramo.viaje_id, visibilidad=vista)
    exigir_escritura(actor, viaje)
    _exigir_viaje_abierto(viaje)
    await alertas.resolver_de_origen(sesion, tramo, (TipoAlerta.pago,))
    await sesion.delete(tramo)
    await sesion.flush()


async def _exigir_hotel(sesion: AsyncSession, actor: Usuario, hotel_id: uuid.UUID) -> None:
    """422 si el hotel no está en el catálogo o está cerrado (CU-09 A2)."""
    try:
        hotel = await _hoteles.obtener(sesion, hotel_id, visibilidad=visibilidad(actor))
    except NoEncontrado:
        raise DatosInvalidos("hotel_id", "El hotel no está en el catálogo.") from None
    if hotel.estado is EstadoHotel.cerrado:
        raise DatosInvalidos("hotel_id", "El hotel está cerrado.")


def _exigir_viaje_abierto(viaje: Viaje) -> None:
    if viaje.estado is EstadoViaje.cancelado:
        raise Conflicto("No se cambia el itinerario de un viaje cancelado.")


def _exigir_tramo_valido(
    viaje: Viaje, check_in: date, check_out: date, orden: int, otros: list[ViajeHotel]
) -> None:
    """Fechas ordenadas, dentro del viaje, sin pisar a otro tramo (el check-out de uno puede ser
    el check-in del siguiente) y con un `orden` que no use otro tramo."""
    if check_out < check_in:
        raise DatosInvalidos("check_out", "El check-out no puede ser anterior al check-in.")
    if check_in < viaje.fecha_salida or check_out > viaje.fecha_regreso:
        campo = "check_in" if check_in < viaje.fecha_salida else "check_out"
        raise DatosInvalidos(campo, "Las fechas del tramo deben estar dentro del viaje.")
    if any(check_in < o.check_out and o.check_in < check_out for o in otros):
        raise DatosInvalidos("check_in", "Las fechas se solapan con otro tramo del itinerario.")
    if any(o.orden == orden for o in otros):
        raise DatosInvalidos("orden", "Ya hay otro tramo con ese orden.")


async def _agendar_pago_al_proveedor(
    sesion: AsyncSession, actor: Usuario, viaje: Viaje, tramo: ViajeHotel, vencimiento: date
) -> None:
    """Deja una sola alerta `pago` abierta, un mes antes del vencimiento: reagenda la que hay o
    crea la primera (CU-09 pasos 5 y A3)."""
    fecha = sumar_meses(vencimiento, -1)
    abiertas = await _alertas.listar_de_origen(
        sesion, tramo, (EstadoAlerta.pendiente,), (TipoAlerta.pago,)
    )
    if abiertas:
        estado_alerta.editar(
            abiertas[0], {"fecha": fecha, "descripcion": _descripcion(vencimiento)}
        )
        await sesion.flush()
        return
    responsable = (
        actor
        if actor.id == viaje.responsable_id
        else await _usuarios.obtener(sesion, viaje.responsable_id, visibilidad=visibilidad(actor))
    )
    await alertas.crear(
        sesion,
        TipoAlerta.pago,
        fecha,
        _descripcion(vencimiento),
        responsable,
        tramo,
    )


def _descripcion(vencimiento: date) -> str:
    return f"Vence el pago al proveedor del hotel el {vencimiento.strftime('%d/%m/%y')}."
