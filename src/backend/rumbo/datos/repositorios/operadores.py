"""Repositorio del catálogo de operadores: `Operador` (CU-31, DEC-0009)."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Operador
from rumbo.datos.modelos.base import nombre_normalizado
from rumbo.datos.modelos.catalogos import INDICE_NOMBRE_OPERADOR
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad, escapar_like, normalizar


class RepositorioOperadores(RepositorioBase[Operador]):
    modelo = Operador
    etiqueta = "operador"
    indice = INDICE_NOMBRE_OPERADOR

    async def buscar_por_nombre(
        self,
        sesion: AsyncSession,
        nombre: str,
        *,
        excluir_id: uuid.UUID | None = None,
        visibilidad: Visibilidad,
    ) -> Operador | None:
        """Operador con el mismo nombre sin distinguir mayúsculas, tildes ni espacios de más,
        activo o no. `excluir_id` deja afuera al operador que se está editando."""
        consulta = select(Operador).where(nombre_normalizado(Operador.nombre) == normalizar(nombre))
        if excluir_id is not None:
            consulta = consulta.where(Operador.id != excluir_id)
        consulta = visibilidad.aplicar(consulta, Operador)
        return await sesion.scalar(consulta.limit(1))

    async def paginar(
        self,
        sesion: AsyncSession,
        *,
        activo: bool,
        buscar: str | None,
        desplazamiento: int,
        limite: int,
        visibilidad: Visibilidad,
    ) -> tuple[list[Operador], int]:
        """Página de operadores ordenada por nombre y el total que cumple los filtros.
        `buscar` mira el nombre sin distinguir mayúsculas, tildes ni espacios de más."""
        consulta = visibilidad.aplicar(select(Operador), Operador)
        consulta = consulta.where(Operador.activo == activo)
        if buscar:
            patron = f"%{escapar_like(normalizar(buscar))}%"
            consulta = consulta.where(nombre_normalizado(Operador.nombre).like(patron, escape="\\"))
        total = await sesion.scalar(select(func.count()).select_from(consulta.subquery()))
        pagina = consulta.order_by(nombre_normalizado(Operador.nombre), Operador.id)
        filas = await sesion.scalars(pagina.offset(desplazamiento).limit(limite))
        return list(filas), total or 0
