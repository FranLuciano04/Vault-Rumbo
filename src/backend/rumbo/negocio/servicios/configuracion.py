"""Servicio del módulo configuración (CU-13)."""

import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Destino, RolUsuario, TipoComision, Usuario
from rumbo.datos.repositorios.destinos import RepositorioDestinos
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios
from rumbo.negocio.errores import Conflicto
from rumbo.negocio.politicas import exigir_rol, visibilidad

_destinos = RepositorioDestinos()
_usuarios = RepositorioUsuarios()


async def configurar_comision_por_defecto(
    sesion: AsyncSession,
    actor: Usuario,
    usuario_id: uuid.UUID,
    tipo: TipoComision | None,
    valor: Decimal | None,
) -> Usuario:
    """Fija o quita (`None` y `None`) la comisión por defecto de un vendedor (CU-13, RF-083).

    Solo la toman los viajes nuevos: cada `Viaje` guarda su propia comisión (RF-085, DEC-0007).
    La validez de tipo y valor la fijan el esquema de entrada y `usuario_comision_default_ck`.
    """
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    usuario = await _usuarios.obtener(sesion, usuario_id, visibilidad=visibilidad(actor))
    usuario.comision_default_tipo = tipo
    usuario.comision_default_valor = valor
    await sesion.flush()
    return usuario


async def listar_destinos(
    sesion: AsyncSession,
    actor: Usuario,
    *,
    activo: bool | None,
    buscar: str | None,
    desplazamiento: int,
    limite: int,
) -> tuple[list[Destino], int]:
    """Página del catálogo de destinos por nombre y el total (CU-26, RF-089). Lo leen todos."""
    return await _destinos.paginar(
        sesion,
        activo=activo,
        buscar=buscar,
        desplazamiento=desplazamiento,
        limite=limite,
        visibilidad=visibilidad(actor),
    )


async def obtener_destino(sesion: AsyncSession, actor: Usuario, destino_id: uuid.UUID) -> Destino:
    """Un `Destino`, activo o no (CU-26). Lo leen todos."""
    return await _destinos.obtener(sesion, destino_id, visibilidad=visibilidad(actor))


async def crear_destino(
    sesion: AsyncSession,
    actor: Usuario,
    *,
    nombre: str,
    pais: str,
    region: str | None = None,
    notas: str | None = None,
) -> Destino:
    """Da de alta un `Destino` (CU-26, RF-089, RF-090). El nombre no puede repetirse."""
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    await _exigir_nombre_libre(sesion, actor, nombre)
    destino = Destino(nombre=nombre, pais=pais, region=region, notas=notas)
    sesion.add(destino)
    await sesion.flush()
    return destino


async def editar_destino(
    sesion: AsyncSession, actor: Usuario, destino_id: uuid.UUID, cambios: dict[str, Any]
) -> Destino:
    """Aplica solo los campos enviados (CU-26, RF-090); un nombre nuevo no puede repetirse."""
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    destino = await obtener_destino(sesion, actor, destino_id)
    if "nombre" in cambios:
        await _exigir_nombre_libre(sesion, actor, cambios["nombre"], excluir_id=destino.id)
    for campo, valor in cambios.items():
        setattr(destino, campo, valor)
    await sesion.flush()
    return destino


async def dar_de_baja_destino(
    sesion: AsyncSession, actor: Usuario, destino_id: uuid.UUID
) -> Destino:
    """Baja lógica, aunque esté en uso; idempotente (CU-26, RF-091)."""
    return await _fijar_activo(sesion, actor, destino_id, activo=False)


async def reactivar_destino(sesion: AsyncSession, actor: Usuario, destino_id: uuid.UUID) -> Destino:
    """Vuelve a dejar activo un `Destino` de baja; idempotente (CU-26, RF-092)."""
    return await _fijar_activo(sesion, actor, destino_id, activo=True)


async def _fijar_activo(
    sesion: AsyncSession, actor: Usuario, destino_id: uuid.UUID, *, activo: bool
) -> Destino:
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    destino = await obtener_destino(sesion, actor, destino_id)
    if destino.activo is not activo:
        destino.activo = activo
        await sesion.flush()
    return destino


async def _exigir_nombre_libre(
    sesion: AsyncSession, actor: Usuario, nombre: str, *, excluir_id: uuid.UUID | None = None
) -> None:
    """409 si otro `Destino`, activo o no, ya tiene ese nombre (sin mirar el país)."""
    repetido = await _destinos.buscar_por_nombre(
        sesion, nombre, excluir_id=excluir_id, visibilidad=visibilidad(actor)
    )
    if repetido is not None:
        raise Conflicto(f"Ya existe un destino llamado «{repetido.nombre}».")
