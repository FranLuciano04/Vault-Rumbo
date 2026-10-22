"""Lectura de los parámetros del negocio para los demás módulos (T-029, DEC-0013)."""

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Configuracion, RolUsuario, Usuario
from rumbo.datos.repositorios.configuracion import RepositorioConfiguracion
from rumbo.negocio.politicas import exigir_rol

_configuracion = RepositorioConfiguracion()


async def obtener(sesion: AsyncSession) -> Configuracion:
    """Devuelve la única fila de `configuracion`. Sin rol: es la lectura interna de los demás
    módulos; lo que sale por API pasa por `ver`."""
    return await _configuracion.obtener(sesion)


async def ver(sesion: AsyncSession, actor: Usuario) -> Configuracion:
    """Los parámetros del negocio para la API (solo admin y dueno)."""
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    return await obtener(sesion)


async def editar(
    sesion: AsyncSession,
    actor: Usuario,
    vigencia_cotizacion_meses: int,
    anticipacion_salida_dias: int,
    recontacto_meses: int,
) -> Configuracion:
    """Reemplaza los parámetros del negocio (solo admin y dueno)."""
    exigir_rol(actor, RolUsuario.admin, RolUsuario.dueno)
    configuracion = await _configuracion.obtener(sesion)
    configuracion.vigencia_cotizacion_meses = vigencia_cotizacion_meses
    configuracion.anticipacion_salida_dias = anticipacion_salida_dias
    configuracion.recontacto_meses = recontacto_meses
    await sesion.flush()
    return configuracion
