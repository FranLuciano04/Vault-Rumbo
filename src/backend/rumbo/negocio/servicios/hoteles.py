"""Servicio del módulo hoteles: gestión del catálogo (CU-16)."""

import uuid
from decimal import Decimal
from typing import Any, NamedTuple

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import EstadoHotel, Hotel, RolUsuario, Usuario
from rumbo.datos.repositorios.destinos import RepositorioDestinos
from rumbo.datos.repositorios.hoteles import RepositorioHoteles
from rumbo.negocio.errores import Conflicto, HotelDuplicado
from rumbo.negocio.politicas import exigir_rol, visibilidad

_hoteles = RepositorioHoteles()
_destinos = RepositorioDestinos()

# El catálogo es compartido: lo gestionan todos menos el freelance, que solo consulta (DEC-0008).
_GESTORES = (RolUsuario.admin, RolUsuario.dueno, RolUsuario.empleado)


class HotelConResenas(NamedTuple):
    """Un `Hotel` con el resumen de sus reseñas publicadas, que no se guarda (CU-18)."""

    hotel: Hotel
    puntaje_promedio: Decimal | None
    cantidad_resenas: int


async def obtener_hotel(
    sesion: AsyncSession, actor: Usuario, hotel_id: uuid.UUID
) -> HotelConResenas:
    """Un `Hotel`, activo o cerrado (CU-18). Lo leen todos."""
    hotel = await _hoteles.obtener(sesion, hotel_id, visibilidad=visibilidad(actor))
    return await _con_resenas(sesion, hotel)


async def crear_hotel(
    sesion: AsyncSession,
    actor: Usuario,
    *,
    nombre: str,
    destino_id: uuid.UUID,
    categoria: str | None = None,
    precio_referencia: Decimal | None = None,
    servicios: list[str],
) -> HotelConResenas:
    """Da de alta un `Hotel` activo (CU-16, RF-097, RF-098). No puede repetirse en el destino."""
    exigir_rol(actor, *_GESTORES)
    await _destinos.obtener(sesion, destino_id, visibilidad=visibilidad(actor))
    await _exigir_sin_duplicado(sesion, actor, destino_id, nombre)
    hotel = Hotel(
        nombre=nombre,
        destino_id=destino_id,
        categoria=categoria,
        precio_referencia=precio_referencia,
        servicios=Hotel.texto_de_servicios(servicios),
    )
    sesion.add(hotel)
    await sesion.flush()
    return await _con_resenas(sesion, hotel)


async def editar_hotel(
    sesion: AsyncSession, actor: Usuario, hotel_id: uuid.UUID, cambios: dict[str, Any]
) -> HotelConResenas:
    """Aplica solo los campos enviados (CU-16, RF-097); un hotel cerrado no se edita."""
    exigir_rol(actor, *_GESTORES)
    hotel = await _hoteles.obtener(sesion, hotel_id, visibilidad=visibilidad(actor))
    _exigir_activo(hotel)
    if "destino_id" in cambios:
        await _destinos.obtener(sesion, cambios["destino_id"], visibilidad=visibilidad(actor))
    if "nombre" in cambios or "destino_id" in cambios:
        await _exigir_sin_duplicado(
            sesion,
            actor,
            cambios.get("destino_id", hotel.destino_id),
            cambios.get("nombre", hotel.nombre),
            excluir_id=hotel.id,
        )
    if "servicios" in cambios:
        cambios = {**cambios, "servicios": Hotel.texto_de_servicios(cambios["servicios"])}
    for campo, valor in cambios.items():
        setattr(hotel, campo, valor)
    await sesion.flush()
    return await _con_resenas(sesion, hotel)


async def dar_de_baja_hotel(
    sesion: AsyncSession, actor: Usuario, hotel_id: uuid.UUID
) -> HotelConResenas:
    """Baja lógica: el hotel pasa a `cerrado` y conserva sus reseñas (CU-16 A4, RF-100)."""
    exigir_rol(actor, *_GESTORES)
    hotel = await _hoteles.obtener(sesion, hotel_id, visibilidad=visibilidad(actor))
    _exigir_activo(hotel)
    hotel.estado = EstadoHotel.cerrado
    await sesion.flush()
    return await _con_resenas(sesion, hotel)


def _exigir_activo(hotel: Hotel) -> None:
    if hotel.estado is not EstadoHotel.activo:
        raise Conflicto(f"El hotel «{hotel.nombre}» está cerrado.")


async def _exigir_sin_duplicado(
    sesion: AsyncSession,
    actor: Usuario,
    destino_id: uuid.UUID,
    nombre: str,
    *,
    excluir_id: uuid.UUID | None = None,
) -> None:
    """`HotelDuplicado` si otro hotel activo del destino ya se llama así (CU-16 A2, RF-099)."""
    repetido = await _hoteles.buscar_activo_por_nombre(
        sesion, destino_id, nombre, excluir_id=excluir_id, visibilidad=visibilidad(actor)
    )
    if repetido is not None:
        raise HotelDuplicado(repetido)


async def _con_resenas(sesion: AsyncSession, hotel: Hotel) -> HotelConResenas:
    promedio, cantidad = await _hoteles.resumen_resenas(sesion, hotel.id)
    return HotelConResenas(hotel, promedio, cantidad)
