"""Repositorio de los parámetros del negocio: `Configuracion` (T-029, DEC-0013)."""

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import NoEncontrado
from rumbo.datos.modelos import Configuracion


class RepositorioConfiguracion:
    async def obtener(self, sesion: AsyncSession) -> Configuracion:
        """La única fila (`id = 1`). La siembra la migración 0001; si falta, la base está mal
        migrada. No lleva filtro de visibilidad: es un parámetro global, no un dato de una fila
        ajena; el rol lo exige el servicio."""
        fila = await sesion.get(Configuracion, 1)
        if fila is None:
            raise NoEncontrado(
                "Faltan los parámetros del negocio: la migración 0001 no los sembró."
            )
        return fila
