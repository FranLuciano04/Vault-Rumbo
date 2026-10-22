"""Lectura de los parámetros del negocio para los demás módulos (T-029, DEC-0013)."""

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Configuracion, Usuario


async def obtener(sesion: AsyncSession) -> Configuracion:
    """Devuelve la única fila de `configuracion`."""
    raise NotImplementedError


async def editar(
    sesion: AsyncSession,
    actor: Usuario,
    vigencia_cotizacion_meses: int,
    anticipacion_salida_dias: int,
    recontacto_meses: int,
) -> Configuracion:
    """Reemplaza los parámetros del negocio (solo admin y dueno)."""
    raise NotImplementedError
