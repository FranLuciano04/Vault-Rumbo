"""Repositorio del módulo clientes: `Cliente` (CU-02, CU-03)."""

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Cliente
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad


class RepositorioClientes(RepositorioBase[Cliente]):
    modelo = Cliente

    async def buscar_parecidos(
        self, sesion: AsyncSession, *, nombre: str, contacto: str, visibilidad: Visibilidad
    ) -> list[Cliente]:
        """Clientes con el mismo contacto o el mismo nombre, sin distinguir mayúsculas."""
        consulta = select(Cliente).where(
            or_(
                func.lower(Cliente.contacto) == contacto.lower(),
                func.lower(Cliente.nombre) == nombre.lower(),
            )
        )
        consulta = visibilidad.aplicar(consulta, Cliente).order_by(Cliente.created_at, Cliente.id)
        return list(await sesion.scalars(consulta))
