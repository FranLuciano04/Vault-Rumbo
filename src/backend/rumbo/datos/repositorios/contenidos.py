"""Repositorio del módulo redes: `ContenidoRed` (CU-19, RF-113 a RF-117)."""

import uuid
from datetime import date
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import NoEncontrado
from rumbo.datos.modelos import CanalContenido, ContenidoRed, EstadoKanban
from rumbo.datos.repositorios.base import RepositorioBase, Visibilidad


class RepositorioContenidos(RepositorioBase[ContenidoRed]):
    modelo = ContenidoRed

    async def obtener_para_modificar(
        self, sesion: AsyncSession, id: uuid.UUID, *, visibilidad: Visibilidad
    ) -> ContenidoRed:
        """Como `obtener`, pero bloqueada hasta el fin de la transacción y releída de la base,
        para que dos movimientos concurrentes de la tarjeta no se pisen."""
        consulta = visibilidad.aplicar(
            select(ContenidoRed).where(ContenidoRed.id == id), ContenidoRed
        )
        consulta = consulta.with_for_update().execution_options(populate_existing=True)
        pieza = await sesion.scalar(consulta)
        if pieza is None:
            raise NoEncontrado(f"ContenidoRed {id} no encontrado")
        return pieza

    async def paginar(
        self,
        sesion: AsyncSession,
        *,
        desde: date | None,
        hasta: date | None,
        estado_kanban: EstadoKanban | None,
        canal: CanalContenido | None,
        orden: Literal["asc", "desc"],
        desplazamiento: int,
        limite: int,
        visibilidad: Visibilidad,
    ) -> tuple[list[ContenidoRed], int]:
        """Página por fecha de publicación (`id` desempata, en el mismo sentido) y el total que
        cumple los filtros. Sin `estado_kanban` no trae las `descartado`."""
        filtros = [
            ContenidoRed.estado_kanban == estado_kanban
            if estado_kanban is not None
            else ContenidoRed.estado_kanban != EstadoKanban.descartado
        ]
        if desde is not None:
            filtros.append(ContenidoRed.fecha_publicacion >= desde)
        if hasta is not None:
            filtros.append(ContenidoRed.fecha_publicacion <= hasta)
        if canal is not None:
            filtros.append(ContenidoRed.canal == canal)
        consulta = visibilidad.aplicar(select(ContenidoRed).where(*filtros), ContenidoRed)
        total = await sesion.scalar(select(func.count()).select_from(consulta.subquery()))
        columnas = (ContenidoRed.fecha_publicacion, ContenidoRed.id)
        pagina = consulta.order_by(*(c.desc() if orden == "desc" else c.asc() for c in columnas))
        filas = await sesion.scalars(pagina.offset(desplazamiento).limit(limite))
        return list(filas), total or 0
