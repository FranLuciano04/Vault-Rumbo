"""Servicio del módulo configuración (CU-13)."""

import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Destino, RolUsuario, TipoComision, Usuario
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios
from rumbo.negocio.politicas import exigir_rol, visibilidad

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


# Stubs de T-031 (catálogo de destinos): la lógica llega en el paso verde.
async def crear_destino(
    sesion: AsyncSession,
    actor: Usuario,
    *,
    nombre: str,
    pais: str,
    region: str | None = None,
    notas: str | None = None,
) -> Destino:
    raise NotImplementedError


async def editar_destino(
    sesion: AsyncSession, actor: Usuario, destino_id: uuid.UUID, cambios: dict[str, Any]
) -> Destino:
    raise NotImplementedError


async def dar_de_baja_destino(
    sesion: AsyncSession, actor: Usuario, destino_id: uuid.UUID
) -> Destino:
    raise NotImplementedError


async def reactivar_destino(sesion: AsyncSession, actor: Usuario, destino_id: uuid.UUID) -> Destino:
    raise NotImplementedError
