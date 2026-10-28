"""Servicio del módulo hoteles: gestión del catálogo (CU-16)."""

import uuid
from decimal import Decimal
from typing import Any, Literal, NamedTuple

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import EstadoHotel, Hotel, RolUsuario, Usuario
from rumbo.datos.modelos.catalogos import INDICE_NOMBRE_HOTEL
from rumbo.datos.repositorios.destinos import RepositorioDestinos
from rumbo.datos.repositorios.hoteles import RepositorioHoteles
from rumbo.negocio.errores import Conflicto, DatosInvalidos, HotelDuplicado, NoEncontrado
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


class Alternativas(NamedTuple):
    """Qué ofrecer cuando una búsqueda no encuentra hoteles (CU-18 A1, RF-110)."""

    ampliar_filtros: list[str]
    puede_dar_de_alta: bool


class ResultadoBusqueda(NamedTuple):
    hoteles: list[HotelConResenas]
    total: int
    alternativas: Alternativas | None


async def buscar_hoteles(
    sesion: AsyncSession,
    actor: Usuario,
    *,
    destino_id: uuid.UUID | None,
    categoria: str | None,
    precio_max: Decimal | None,
    servicio: str | None,
    orden: Literal["nombre", "valoracion", "precio"],
    estado: EstadoHotel,
    desplazamiento: int,
    limite: int,
) -> ResultadoBusqueda:
    """Página de hoteles con su valoración (CU-18, RF-106 a RF-109). Sin resultados, suma las
    alternativas: los filtros que se pueden quitar y si el actor puede dar de alta (RF-110)."""
    filas, total = await _hoteles.buscar(
        sesion,
        destino_id=destino_id,
        categoria=categoria,
        precio_max=precio_max,
        servicio=servicio,
        orden=orden,
        estado=estado,
        desplazamiento=desplazamiento,
        limite=limite,
        visibilidad=visibilidad(actor),
    )
    alternativas = None
    if total == 0:
        aplicados = {
            "destino_id": destino_id is not None,
            "categoria": bool(categoria),
            "precio_max": precio_max is not None,
            "servicio": bool(servicio),
        }
        alternativas = Alternativas(
            ampliar_filtros=[filtro for filtro, aplicado in aplicados.items() if aplicado],
            puede_dar_de_alta=actor.rol in _GESTORES,
        )
    return ResultadoBusqueda([HotelConResenas(*fila) for fila in filas], total, alternativas)


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
    await _exigir_destino(sesion, actor, destino_id)
    await _exigir_sin_duplicado(sesion, actor, destino_id, nombre)
    hotel = Hotel(
        nombre=nombre,
        destino_id=destino_id,
        categoria=categoria or None,
        precio_referencia=precio_referencia,
        servicios=servicios,
    )
    await _guardar_sin_duplicado(sesion, actor, hotel, {})
    return await _con_resenas(sesion, hotel)


async def editar_hotel(
    sesion: AsyncSession, actor: Usuario, hotel_id: uuid.UUID, cambios: dict[str, Any]
) -> HotelConResenas:
    """Aplica solo los campos enviados (CU-16, RF-097); un hotel cerrado no se edita."""
    exigir_rol(actor, *_GESTORES)
    hotel = await _hoteles.obtener(sesion, hotel_id, visibilidad=visibilidad(actor))
    _exigir_activo(hotel)
    if "destino_id" in cambios:
        await _exigir_destino(sesion, actor, cambios["destino_id"])
    if "nombre" in cambios or "destino_id" in cambios:
        await _exigir_sin_duplicado(
            sesion,
            actor,
            cambios.get("destino_id", hotel.destino_id),
            cambios.get("nombre", hotel.nombre),
            excluir_id=hotel.id,
        )
    if "categoria" in cambios:
        cambios["categoria"] = cambios["categoria"] or None
    await _guardar_sin_duplicado(sesion, actor, hotel, cambios)
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


async def _exigir_destino(sesion: AsyncSession, actor: Usuario, destino_id: uuid.UUID) -> None:
    """422 si el destino no existe (mismo criterio que el cliente de una consulta)."""
    try:
        await _destinos.obtener(sesion, destino_id, visibilidad=visibilidad(actor))
    except NoEncontrado:
        raise DatosInvalidos("destino_id", "El destino no existe.") from None


async def _guardar_sin_duplicado(
    sesion: AsyncSession, actor: Usuario, hotel: Hotel, cambios: dict[str, Any]
) -> None:
    """Aplica `cambios` y guarda el `Hotel` (nuevo o ya cargado), traduciendo el choque con el
    índice único del nombre a `HotelDuplicado`: cubre la carrera entre dos altas que pasaron
    `_exigir_sin_duplicado` a la vez. Corre en un savepoint abierto antes de tocar nada, porque
    abrirlo vuelca lo pendiente y un fallo ahí dejaría la sesión inusable."""
    destino_id = cambios.get("destino_id", hotel.destino_id)
    nombre = cambios.get("nombre", hotel.nombre)
    id_ = hotel.id
    try:
        async with sesion.begin_nested():
            for campo, valor in cambios.items():
                setattr(hotel, campo, valor)
            sesion.add(hotel)
            await sesion.flush()
    except IntegrityError as error:
        if INDICE_NOMBRE_HOTEL not in str(error.orig):
            raise
        await _exigir_sin_duplicado(sesion, actor, destino_id, nombre, excluir_id=id_)
        raise


async def _con_resenas(sesion: AsyncSession, hotel: Hotel) -> HotelConResenas:
    promedio, cantidad = await _hoteles.resumen_resenas(sesion, hotel.id)
    return HotelConResenas(hotel, promedio, cantidad)
