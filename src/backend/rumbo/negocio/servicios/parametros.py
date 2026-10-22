"""Lectura de los parámetros del negocio para los demás módulos (T-029, DEC-0013)."""

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Configuracion, RolUsuario, Usuario
from rumbo.negocio.politicas import exigir_rol


async def obtener(sesion: AsyncSession) -> Configuracion:
    """Devuelve la única fila de `configuracion`."""
    return await sesion.get_one(Configuracion, 1)


async def editar(
    sesion: AsyncSession,
    actor: Usuario,
    vigencia_cotizacion_meses: int,
    anticipacion_salida_dias: int,
    recontacto_meses: int,
) -> Configuracion:
    """Reemplaza los parámetros del negocio (solo admin y dueno)."""
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    configuracion = await obtener(sesion)
    configuracion.vigencia_cotizacion_meses = vigencia_cotizacion_meses
    configuracion.anticipacion_salida_dias = anticipacion_salida_dias
    configuracion.recontacto_meses = recontacto_meses
    await sesion.flush()
    return configuracion
