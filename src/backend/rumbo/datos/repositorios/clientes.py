"""Repositorio del módulo clientes: `Cliente` (CU-02, CU-03)."""

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Cliente
from rumbo.datos.modelos.base import nombre_normalizado
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad, normalizar

MAX_PARECIDOS = 10


class RepositorioClientes(RepositorioBase[Cliente]):
    modelo = Cliente

    async def buscar_parecidos(
        self, sesion: AsyncSession, *, nombre: str, contacto: str, visibilidad: Visibilidad
    ) -> list[Cliente]:
        """Hasta `MAX_PARECIDOS` clientes con el mismo contacto (sin distinguir mayúsculas) o el
        mismo nombre (sin distinguir mayúsculas, tildes ni espacios de más)."""
        consulta = select(Cliente).where(
            or_(
                func.lower(Cliente.contacto) == contacto.lower(),
                nombre_normalizado(Cliente.nombre) == normalizar(nombre),
            )
        )
        consulta = visibilidad.aplicar(consulta, Cliente)
        consulta = consulta.order_by(Cliente.created_at, Cliente.id).limit(MAX_PARECIDOS)
        return list(await sesion.scalars(consulta))
