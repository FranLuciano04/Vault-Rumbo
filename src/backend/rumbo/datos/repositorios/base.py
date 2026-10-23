"""Repositorio base: toda lectura pasa por el filtro de visibilidad que decide negocio (RF-151)."""

import uuid
from typing import Any, ClassVar, Protocol

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import NoEncontrado
from rumbo.datos.modelos.base import CON_TILDE, SIN_TILDE


def normalizar(texto: str) -> str:
    """Minúsculas, sin tildes y con los espacios colapsados; igual a `nombre_normalizado`."""
    return " ".join(texto.translate(str.maketrans(CON_TILDE, SIN_TILDE)).lower().split())


def escapar_like(texto: str) -> str:
    """Escapa los comodines de LIKE para que `buscar` los trate como texto literal."""
    return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class Visibilidad(Protocol):
    """Filtro por fila que arma `negocio.politicas.visibilidad(actor)`; datos no lo conoce."""

    def aplicar[S: Select[Any]](self, consulta: S, modelo: type) -> S: ...


class RepositorioBase[T]:
    """Sin estado: cada subclase fija `modelo` y recibe la sesión y la visibilidad por llamada."""

    modelo: ClassVar[type[Any]]

    async def obtener(self, sesion: AsyncSession, id: uuid.UUID, *, visibilidad: Visibilidad) -> T:
        """Fila por id; si no existe o el actor no la ve, `NoEncontrado` (404, nunca 403)."""
        consulta = visibilidad.aplicar(select(self.modelo).where(self.modelo.id == id), self.modelo)
        fila: T | None = await sesion.scalar(consulta)
        if fila is None:
            raise NoEncontrado(f"{self.modelo.__name__} {id} no encontrado")
        return fila

    async def listar(self, sesion: AsyncSession, *, visibilidad: Visibilidad) -> list[T]:
        """Todas las filas que el actor ve."""
        consulta = visibilidad.aplicar(select(self.modelo), self.modelo)
        return list(await sesion.scalars(consulta))
