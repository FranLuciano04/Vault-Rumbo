"""Servicio de las reseñas de hoteles: registrarlas y corregirlas (CU-17)."""

import uuid
from datetime import date
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import EstadoResena, Resena, RolUsuario, Usuario
from rumbo.datos.repositorios.clientes import RepositorioClientes
from rumbo.datos.repositorios.hoteles import RepositorioHoteles
from rumbo.datos.repositorios.resenas import RepositorioResenas
from rumbo.datos.repositorios.viajes import RepositorioViajes
from rumbo.negocio.errores import Conflicto, DatosInvalidos, NoEncontrado
from rumbo.negocio.politicas import exigir_rol, visibilidad

_resenas = RepositorioResenas()
_hoteles = RepositorioHoteles()
_clientes = RepositorioClientes()
_viajes = RepositorioViajes()

# Igual que el catálogo de hoteles: todos menos el freelance (DEC-0008).
_GESTORES = (RolUsuario.admin, RolUsuario.dueno, RolUsuario.empleado)


async def registrar_resena(
    sesion: AsyncSession,
    actor: Usuario,
    hotel_id: uuid.UUID,
    *,
    cliente_id: uuid.UUID,
    viaje_id: uuid.UUID | None = None,
    puntaje: int,
    comentario: str,
    fecha: date,
) -> Resena:
    """Registra una reseña `publicada` de un cliente sobre un hotel, activo o cerrado
    (CU-17, RF-101 a RF-104). Un cliente puede reseñar el mismo hotel varias veces."""
    exigir_rol(actor, *_GESTORES)
    await _hoteles.obtener(sesion, hotel_id, visibilidad=visibilidad(actor))
    await _exigir_cliente_y_viaje(sesion, actor, cliente_id, viaje_id)
    resena = Resena(
        hotel_id=hotel_id,
        cliente_id=cliente_id,
        viaje_id=viaje_id,
        puntaje=puntaje,
        comentario=comentario,
        fecha=fecha,
    )
    sesion.add(resena)
    await sesion.flush()
    return resena


async def editar_resena(
    sesion: AsyncSession, actor: Usuario, resena_id: uuid.UUID, cambios: dict[str, Any]
) -> Resena:
    """Aplica solo los campos enviados (CU-17, RF-105); una reseña `oculta` no se edita."""
    exigir_rol(actor, *_GESTORES)
    resena = await _resenas.obtener(sesion, resena_id, visibilidad=visibilidad(actor))
    if resena.estado is not EstadoResena.publicada:
        raise Conflicto("La reseña está oculta: restaurala para editarla.")
    for campo, valor in cambios.items():
        setattr(resena, campo, valor)
    await sesion.flush()
    return resena


async def _exigir_cliente_y_viaje(
    sesion: AsyncSession, actor: Usuario, cliente_id: uuid.UUID, viaje_id: uuid.UUID | None
) -> None:
    """422 en su campo si el cliente o el viaje no existen, o si el viaje es de otro cliente."""
    try:
        await _clientes.obtener(sesion, cliente_id, visibilidad=visibilidad(actor))
    except NoEncontrado:
        raise DatosInvalidos("cliente_id", "El cliente no existe.") from None
    if viaje_id is None:
        return
    try:
        viaje = await _viajes.obtener(sesion, viaje_id, visibilidad=visibilidad(actor))
    except NoEncontrado:
        raise DatosInvalidos("viaje_id", "El viaje no existe.") from None
    if viaje.cliente_id != cliente_id:
        raise DatosInvalidos("viaje_id", "El viaje no es de ese cliente.")
