"""Servicio del módulo configuración (CU-13)."""

import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import RolUsuario, TipoComision, Usuario
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
